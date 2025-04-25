from services.progress import progress_tracker
from fastapi import APIRouter, Depends, HTTPException, status # Added status
from sqlalchemy.orm import Session
from typing import List, Dict, Any # Added Dict, Any
import uuid # Added uuid
import logging # Added logging

import models, schemas, database, auth, tasks

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/{file_id}/generate", status_code=status.HTTP_202_ACCEPTED) # Changed status code
async def trigger_embedding_generation( # Renamed function
    file_id: int,
    column: str, # Changed to Depends for potential body usage later if needed
    model_name: str = "openai-text-embedding-ada-002", # Default model
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
) -> Dict[str, str]: # Return Job ID
    """
    Triggers the asynchronous generation of embeddings and subsequent visualizations
    for the specified file and columns.
    """
    logger.info(f"Received request to generate embeddings for file {file_id} using model {model_name}")
    # Check file exists and belongs to user
    file = db.query(models.File).join(models.Project).filter(
        models.File.file_id == file_id,
        models.Project.user_id == current_user.user_id
    ).first()
    if not file:
        logger.warning(f"File {file_id} not found for user {current_user.user_id}")
        raise HTTPException(status_code=404, detail="File not found")

    # Validate columns exist in file metadata (if processed)
    if not file.columns or not isinstance(file.columns, dict) or "names" not in file.columns:
         logger.warning(f"File {file_id} columns not yet processed or invalid format.")
         # Decide: Allow job anyway, or raise error? Let's allow, task will re-check.
         # raise HTTPException(status_code=400, detail="File columns not yet processed or invalid")
         pass # Allow task to proceed and potentially fail if columns are truly missing


    if file.columns and isinstance(file.columns, dict): # Check again after pass
        available_columns = set(file.columns.get("names", []))
        invalid_columns = set([column]) - available_columns
        if invalid_columns:
            logger.error(f"Invalid columns requested for file {file_id}: {invalid_columns}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid columns: {', '.join(invalid_columns)}. Available: {', '.join(available_columns)}"
            )

    # Generate a unique job ID
    job_id = str(uuid.uuid4())
    logger.info(f"Generated job ID {job_id} for file {file_id}")

    # Initialize progress tracking
    progress_tracker.set_progress(job_id, {
        "job_id": job_id,
        "file_id": file_id,
        "model_name": model_name,
        "status": "queued",
        "progress": 0,
        "current_step": "queued",
        "error": None
    })

    # Enqueue the task wrapper
    try:
        tasks.queue.enqueue(
            # Use the synchronous wrapper function for RQ
            tasks.run_generate_embeddings_task,
            job_id,
            file_id,
            column,
            model_name,
            job_id=job_id, # Pass job_id to RQ for identification
            job_timeout="2h" # Increased timeout
        )
        logger.info(f"Enqueued job {job_id} for file {file_id}")
    except Exception as e:
        logger.error(f"Failed to enqueue job {job_id}: {e}", exc_info=True)
        progress_tracker.update_progress(job_id, status="failed", error={"error": "Failed to enqueue task"})
        raise HTTPException(status_code=500, detail="Failed to enqueue embedding generation task")

    # Return the job ID for tracking
    return {"job_id": job_id}


# Removed get_embedding_status endpoint as embedding_id is now row-level
# Kept progress endpoint but now uses job_id

@router.get("/jobs/{job_id}/progress") # Changed path parameter
async def get_job_progress( # Renamed function
    job_id: str,
    current_user: schemas.User = Depends(auth.get_current_user),
    # db: Session = Depends(database.get_db) # DB session might not be needed just for Redis progress
):
    """
    Get the progress status for an embedding/visualization generation job.
    Requires authentication to ensure user has context, though job_id is the primary key here.
    """
    logger.debug(f"Request received for progress of job {job_id} by user {current_user.user_id}")
    # TODO: Optional: Verify user has access to the file associated with job_id
    # This would require storing file_id/user_id alongside progress or looking it up.
    # For simplicity, we assume knowing the job_id implies access for now.

    progress = progress_tracker.get_progress(job_id)

    if not progress:
        logger.warning(f"Progress not found for job {job_id}")
        # Check if the job failed in RQ itself (might not have progress entry)
        try:
            job = tasks.queue.fetch_job(job_id)
            if job and job.is_failed:
                 logger.warning(f"RQ job {job_id} exists but failed.")
                 return {
                    "job_id": job_id,
                    "status": "failed",
                    "progress": 100,
                    "current_step": "failed in queue",
                    "error": {"error": "Job failed during execution", "details": job.exc_info}
                 }
            elif job and not job.is_finished and not job.is_failed and not job.is_queued and not job.is_started:
                 logger.warning(f"RQ job {job_id} in unknown state: {job.get_status()}")
                 # Fall through to 404 for simplicity, or return specific state
        except Exception as e:
             logger.error(f"Error fetching job {job_id} from RQ: {e}", exc_info=True)
             # Fall through to 404

        raise HTTPException(status_code=404, detail="Job progress not found or job does not exist")

    logger.debug(f"Returning progress for job {job_id}: {progress}")
    return progress