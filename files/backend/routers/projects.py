from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas, database, auth

router = APIRouter()

@router.get("/", response_model=List[schemas.Project])
async def list_projects(
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    return db.query(models.Project).filter(models.Project.user_id == current_user.id).all()

@router.post("/", response_model=schemas.Project)
async def create_project(
    project: schemas.ProjectCreate,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    db_project = models.Project(**project.dict(), user_id=current_user.id)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

@router.get("/{project_id}", response_model=schemas.Project)
async def get_project(
    project_id: int,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.user_id == current_user.id
    ).first()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.user_id == current_user.id
    ).first()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
    return {"detail": "Project deleted"}