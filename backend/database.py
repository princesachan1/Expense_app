import os
from sqlalchemy import MetaData
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from dotenv import load_dotenv

# Load database credentials from .env file
load_dotenv()

# Example Connection URL: mysql+mysqlconnector://user:password@host/dbname
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("DB_NAME", "expense_tracker")

SQLALCHEMY_DATABASE_URL = f"mysql+mysqlconnector://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"

# We use echo=True to see the SQL commands in the terminal (helpful for debugging)
engine = create_engine(SQLALCHEMY_DATABASE_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    merchant = Column(String(255), nullable=True)
    total = Column(Float, nullable=False)
    date = Column(String(100), nullable=True)
    category = Column(String(100), nullable=False, default="Other")
    gstno = Column(String(50), nullable=True)
    filename = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

def init_db():
    print(f"Connecting to MySQL at {DB_HOST}...")
    try:
        # Create tables if they don't exist
        Base.metadata.create_all(bind=engine)
        print("Database tables initialized successfully!")
    except Exception as e:
        print(f"Error initializing database: {e}")
        print("TIP: Make sure you have created the database 'expense_tracker' in MySQL first.")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
