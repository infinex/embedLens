from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import logging

# Configure SQL logging
logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

POSTGRES_URL = os.getenv("DATABASE_URL", "postgresql://admin:secret@postgres/embeddings")

# Enable echo mode to see SQL queries
engine = create_engine(POSTGRES_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def debug_tables():
    """Debug function to check table status"""
    # Check registered tables in SQLAlchemy
    print("Registered tables in SQLAlchemy metadata:", [table.name for table in Base.metadata.tables.values()])
    