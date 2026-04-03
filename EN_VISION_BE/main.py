import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from services.dashboard.router import router as dashboard_router
from services.ingestion.ingest import router as ingestion_router
from services.auth.router import router as auth_router, ensure_default_users
from db.session import engine, SessionLocal
from db.session import Base

# Ensure ORM models are imported before metadata create_all.
from models import *  # noqa: F401,F403

load_dotenv()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        ensure_default_users(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title="En-Vision API",
    version="1.0.0",
    lifespan=lifespan,
)

# Environment-based CORS configuration
ENV = os.getenv("ENV", "development")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")

# Enhance for development flexibility
if ENV == "development":
    ALLOWED_ORIGINS.extend([
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ])

ALLOWED_ORIGINS = list(dict.fromkeys(origin.strip() for origin in ALLOWED_ORIGINS if origin.strip()))

# CORS Middleware - Important for frontend cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ✅ ONLY TOP LEVEL ROUTERS
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(ingestion_router)

@app.get("/")
def root():
    return {"status": "En-Vision API running"}
