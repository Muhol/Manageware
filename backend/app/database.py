import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# The database URL should be provided in a .env file as DATABASE_URL
# Example: postgresql://user:password@neon-host/db_name?sslmode=require
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# If DATABASE_URL is not set, use a fallback for local development if needed, 
# but NeonDB is requested so we'll expect it.
if not SQLALCHEMY_DATABASE_URL:
    # Fallback to sqlite just for initial testing if no env is provided
    SQLALCHEMY_DATABASE_URL = "sqlite:///./sql_app.db"

# Create engine. For PostgreSQL, no need for connect_args={"check_same_thread": False}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True, pool_recycle=300)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency to get db session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
