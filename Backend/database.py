# database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables from .env file (optional, for local development)
load_dotenv()

# --- DATABASE CONFIGURATION ---
# Replace with your actual RDS PostgreSQL connection string.
# It's STRONGLY recommended to use environment variables for these details.
# Example format: "postgresql://db_user:db_password@your-rds-instance-endpoint.region.rds.amazonaws.com:5432/your_dbname"
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:planora123@planora-database.crs4aw0sswvj.eu-north-1.rds.amazonaws.com:5432/postgres")

# SQLAlchemy engine
engine = create_engine(DATABASE_URL)

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
