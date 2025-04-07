from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from sqlalchemy.orm import Session
import csv
from io import StringIO
import json
from fastapi.responses import StreamingResponse, JSONResponse

import models, schemas, database, auth

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
    query = db.query(models.Visualization).join(models.Embedding).join(models.File).join(models.Project).filter(
        models.Embedding.embedding_id == embedding_id,
        models.Project.user_id == current_user.user_id
    )

    if method:
        query = query.filter(models.Visualization.method == method)
    if dimensions:
        query = query.filter(models.Visualization.dimensions == dimensions)

    visualizations = query.all()
    if not visualizations:
        raise HTTPException(status_code=404, detail="No visualizations found")

    return visualizations

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
    visualization = db.query(models.Visualization).join(models.Embedding).join(models.File).join(models.Project).filter(
        models.Visualization.visualization_id == visualization_id,
        models.Project.user_id == current_user.user_id
    ).first()

    if not visualization:
        raise HTTPException(status_code=404, detail="Visualization not found")

    # Convert coordinates and clusters to a list of points
    points = []
    for i, coord in enumerate(visualization.coordinates):
        point = {
            "x": coord[0],
            "y": coord[1],
            **({"z": coord[2]} if visualization.dimensions == 3 else {}),
            "cluster": visualization.clusters[i] if visualization.clusters else None
        }
        points.append(point)

    if format == "json":
        return JSONResponse(content=points)
    else:  # csv
        output = StringIO()
        writer = csv.DictWriter(output, fieldnames=points[0].keys())
        writer.writeheader()
        writer.writerows(points)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=visualization_{visualization_id}.csv"}
        )