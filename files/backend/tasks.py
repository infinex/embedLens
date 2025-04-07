from services.progress import progress_tracker
from tenacity import retry, stop_after_attempt, wait_exponential
import traceback
from typing import List, Optional

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
import asyncio

import models, database

redis_conn = Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=int(os.getenv("REDIS_PORT", 6379))
)
queue = Queue("embeddings", connection=redis_conn)

def get_db():
    """Get database session for tasks"""
    db = database.SessionLocal()
    try:
        return db
    finally:
        db.close()

def process_file(file_id: int):
    """Process uploaded file to extract columns and basic metadata"""
    db = get_db()
    file = db.query(models.File).get(file_id)
    if not file:
        return

    try:
        file_path = Path("uploads") / file.filename
        
        if file.file_type == "csv":
            df = pd.read_csv(file_path)
        elif file.file_type == "parquet":
            df = pd.read_parquet(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file.file_type}")

        # Extract column information
        columns = {
            "names": df.columns.tolist(),
            "types": df.dtypes.astype(str).to_dict(),
            "sample_size": len(df),
            "numeric_columns": df.select_dtypes(include=[np.number]).columns.tolist(),
            "text_columns": df.select_dtypes(include=['object']).columns.tolist()
        }

        file.columns = columns
        db.commit()

    except Exception as e:
        file.columns = {"error": str(e)}
        db.commit()
        raise

class EmbeddingError(Exception):
    """Custom exception for embedding generation errors"""
    pass

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10)
)
async def _generate_embeddings_batch(
    texts: List[str],
    model: EmbeddingModel,
    batch_size: int = 100
) -> np.ndarray:
    """Generate embeddings for a batch of texts with retry logic"""
    embeddings_list = []
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        try:
            batch_embeddings = await model.generate(batch)
            embeddings_list.append(batch_embeddings)
        except Exception as e:
            raise EmbeddingError(f"Failed to generate embeddings for batch {i}: {str(e)}")
    
    return np.vstack(embeddings_list)

async def generate_embeddings(embedding_id: int, columns: List[str], model_name: str):
    """Generate embeddings with progress tracking and error handling"""
    db = get_db()
    embedding = db.query(models.Embedding).get(embedding_id)
    if not embedding:
        return

    progress_tracker.set_progress(str(embedding_id), {
        "status": "starting",
        "progress": 0,
        "current_step": "initialization",
        "error": None
    })

    try:
        embedding.status = "processing"
        db.commit()

        # Load data
        progress_tracker.update_progress(
            str(embedding_id),
            status="processing",
            current_step="loading_data",
            progress=10
        )

        file = embedding.file
        file_path = Path("uploads") / file.filename

        if file.file_type == "csv":
            df = pd.read_csv(file_path)
        else:
            df = pd.read_parquet(file_path)

        # Prepare text
        progress_tracker.update_progress(
            str(embedding_id),
            current_step="preparing_text",
            progress=20
        )

        texts = df[columns].astype(str).agg(" ".join, axis=1).tolist()
        
        # Generate embeddings
        progress_tracker.update_progress(
            str(embedding_id),
            current_step="generating_embeddings",
            progress=30
        )

        model = get_embedding_model(model_name)
        embeddings = await _generate_embeddings_batch(texts, model)
        
        # Store embeddings
        progress_tracker.update_progress(
            str(embedding_id),
            current_step="storing_embeddings",
            progress=60
        )

        embedding.embedding_vectors = embeddings.tolist()
        embedding.vector_dimension = embeddings.shape[1]
        
        # Generate visualizations
        progress_tracker.update_progress(
            str(embedding_id),
            current_step="generating_visualizations",
            progress=70
        )

        visualizations = []
        
        # UMAP 2D
        umap_2d = UMAP(n_components=2, random_state=42)
        coords_2d = umap_2d.fit_transform(embeddings)
        
        # Clustering
        kmeans = KMeans(n_clusters=min(8, len(texts)), random_state=42)
        clusters = kmeans.fit_predict(embeddings)
        
        vis_2d = models.Visualization(
            embedding_id=embedding.embedding_id,
            method="umap",
            dimensions=2,
            coordinates=coords_2d.tolist(),
            clusters=clusters.tolist()
        )
        visualizations.append(vis_2d)
        
        progress_tracker.update_progress(
            str(embedding_id),
            current_step="generating_3d_visualization",
            progress=80
        )

        # UMAP 3D
        umap_3d = UMAP(n_components=3, random_state=42)
        coords_3d = umap_3d.fit_transform(embeddings)
        
        vis_3d = models.Visualization(
            embedding_id=embedding.embedding_id,
            method="umap",
            dimensions=3,
            coordinates=coords_3d.tolist(),
            clusters=clusters.tolist()
        )
        visualizations.append(vis_3d)
        
        progress_tracker.update_progress(
            str(embedding_id),
            current_step="generating_pca",
            progress=90
        )

        # PCA visualizations
        pca_2d = PCA(n_components=2)
        pca_coords_2d = pca_2d.fit_transform(embeddings)
        
        vis_pca_2d = models.Visualization(
            embedding_id=embedding.embedding_id,
            method="pca",
            dimensions=2,
            coordinates=pca_coords_2d.tolist(),
            clusters=clusters.tolist()
        )
        visualizations.append(vis_pca_2d)
        
        db.add_all(visualizations)
        embedding.status = "complete"
        db.commit()

        progress_tracker.update_progress(
            str(embedding_id),
            status="complete",
            current_step="finished",
            progress=100
        )

    except Exception as e:
        error_details = {
            "error": str(e),
            "traceback": traceback.format_exc()
        }
        
        embedding.status = "failed"
        db.commit()
        
        progress_tracker.update_progress(
            str(embedding_id),
            status="failed",
            error=error_details
        )
        
        raise