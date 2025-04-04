from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional

router = APIRouter(
    prefix="/visualizations",
    tags=["visualizations"],
    responses={404: {"description": "Not found"}}
)

@router.get("/{embedding_id}", response_model=List[schemas.Visualization])
async def get_visualizations(
    embedding_id: int,
    method: Optional[str] = Query(None, description="Filter by visualization method (umap or pca)"),
    dimensions: Optional[int] = Query(None, description="Filter by dimensions (2 or 3)"),
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Get visualizations for a specific embedding.
    
    - **embedding_id**: ID of the embedding
    - **method**: Optional filter by visualization method (umap or pca)
    - **dimensions**: Optional filter by number of dimensions (2 or 3)
    
    Returns a list of visualizations matching the criteria.
    """
    # ... (rest of the implementation remains the same)

@router.get("/{visualization_id}/export")
async def export_visualization(
    visualization_id: int,
    format: str = Query("csv", description="Export format (csv or json)"),
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Export visualization data in CSV or JSON format.
    
    - **visualization_id**: ID of the visualization to export
    - **format**: Export format, either 'csv' or 'json'
    
    Returns:
    - For CSV: A file download response
    - For JSON: A JSON array of points with coordinates and cluster information
    """
    # ... (rest of the implementation remains the same)