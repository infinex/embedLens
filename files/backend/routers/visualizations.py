from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any # Added Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func # Added func
import csv
from io import StringIO
import json
import logging # Added logging
from fastapi.responses import StreamingResponse, JSONResponse

import models, schemas, database, auth

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(
    # No prefix here, assuming prefix added in main.py
    tags=["visualizations"],
    responses={404: {"description": "Not found"}}
)

# Modified endpoint to fetch all points for a file/method/dimension
@router.get("/file/{file_id}", response_model=List[schemas.Visualization])
async def get_visualizations_for_file(
    file_id: int,
    method: str = Query(..., description="Visualization method (e.g., umap or pca)"),
    dimensions: int = Query(..., description="Number of dimensions (e.g., 2 or 3)"),
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Get all visualization points for a specific file, method, and dimension.

    - **file_id**: ID of the file
    - **method**: Visualization method (umap or pca)
    - **dimensions**: Number of dimensions (2 or 3)

    Returns a list of visualization points matching the criteria.
    """
    logger.info(f"Fetching visualizations for file {file_id}, method={method}, dims={dimensions}")
    # Verify user has access to the file
    file_owner_check = db.query(models.File).join(models.Project).filter(
        models.File.file_id == file_id,
        models.Project.user_id == current_user.user_id
    ).first()

    if not file_owner_check:
        logger.warning(f"File {file_id} not found or access denied for user {current_user.user_id}")
        raise HTTPException(status_code=404, detail="File not found or access denied")

    # Query visualization points
    query = db.query(models.Visualization).filter(
        models.Visualization.file_id == file_id,
        models.Visualization.method == method,
        models.Visualization.dimensions == dimensions
    ).order_by(models.Visualization.row_id) # Order by row_id for consistency

    visualizations = query.all()

    if not visualizations:
        logger.warning(f"No visualizations found for file {file_id}, method={method}, dims={dimensions}")
        # Return empty list instead of 404, as the file exists but visualization might not
        return []
        # raise HTTPException(status_code=404, detail="No matching visualizations found for this file, method, and dimension")

    logger.info(f"Found {len(visualizations)} visualization points.")
    # Pydantic automatically handles the conversion based on schemas.Visualization
    return visualizations


# Export endpoint now exports ALL points for a file/method/dimension combo
@router.get("/file/{file_id}/export")
async def export_visualization_set( # Renamed function
    file_id: int,
    method: str = Query(..., description="Visualization method (umap or pca)"),
    dimensions: int = Query(..., description="Number of dimensions (2 or 3)"),
    format: str = Query("csv", description="Export format (csv or json)"),
    include_row_data: bool = Query(False, description="Include original row data in export"),
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Export visualization data points for a specific file, method, and dimension
    in CSV or JSON format.

    - **file_id**: ID of the file to export visualizations for
    - **method**: Visualization method (umap or pca)
    - **dimensions**: Number of dimensions (2 or 3)
    - **format**: Export format, either 'csv' or 'json'
    - **include_row_data**: If true, merges original row data with visualization points.

    Returns:
    - For CSV: A file download response
    - For JSON: A JSON array of points with coordinates and cluster information
    """
    logger.info(f"Export request for file {file_id}, method={method}, dims={dimensions}, format={format}, include_row_data={include_row_data}")
    # Verify user has access to the file (reuse query from get)
    file_owner_check = db.query(models.File).join(models.Project).filter(
        models.File.file_id == file_id,
        models.Project.user_id == current_user.user_id
    ).first()
    if not file_owner_check:
        logger.warning(f"File {file_id} not found or access denied for export")
        raise HTTPException(status_code=404, detail="File not found or access denied")

    # Query visualization points
    query = db.query(
            models.Visualization.coordinates,
            models.Visualization.clusters,
            models.Visualization.row_id,
            models.FileRow.row_index,
            models.FileRow.row_data # Select row_data if needed
        ).\
        join(models.FileRow, models.Visualization.row_id == models.FileRow.row_id).\
        filter(
            models.Visualization.file_id == file_id,
            models.Visualization.method == method,
            models.Visualization.dimensions == dimensions
        ).\
        order_by(models.FileRow.row_index) # Order by original row index

    results = query.all()

    if not results:
        logger.warning(f"No visualization points found to export for file {file_id}, method={method}, dims={dimensions}")
        raise HTTPException(status_code=404, detail="No matching visualization data found to export")

    # --- Prepare data for export ---
    points_data = []
    field_names_set = set(['row_id', 'original_row_index', 'cluster'])
    if dimensions == 2:
        field_names_set.update(['x', 'y'])
    else:
        field_names_set.update(['x', 'y', 'z'])

    for viz_coords, viz_clusters, r_id, r_index, r_data in results:
        point = {
            "row_id": r_id,
            "original_row_index": r_index,
            "cluster": viz_clusters # Already parsed JSON from DB
        }
        # Assuming coordinates are stored as list [x, y] or [x, y, z]
        if isinstance(viz_coords, list):
            point["x"] = viz_coords[0] if len(viz_coords) > 0 else None
            point["y"] = viz_coords[1] if len(viz_coords) > 1 else None
            if dimensions == 3:
                point["z"] = viz_coords[2] if len(viz_coords) > 2 else None
        else:
            # Handle case where coordinate might not be a list (error?)
            point["x"] = None
            point["y"] = None
            if dimensions == 3: point["z"] = None

        if include_row_data and isinstance(r_data, dict):
            point.update(r_data) # Merge original row data
            field_names_set.update(r_data.keys()) # Add original data keys to header set

        points_data.append(point)

    # --- Format Output ---
    if format == "json":
        logger.info(f"Exporting {len(points_data)} points as JSON")
        return JSONResponse(content=points_data)
    else:  # csv
        logger.info(f"Exporting {len(points_data)} points as CSV")
        output = StringIO()
        # Determine header order (consistent order is nice)
        field_names = sorted(list(field_names_set))
        # Move common fields to front
        common_first = ['row_id', 'original_row_index', 'x', 'y']
        if dimensions == 3: common_first.append('z')
        common_first.append('cluster')
        ordered_field_names = common_first + [f for f in field_names if f not in common_first]

        writer = csv.DictWriter(output, fieldnames=ordered_field_names, extrasaction='ignore') # Ignore extra fields if any inconsistency
        writer.writeheader()
        writer.writerows(points_data)

        # Rewind the buffer and create response
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]), # iter() for StreamingResponse
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=visualization_{file_id}_{method}_{dimensions}d.csv"}
        )