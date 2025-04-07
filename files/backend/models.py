from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    projects = relationship("Project", back_populates="owner")

class Project(Base):
    __tablename__ = "projects"
    
    project_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    owner = relationship("User", back_populates="projects")
    files = relationship("File", back_populates="project")

class File(Base):
    __tablename__ = "files"
    
    file_id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    original_filename = Column(String)
    file_type = Column(String)  # csv, parquet, etc.
    project_id = Column(Integer, ForeignKey("projects.project_id"))
    columns = Column(JSON)  # Store column metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    project = relationship("Project", back_populates="files")
    embeddings = relationship("Embedding", back_populates="file")

class Embedding(Base):
    __tablename__ = "embeddings"
    
    embedding_id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("files.file_id"))
    model_name = Column(String)  # e.g., "openai-text-embedding-ada-002"
    status = Column(String)  # pending, processing, complete, failed
    vector_dimension = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    file = relationship("File", back_populates="embeddings")
    visualizations = relationship("Visualization", back_populates="embedding")

class Visualization(Base):
    __tablename__ = "visualizations"
    
    visualization_id = Column(Integer, primary_key=True, index=True)
    embedding_id = Column(Integer, ForeignKey("embeddings.embedding_id"))
    method = Column(String)  # umap, tsne, pca
    dimensions = Column(Integer)  # 2 or 3
    coordinates = Column(JSON)  # Store reduced coordinates
    clusters = Column(JSON, nullable=True)  # Optional clustering information
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    embedding = relationship("Embedding", back_populates="visualizations")