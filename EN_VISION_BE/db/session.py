from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os
from dotenv import load_dotenv

load_dotenv()

DEFAULT_DATABASE_URL = "postgresql://postgres:StrongNewPassword123@localhost:5432/EN-VISION(Updated)"
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    DEFAULT_DATABASE_URL,
)

engine_kwargs = {
    "echo": True,
    "future": True,
}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    future=True
)


# 🔹 Base class for all models
class Base(DeclarativeBase):
    pass


def test_db_connection():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Database connected successfully")
        return True
    except Exception as e:
        print("❌ Database connection failed:", e)
        return False


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()