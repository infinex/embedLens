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
    columns: Optional[Dict]
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
    coordinates: List[float]
    clusters: int
    created_at: datetime

    class Config:
        orm_mode = True

# --- ProjectJob Schemas ---
class ProjectJobBase(BaseModel):
    job_id: str
    project_id: int
    file_id: int

class ProjectJobCreate(ProjectJobBase):
    pass

class ProjectJob(ProjectJobBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True

# --- Job Progress Details Schema for API Response ---
class JobProgressDetails(BaseModel):
    job_id: str
    file_id: int
    status: str
    progress: Optional[float] = None # Progress might not always be a simple float (e.g. if error)
    current_step: Optional[str] = None
    error: Optional[Dict[str, Any]] = None
    model_name: Optional[str] = None # Added model_name



class VisualizationCheckResponse(BaseModel):
    # File details
    file_id: int
    file_name: str
    original_filename: str
    project_id: int
    columns: Optional[Dict]
    created_at: datetime
    row_count: int
    
    # Visualization availability
    has_visualizations: bool
    available_methods: List[str]
    available_dimensions: List[int]
    visualization_count: int
    
    class Config:
        from_attributes = True