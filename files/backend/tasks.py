from services.progress import progress_tracker
from tenacity import retry, stop_after_attempt, wait_exponential
import traceback
from typing import List, Optional, Dict, Any
import uuid
import logging # Added logging

from rq import Queue
from redis import Redis
from sqlalchemy.orm import Session
import pandas as pd
import numpy as np
from pathlib import Path
import os

from services.embeddings import get_embedding_model, EmbeddingModel
import numpy as np
from sklearn.decomposition import PCA
from umap import UMAP
from sklearn.cluster import KMeans

import cuml
import cuml.manifold.umap as cuml_umap
import cuml.decomposition.pca as cuml_pca
import cuml.cluster.kmeans as cuml_kmeans

import cupy as cp # Import cupy


import asyncio

import models, database, schemas # Added schemas

# Configure logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


redis_conn = Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=int(os.getenv("REDIS_PORT", 6379))
)
queue = Queue("embeddings", connection=redis_conn)

def get_db_session() -> Session: # Renamed for clarity
    """Get database session for tasks"""
    return database.SessionLocal()

def process_file(file_id: int):
    """Process uploaded file to extract columns and basic metadata"""
    db = get_db_session()
    try:
        file = db.query(models.File).get(file_id)
        if not file:
            logger.warning(f"File {file_id} not found for processing.")
            return

        # Get all rows for this file
        file_rows = db.query(models.FileRow).filter(
            models.FileRow.file_id == file_id
        ).order_by(models.FileRow.row_index).all()

        if not file_rows:
            logger.warning(f"No rows found for file {file_id}.")
            # Update file columns to indicate no data? Or keep as null?
            # file.columns = {"error": "No rows found"}
            # db.commit()
            return

        # Convert row data to DataFrame
        rows_data = [row.row_data for row in file_rows]
        df = pd.DataFrame(rows_data)

        # Extract column information
        columns_info = {
            "names": df.columns.tolist(),
            "types": df.dtypes.astype(str).to_dict(),
            "sample_size": len(df),
            "numeric_columns": df.select_dtypes(include=[np.number]).columns.tolist(),
            "text_columns": df.select_dtypes(include=['object', 'string']).columns.tolist() # Added 'string'
        }

        file.columns = columns_info
        db.commit()
        logger.info(f"Successfully processed columns for file {file_id}")

    except Exception as e:
        logger.error(f"Error processing file {file_id}: {e}", exc_info=True)
        if file:
            file.columns = {"error": str(e)}
            db.commit()
        raise
    finally:
        db.close()


class EmbeddingError(Exception):
    """Custom exception for embedding generation errors"""
    pass

# Increased batch size for potentially better performance with embedding APIs
# Reduced retry attempts to fail faster if there's a persistent issue
@retry(
    stop=stop_after_attempt(2),
    wait=wait_exponential(multiplier=1, min=2, max=10)
)
async def _generate_embeddings_batch_async(
    texts: List[str],
    model: EmbeddingModel,
    batch_size: int = 256 # Increased batch size
) -> np.ndarray:
    """Generate embeddings for a batch of texts with retry logic (async)"""
    embeddings_list = []
    logger.info(f"Generating embeddings for {len(texts)} texts in batches of {batch_size}")
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        try:
            logger.debug(f"Processing batch starting at index {i}")
            batch_embeddings = await model.generate(batch)
            embeddings_list.append(batch_embeddings)
            logger.debug(f"Completed batch starting at index {i}")
            # Simple progress update within batching
            progress_percent = min(99, int(((i + len(batch)) / len(texts)) * 100))
            # TODO: Find a way to update progress tracker from here if needed,
            # potentially passing the job_id down or using a shared context.
        except Exception as e:
            logger.error(f"Failed embedding batch starting at index {i}: {e}", exc_info=True)
            # Decide: fail entire job or skip batch? Raising EmbeddingError fails the job.
            raise EmbeddingError(f"Failed to generate embeddings for batch starting at index {i}: {str(e)}")

    if not embeddings_list:
         raise EmbeddingError("No embeddings were generated.")

    return np.vstack(embeddings_list)

