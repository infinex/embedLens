from ..services.progress import progress_tracker

# ... (previous code remains the same)

@router.get("/{embedding_id}/progress")
async def get_embedding_progress(
    embedding_id: int,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    # Verify user has access to this embedding
    embedding = db.query(models.Embedding).join(models.File).join(models.Project).filter(
        models.Embedding.id == embedding_id,
        models.Project.user_id == current_user.id
    ).first()
    
    if not embedding:
        raise HTTPException(status_code=404, detail="Embedding not found")

    progress = progress_tracker.get_progress(str(embedding_id))
    if not progress:
        return {
            "status": embedding.status,
            "progress": 0 if embedding.status == "pending" else 100
        }
    
    return progress