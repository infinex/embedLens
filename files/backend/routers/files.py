from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import pandas as pd
import uuid
import os
from pathlib import Path

import models, schemas, database, auth, tasks

router = APIRouter()

UPLOAD_DIR = Path("uploads")
ALLOWED_EXTENSIONS = {".csv", ".parquet"}

# Create upload directory if it doesn't exist
UPLOAD_DIR.mkdir(exist_ok=True)

def validate_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS

@router.post("/upload/{project_id}", response_model=schemas.File)
async def upload_file(
    project_id: int,
    file: UploadFile = File(...),
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    # Check project exists and belongs to user
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not validate_file(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Must be one of: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Generate unique filename
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / unique_filename

    # Save file
    try:
        with file_path.open("wb") as buffer:
            content = await file.read()
            buffer.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")

    # Create file record
    db_file = models.File(
        filename=unique_filename,
        original_filename=file.filename,
        file_type=file_extension.lstrip('.'),
        project_id=project_id
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)

    # Enqueue file processing task
    tasks.queue.enqueue(
        tasks.process_file,
        db_file.id,
        job_timeout="10m"
    )

    return db_file

@router.get("/project/{project_id}", response_model=List[schemas.File])
async def list_files(
    project_id: int,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    # Check project exists and belongs to user
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return db.query(models.File).filter(models.File.project_id == project_id).all()

@router.get("/{file_id}/columns")
async def get_file_columns(
    file_id: int,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    file = db.query(models.File).join(models.Project).filter(
        models.File.id == file_id,
        models.Project.user_id == current_user.id
    ).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    if not file.columns:
        raise HTTPException(status_code=400, detail="File columns not yet processed")

    return file.columns