# Main task function, now takes job_id
async def generate_embeddings_and_visualizations(job_id: str, file_id: int, column: str, model_name: str):
    """
    Generate embeddings for each row, then visualizations for the set.
    Uses job_id for progress tracking.
    """
    db = get_db_session()
    progress_tracker.set_progress(job_id, {
        "job_id": job_id,
        "file_id": file_id,
        "model_name": model_name,
        "status": "starting",
        "progress": 0,
        "current_step": "initialization",
        "error": None
    })

    file_rows = [] # Keep track of rows to link embeddings/visualizations
    all_embeddings_data = [] # To store created embedding records
    try:
        # --- Phase 1: Generate Embeddings for each row ---
        logger.info(f"[Job {job_id}] Starting embedding generation for file {file_id}")
        progress_tracker.update_progress(
            job_id,
            status="processing",
            current_step="loading_data",
            progress=5
        )

        # Fetch file and rows
        file = db.query(models.File).get(file_id)
        if not file:
            raise ValueError(f"File {file_id} not found.")

        file_rows = db.query(models.FileRow).filter(
            models.FileRow.file_id == file.file_id
        ).order_by(models.FileRow.row_index).all()

        if not file_rows:
            raise ValueError(f"No rows found for file {file_id}.")

        # Check columns exist
        available_columns = set(file.columns.get("names", []))
        invalid_columns = set([column]) - available_columns
        if invalid_columns:
            raise ValueError(f"Invalid columns requested: {', '.join(invalid_columns)}")

        # Convert row data to DataFrame (efficient text preparation)
        rows_data = [row.row_data for row in file_rows]
        df = pd.DataFrame(rows_data, index=[r.row_id for r in file_rows]) # Use row_id as index

        # Prepare text for all rows
        progress_tracker.update_progress(
            job_id,
            current_step="preparing_text",
            progress=10
        )
        texts = df[[column]].astype(str).agg(" ".join, axis=1).tolist()

        # Generate embeddings for all texts
        progress_tracker.update_progress(
            job_id,
            current_step="generating_embeddings",
            progress=15 # Starting embedding generation
        )
        model = get_embedding_model(model_name) # Instantiate model
        # Run async embedding generation
        raw_embeddings = await _generate_embeddings_batch_async(texts, model)

        if raw_embeddings is None or len(raw_embeddings) != len(file_rows):
            raise EmbeddingError("Mismatch between number of embeddings generated and number of rows.")

        vector_dimension = raw_embeddings.shape[1]

        # Create Embedding records for each row
        progress_tracker.update_progress(
            job_id,
            current_step="storing_embeddings",
            progress=40
        )
        logger.info(f"[Job {job_id}] Storing {len(raw_embeddings)} embeddings.")
        created_embedding_ids = []
        for i, file_row in enumerate(file_rows):
            embedding_record = models.Embedding(
                file_id=file_id,
                row_id=file_row.row_id,
                model_name=model_name,
                status="complete", # Mark embedding as complete for this row
                vector_dimension=vector_dimension,
                vector=raw_embeddings[i].tolist() # Store individual vector
            )
            db.add(embedding_record)
            all_embeddings_data.append(embedding_record) # Keep reference

        db.flush() # Assign IDs before commit might be needed if referenced immediately
        created_embedding_ids = [e.embedding_id for e in all_embeddings_data]
        db.commit() # Commit all embeddings at once
        logger.info(f"[Job {job_id}] Stored {len(created_embedding_ids)} embeddings successfully.")


        # --- Phase 2: Generate Visualizations ---
        logger.info(f"[Job {job_id}] Starting visualization generation.")
        progress_tracker.update_progress(
            job_id,
            current_step="generating_visualizations",
            progress=60
        )

        # Fetch the embeddings we just created (or use `all_embeddings_data` if refreshed)
        # Ensure order matches file_rows if fetching again
        embeddings_for_vis = db.query(models.Embedding).filter(
            models.Embedding.embedding_id.in_(created_embedding_ids)
        ).order_by(models.Embedding.row_id).all() # Order by row_id to match file_rows

        # Re-extract vectors in the correct order
        ordered_vectors = np.array([emb.vector for emb in embeddings_for_vis])

        # Perform Clustering (optional, example with KMeans)
        # n_clusters = min(8, len(ordered_vectors)) # Example: Max 8 clusters
        # clusters = None
        # if len(ordered_vectors) > n_clusters: # Avoid clustering if too few points
        #     try:
        #         kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10) # Specify n_init
        #         clusters = kmeans.fit_predict(ordered_vectors).tolist()
        #         logger.info(f"[Job {job_id}] Generated clusters.")
        #     except Exception as cluster_err:
        #         logger.warning(f"[Job {job_id}] Clustering failed: {cluster_err}")
        #         clusters = [None] * len(ordered_vectors) # Assign null if clustering fails
        # else:
        #     clusters = [0] * len(ordered_vectors) # Assign single cluster if too few points

        # Determine number of clusters - this logic remains the same
        n_clusters = min(8, len(ordered_vectors)) # Example: Max 8 clusters
        clusters = None

        gpu_ordered_vectors = None
        try:
            gpu_ordered_vectors = cp.asarray(ordered_vectors)
            logger.info(f"[Job {job_id}] Converted ordered_vectors to CuPy array.")
        except Exception as e:
            logger.error(f"[Job {job_id}] Failed to convert ordered_vectors to CuPy array: {e}")
            # Decide how to handle this critical failure - maybe raise or return?
            # For now, we'll just log and subsequent steps will likely fail.
            raise # Re-raise the exception as we can't proceed without GPU data


        # Avoid clustering if too few points
        if len(ordered_vectors) > n_clusters:
            progress_tracker.update_progress(job_id, current_step="generating_clusters_gpu", progress=60)
            try:
                # Use cuml.cluster.KMeans
                # Note: cuml's KMeans also supports random_state and n_init
                cuml_kmeans_model = cuml_kmeans.KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
                # Fit and predict on the GPU data, then transfer results back to CPU and convert to list
                # Assuming gpu_ordered_vectors was created earlier from ordered_vectors
                clusters = cuml_kmeans_model.fit_predict(gpu_ordered_vectors).get().tolist()
                logger.info(f"[Job {job_id}] Generated clusters (GPU).")
            except Exception as cluster_err:
                logger.warning(f"[Job {job_id}] Clustering (GPU) failed: {cluster_err}")
                # Decide how to handle failure - assigning None or a single cluster?
                # Original code assigns None for each. Let's keep that behavior.
                clusters = [-1] * len(ordered_vectors) # Assign null if clustering fails
        else:
            # Assign single cluster if too few points - this logic remains the same
            clusters = [0] * len(ordered_vectors)

        # Generate UMAP 2D
        progress_tracker.update_progress(job_id, current_step="generating_umap_2d", progress=70)

        # Generate UMAP 2D using cuML
        progress_tracker.update_progress(job_id, current_step="generating_umap_2d_gpu", progress=70)
        umap_2d_coords = None
        try:
            # Use cuml.manifold.UMAP
            cuml_umap_2d = cuml_umap.UMAP(n_components=2, random_state=42)
            # Fit and transform on the GPU data, then transfer results back to CPU and convert to list
            umap_2d_coords = cuml_umap_2d.fit_transform(gpu_ordered_vectors).get().tolist()
            logger.info(f"[Job {job_id}] Generated UMAP 2D coordinates (GPU).")
        except Exception as umap_err:
            logger.warning(f"[Job {job_id}] UMAP 2D (GPU) failed: {umap_err}")
            # Handle failure? Maybe skip this visualization?

        # Generate UMAP 3D using cuML
        progress_tracker.update_progress(job_id, current_step="generating_umap_3d_gpu", progress=80)
        umap_3d_coords = None
        try:
            # Use cuml.manifold.UMAP
            cuml_umap_3d = cuml_umap.UMAP(n_components=3, random_state=42)
            # Fit and transform on the GPU data, then transfer results back to CPU and convert to list
            umap_3d_coords = cuml_umap_3d.fit_transform(gpu_ordered_vectors).get().tolist()
            logger.info(f"[Job {job_id}] Generated UMAP 3D coordinates (GPU).")
        except Exception as umap_err:
            logger.warning(f"[Job {job_id}] UMAP 3D (GPU) failed: {umap_err}")

        # Generate PCA 2D using cuML
        progress_tracker.update_progress(job_id, current_step="generating_pca_2d_gpu", progress=90)
        pca_2d_coords = None
        try:
            # Use cuml.decomposition.PCA
            cuml_pca_2d = cuml_pca.PCA(n_components=2)
            # Fit and transform on the GPU data, then transfer results back to CPU and convert to list
            pca_2d_coords = cuml_pca_2d.fit_transform(gpu_ordered_vectors).get().tolist()
            logger.info(f"[Job {job_id}] Generated PCA 2D coordinates (GPU).")
        except Exception as pca_err:
            logger.warning(f"[Job {job_id}] PCA 2D (GPU) failed: {pca_err}")

        # Note: gpu_ordered_vectors is automatically garbage collected by Python/CuPy when no longer referenced

        # --- End of Cuml Conversion ---

        # Create Visualization records for each row and each method (This part remains the same)
        logger.info(f"[Job {job_id}] Storing visualization records.")
        visualizations_to_add = []
        for i, embedding_record in enumerate(embeddings_for_vis):
            # Assuming 'clusters' is a list or array corresponding to the rows in ordered_vectors
            row_cluster = clusters[i] if clusters is not None and i < len(clusters) else None
            # UMAP 2D Visualization Record
            if umap_2d_coords:
                # Check if index i is within bounds
                if i < len(umap_2d_coords):
                    vis_umap_2d = models.Visualization(
                        file_id=file_id,
                        embedding_id=embedding_record.embedding_id,
                        row_id=embedding_record.row_id,
                        method="umap",
                        dimensions=2,
                        coordinates=umap_2d_coords[i], # Store coordinate for this row
                        clusters=row_cluster # Store cluster label for this row
                    )
                    visualizations_to_add.append(vis_umap_2d)
                else:
                    logger.warning(f"[Job {job_id}] UMAP 2D coords index out of bounds for row {i}.")


            # UMAP 3D Visualization Record
            if umap_3d_coords:
                # Check if index i is within bounds
                if i < len(umap_3d_coords):
                    vis_umap_3d = models.Visualization(
                        file_id=file_id,
                        embedding_id=embedding_record.embedding_id,
                        row_id=embedding_record.row_id,
                        method="umap",
                        dimensions=3,
                        coordinates=umap_3d_coords[i],
                        clusters=row_cluster
                    )
                    visualizations_to_add.append(vis_umap_3d)
                else:
                    logger.warning(f"[Job {job_id}] UMAP 3D coords index out of bounds for row {i}.")


            # PCA 2D Visualization Record
            if pca_2d_coords:
                # Check if index i is within bounds
                if i < len(pca_2d_coords):
                    vis_pca_2d = models.Visualization(
                        file_id=file_id,
                        embedding_id=embedding_record.embedding_id,
                        row_id=embedding_record.row_id,
                        method="pca",
                        dimensions=2,
                        coordinates=pca_2d_coords[i],
                        clusters=row_cluster
                    )
                    visualizations_to_add.append(vis_pca_2d)
                else:
                    logger.warning(f"[Job {job_id}] PCA 2D coords index out of bounds for row {i}.")

        if visualizations_to_add:
            db.add_all(visualizations_to_add)
            db.commit()
            logger.info(f"[Job {job_id}] Stored {len(visualizations_to_add)} visualization points.")
        else:
            logger.warning(f"[Job {job_id}] No visualization points were generated or stored.") 

        # umap_2d_coords = None
        # try:
        #     umap_2d = UMAP(n_components=2, random_state=42)
        #     umap_2d_coords = umap_2d.fit_transform(ordered_vectors).tolist()
        #     logger.info(f"[Job {job_id}] Generated UMAP 2D coordinates.")
        # except Exception as umap_err:
        #     logger.warning(f"[Job {job_id}] UMAP 2D failed: {umap_err}")
        #     # Handle failure? Maybe skip this visualization?

        # # Generate UMAP 3D
        # progress_tracker.update_progress(job_id, current_step="generating_umap_3d", progress=80)
        # umap_3d_coords = None
        # try:
        #     umap_3d = UMAP(n_components=3, random_state=42)
        #     umap_3d_coords = umap_3d.fit_transform(ordered_vectors).tolist()
        #     logger.info(f"[Job {job_id}] Generated UMAP 3D coordinates.")
        # except Exception as umap_err:
        #     logger.warning(f"[Job {job_id}] UMAP 3D failed: {umap_err}")

        # # Generate PCA 2D
        # progress_tracker.update_progress(job_id, current_step="generating_pca_2d", progress=90)
        # pca_2d_coords = None
        # try:
        #     pca_2d = PCA(n_components=2)
        #     pca_2d_coords = pca_2d.fit_transform(ordered_vectors).tolist()
        #     logger.info(f"[Job {job_id}] Generated PCA 2D coordinates.")
        # except Exception as pca_err:
        #      logger.warning(f"[Job {job_id}] PCA 2D failed: {pca_err}")


        # # Create Visualization records for each row and each method
        # logger.info(f"[Job {job_id}] Storing visualization records.")
        # visualizations_to_add = []
        # for i, embedding_record in enumerate(embeddings_for_vis):
        #     row_cluster = clusters[i] if clusters else None

        #     # UMAP 2D Visualization Record
        #     if umap_2d_coords:
        #         vis_umap_2d = models.Visualization(
        #             file_id=file_id,
        #             embedding_id=embedding_record.embedding_id,
        #             row_id=embedding_record.row_id,
        #             method="umap",
        #             dimensions=2,
        #             coordinates=umap_2d_coords[i], # Store coordinate for this row
        #             clusters=row_cluster # Store cluster label for this row (using plural column name)
        #         )
        #         visualizations_to_add.append(vis_umap_2d)

        #     # UMAP 3D Visualization Record
        #     if umap_3d_coords:
        #         vis_umap_3d = models.Visualization(
        #             file_id=file_id,
        #             embedding_id=embedding_record.embedding_id,
        #             row_id=embedding_record.row_id,
        #             method="umap",
        #             dimensions=3,
        #             coordinates=umap_3d_coords[i],
        #             clusters=row_cluster
        #         )
        #         visualizations_to_add.append(vis_umap_3d)

        #     # PCA 2D Visualization Record
        #     if pca_2d_coords:
        #         vis_pca_2d = models.Visualization(
        #             file_id=file_id,
        #             embedding_id=embedding_record.embedding_id,
        #             row_id=embedding_record.row_id,
        #             method="pca",
        #             dimensions=2,
        #             coordinates=pca_2d_coords[i],
        #             clusters=row_cluster
        #         )
        #         visualizations_to_add.append(vis_pca_2d)

        # if visualizations_to_add:
        #     db.add_all(visualizations_to_add)
        #     db.commit()
        #     logger.info(f"[Job {job_id}] Stored {len(visualizations_to_add)} visualization points.")
        # else:
        #     logger.warning(f"[Job {job_id}] No visualization points were generated or stored.")


        # --- Finalize ---
        progress_tracker.update_progress(
            job_id,
            status="complete",
            current_step="finished",
            progress=100
        )
        logger.info(f"[Job {job_id}] Successfully completed.")

    except Exception as e:
        logger.error(f"[Job {job_id}] Failed: {e}", exc_info=True)
        error_details = {
            "error": str(e),
            "traceback": traceback.format_exc()
        }
        progress_tracker.update_progress(
            job_id,
            status="failed",
            error=error_details,
            progress=100 # Indicate task finished (even if failed)
        )
        # Optionally: Rollback changes or mark related records as failed?
        # The individual embeddings are marked complete, maybe add a job status field?
        # For now, rely on the progress tracker status.
        db.rollback() # Rollback any partial commits in visualization phase
        raise # Re-raise exception for RQ worker to mark job as failed
    finally:
        db.close()


# Wrapper function to run the async task from synchronous RQ worker
def run_generate_embeddings_task(job_id: str, file_id: int, column: str, model_name: str):
    """Synchronous wrapper for the async embedding/visualization task."""
    logger.info(f"RQ Worker received job: {job_id}")
    try:
        asyncio.run(generate_embeddings_and_visualizations(job_id, file_id, column, model_name))
    except Exception as e:
         logger.error(f"Async task execution failed for job {job_id}: {e}", exc_info=True)
         # Exception is already logged and progress updated inside the async func.
         # RQ will mark the job as failed because the exception propagates.