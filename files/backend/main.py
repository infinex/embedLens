from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import inspect
from typing import List
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

import models, schemas, database, auth
from routers import projects, files, embeddings, visualizations

app = FastAPI(title="Embedding Visualizer API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database initialization
logger.info("Creating database tables...")
models.Base.metadata.create_all(bind=database.engine)

# Log existing tables
inspector = inspect(database.engine)
existing_tables = inspector.get_table_names()
logger.info(f"Created tables: {existing_tables}")

# Include routers
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(files.router, prefix="/api/files", tags=["files"])
app.include_router(embeddings.router, prefix="/api/embeddings", tags=["embeddings"])
app.include_router(visualizations.router, prefix="/api/visualizations", tags=["visualizations"])

@app.get("/api/me", response_model=schemas.User)
async def read_users_me(current_user: schemas.User = Depends(auth.get_current_user)):
    return current_user