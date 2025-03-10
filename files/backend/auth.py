from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from . import models, schemas, database
from typing import Optional

security = HTTPBearer()

async def verify_token(token: str) -> dict:
    """
    Verify token with Envoy. This is a placeholder - implement actual verification.
    """
    # In production, verify token with your auth provider
    # For development, you might want to accept any token
    return {"sub": "test-user", "email": "test@example.com"}

async def get_current_user(
    token: str = Depends(security),
    db: Session = Depends(database.get_db)
) -> schemas.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW.Authenticate": "Bearer"},
    )
    
    try:
        payload = await verify_token(token.credentials)
        external_id: str = payload.get("sub")
        if external_id is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception
    
    # Get or create user
    user = db.query(models.User).filter(models.User.external_id == external_id).first()
    if not user:
        user = models.User(
            external_id=external_id,
            email=payload.get("email")
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    return user