from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr

class User(UserBase):
    id: int
    external_id: str
    created_at: datetime

    class Config:
        orm_mode = True

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class Project(ProjectBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        orm_mode = True

class FileBase(BaseModel):
    filename: str
    file_type: str

class FileCreate(FileBase):
    project_id: int

class File(FileBase):
    id: int
    original_filename: str
    project_id: int
    columns: Optional[Dict[str, Any]]
    created_at: datetime

    class Config:
        orm_mode = True

class EmbeddingBase(BaseModel):
    model_name: str
    vector_dimension: int

class EmbeddingCreate(EmbeddingBase):
    file_id: int

class Embedding(EmbeddingBase):
    id: int
    file_id: int
    status: str
    created_at: datetime

    class Config:
        orm_mode = True

class VisualizationBase(BaseModel):
    method: str
    dimensions: int

class VisualizationCreate(VisualizationBase):
    embedding_id: int

class Visualization(VisualizationBase):
    id: int
    embedding_id: int
    coordinates: List[List[float]]
    clusters: Optional[List[int]]
    created_at: datetime

    class Config:
        orm_mode = True