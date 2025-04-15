from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi import Query
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
        models.Project.project_id == project_id,
        models.Project.user_id == current_user.user_id
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

    # Read file for processing
    try:
        if file_extension.lower() == '.csv':
            df = pd.read_csv(file_path)
        elif file_extension.lower() == '.parquet':
            df = pd.read_parquet(file_path)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type")
    except Exception as e:
        file_path.unlink()  # Clean up saved file
        raise HTTPException(status_code=400, detail=f"Could not process file: {str(e)}")

    # Create file record
    db_file = models.File(
        filename=unique_filename,
        original_filename=file.filename,
        file_type=file_extension.lstrip('.'),
        project_id=project_id,
        columns=df.columns.tolist(),
        row_count=len(df)
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)

    # Insert each row into FileRow
    try:
        for idx, row in df.iterrows():
            db_row = models.FileRow(
                file_id=db_file.file_id,
                row_index=idx,
                row_data=row.to_dict()
            )
            db.add(db_row)
        
        db.commit()
    except Exception as e:
        db.rollback()
        file_path.unlink()  # Clean up saved file
        db.delete(db_file)  # Clean up file record
        db.commit()
        raise HTTPException(status_code=500, detail=f"Could not save file rows: {str(e)}")

    # Enqueue file processing task
    tasks.queue.enqueue(
        tasks.process_file,
        db_file.file_id,
        job_timeout="10m"
    )
    print("inserting db_file")
    print(db_file)
    return db_file

@router.get("/{file_id}/rows", response_model=List[schemas.FileRow])
async def get_file_rows(
    file_id: int,
    skip: int = Query(0, ge=0, description="Number of rows to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of rows to return"),
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

    # Query rows with pagination
    rows = db.query(models.FileRow).filter(
        models.FileRow.file_id == file_id
    ).order_by(models.FileRow.row_index).offset(skip).limit(limit).all()

    return rows


@router.get("/project/{project_id}", response_model=List[schemas.File])
async def list_files(
    project_id: int,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    # Check project exists and belongs to user
    project = db.query(models.Project).filter(
        models.Project.project_id == project_id,
        models.Project.user_id == current_user.user_id
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
        models.File.file_id == file_id,
        models.Project.user_id == current_user.user_id
    ).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    if not file.columns:
        raise HTTPException(status_code=400, detail="File columns not yet processed")

    return file.columns