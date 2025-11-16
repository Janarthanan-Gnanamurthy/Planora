# database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# --- DATABASE CONFIGURATION ---
# Use SQLite for local database storage
# The database file will be created in the backend directory
DATABASE_URL = "sqlite:///./planora.db"

# SQLAlchemy engine for SQLite
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# SessionLocal class, instances of this class will be actual database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for declarative class definitions (SQLAlchemy models)
Base = declarative_base()

# --- DEPENDENCY ---
def get_db():
    """
    Dependency to get a database session for each request.
    Ensures the session is closed after the request is finished.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
