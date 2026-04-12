import os
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Neon Postgres Connection URL
DATABASE_URL = os.getenv("DATABASE_URL")

# Create PostgreSQL engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    expenses = relationship("Expense", back_populates="owner")

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    merchant = Column(String(255), nullable=True)
    total = Column(Float, nullable=False)
    date = Column(String(100), nullable=True)
    category = Column(String(100), nullable=False, default="Other")
    gstno = Column(String(50), nullable=True)
    filename = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="expenses")

def init_db():
    print("Connecting to PostgreSQL and initializing tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables initialized successfully on Neon!")
    except Exception as e:
        print(f"Error initializing database: {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
