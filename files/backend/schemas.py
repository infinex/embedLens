from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr

class User(UserBase):
    user_id: int
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
    project_id: int
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
    file_id: int
    original_filename: str
    project_id: int
    columns: Optional[List[str]]
    created_at: datetime
    row_count: int

    class Config:
        orm_mode = True

class FileRowBase(BaseModel):
    row_index: int
    row_data: Dict[str, Any]

class FileRowCreate(FileRowBase):
    file_id: int

class FileRow(FileRowBase):
    row_id: int
    file_id: int
    created_at: datetime

    class Config:
        orm_mode = True

class EmbeddingBase(BaseModel):
    model_name: str
    vector_dimension: int

class EmbeddingCreate(EmbeddingBase):
    file_id: int
    row_id: int

class Embedding(EmbeddingBase):
    embedding_id: int
    file_id: int
    row_id: int
    status: str
    vector: List[float]
    created_at: datetime

    class Config:
        orm_mode = True

class VisualizationBase(BaseModel):
    method: str
    dimensions: int

class VisualizationCreate(VisualizationBase):
    embedding_id: int
    file_id: int
    row_id: int

class Visualization(VisualizationBase):
    visualization_id: int
    embedding_id: int
    file_id: int
    row_id: int
    coordinate: List[float]
    cluster: Optional[Dict]
    created_at: datetime

    class Config:
        orm_mode = True