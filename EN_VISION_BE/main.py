import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.dashboard.router import router as dashboard_router
from services.ingestion.ingest import router as ingestion_router

app = FastAPI(
    title="En-Vision API",
    version="1.0.0"
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
        "*",  # Allow all in development only
    ])

# CORS Middleware - Important for frontend cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ✅ ONLY TOP LEVEL ROUTERS
app.include_router(dashboard_router)
app.include_router(ingestion_router)

@app.get("/")
def root():
    return {"status": "En-Vision API running"}
