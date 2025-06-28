# EmbedLens Backend API

## Overview
This is a FastAPI backend for EmbedLens, a tool for generating and visualizing embeddings from data files. The backend provides REST API endpoints for managing projects, uploading files, generating embeddings, and creating visualizations.

## Router Structure

### Projects Router (`routers/projects.py`)
Handles project management operations:
- `GET /projects/` - List all projects for the authenticated user
- `POST /projects/` - Create a new project
- `GET /projects/{project_id}` - Get a specific project
- `DELETE /projects/{project_id}` - Delete a project

### Files Router (`routers/files.py`)
Manages file uploads and data processing:
- `POST /files/upload/{project_id}` - Upload CSV/Parquet files to a project
- `GET /files/{file_id}/rows` - Get paginated file rows (with skip/limit)
- `GET /files/project/{project_id}` - List all files in a project
- `GET /files/{file_id}/columns` - Get file column metadata

**File Upload Process:**
1. Validates file extension (.csv, .parquet)
2. Saves file with unique UUID filename
3. Parses file and stores metadata (columns, types, row count)
4. Stores each row in FileRow table
5. Enqueues background processing task

### Embeddings Router (`routers/embeddings.py`)
Handles embedding generation and job tracking:
- `POST /embeddings/{file_id}/generate` - Trigger embedding generation for a file column
- `GET /embeddings/jobs/{job_id}/progress` - Get job progress status
- `GET /embeddings/projects/{project_id}/jobs` - List all jobs for a project

**Embedding Generation Process:**
1. Validates file access and column existence
2. Creates unique job ID and ProjectJob record
3. Initializes progress tracking in Redis
4. Enqueues RQ task for background processing
5. Returns job ID for status tracking

### Visualizations Router (`routers/visualizations.py`)
Provides visualization data and export functionality:
- `GET /visualizations/file/{file_id}` - Get visualization points for a file
- `GET /visualizations/file/{file_id}/export` - Export visualization data

**Query Parameters:**
- `method`: Visualization method (umap, pca)
- `dimensions`: Number of dimensions (2 or 3)
- `format`: Export format (csv, json)
- `include_row_data`: Include original row data in export

## Authentication
All endpoints require authentication using JWT tokens. The `auth.get_current_user` dependency provides user context and ensures data isolation between users.

## Background Processing
The application uses Redis Queue (RQ) for background job processing:
- File processing after upload
- Embedding generation using OpenAI/other models
- Visualization generation (UMAP, PCA)
- Progress tracking via Redis

## Database Models
Key models include:
- `Project`: User projects containing files
- `File`: Uploaded data files with metadata
- `FileRow`: Individual rows from uploaded files
- `ProjectJob`: Job tracking for background tasks
- `Visualization`: Generated visualization coordinates

## Development Commands
```bash
# Run the application
uvicorn main:app --reload

# Run background worker
rq worker --url redis://localhost:6379

# Run tests (check for test framework in project)
# Look for pytest, unittest, or other test commands
```

## File Structure
- `routers/` - API route handlers
- `models.py` - Database models
- `schemas.py` - Pydantic schemas
- `database.py` - Database configuration
- `auth.py` - Authentication utilities
- `tasks.py` - Background task definitions