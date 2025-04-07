from services.progress import progress_tracker
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

import models, schemas, database, auth, tasks

router = APIRouter()

@router.post("/{file_id}/generate", response_model=schemas.Embedding)
async def generate_embeddings(
    file_id: int,
    columns: List[str],
    model_name: str = "openai-text-embedding-ada-002",
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    # Check file exists and belongs to user
    file = db.query(models.File).join(models.Project).filter(
        models.File.file_id == file_id,
        models.Project.user_id == current_user.user_id
    ).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    # Validate columns exist in file
    if not file.columns:
        raise HTTPException(status_code=400, detail="File columns not yet processed")
    
    available_columns = set(file.columns.get("names", []))
    invalid_columns = set(columns) - available_columns
    if invalid_columns:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid columns: {', '.join(invalid_columns)}"
        )

    # Create embedding record
    embedding = models.Embedding(
        file_id=file_id,
        model_name=model_name,
        status="pending",
        vector_dimension=0  # Will be updated during processing
    )
    db.add(embedding)
    db.commit()
    db.refresh(embedding)

    # Enqueue embedding generation task
    tasks.queue.enqueue(
        tasks.generate_embeddings,
        embedding.embedding_id,
        columns,
        model_name,
        job_timeout="1h"
    )

    return embedding

@router.get("/{embedding_id}/status", response_model=schemas.Embedding)
async def get_embedding_status(
    embedding_id: int,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    embedding = db.query(models.Embedding).join(models.File).join(models.Project).filter(
        models.Embedding.embedding_id == embedding_id,
        models.Project.user_id == current_user.user_id
    ).first()
    if not embedding:
        raise HTTPException(status_code=404, detail="Embedding not found")

    return embedding

@router.get("/{embedding_id}/progress")
async def get_embedding_progress(
    embedding_id: int,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    # Verify user has access to this embedding
    embedding = db.query(models.Embedding).join(models.File).join(models.Project).filter(
        models.Embedding.embedding_id == embedding_id,
        models.Project.user_id == current_user.user_id
    ).first()
    
    if not embedding:
        raise HTTPException(status_code=404, detail="Embedding not found")

    progress = progress_tracker.get_progress(str(embedding_id))
    if not progress:
        return {
            "status": embedding.status,
            "progress": 0 if embedding.status == "pending" else 100
        }
    
    return progress