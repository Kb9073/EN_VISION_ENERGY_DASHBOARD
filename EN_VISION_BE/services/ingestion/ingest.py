from fastapi import APIRouter, UploadFile, File
from services.ingestion.service import ingest_csv_file

router = APIRouter(prefix="/ingest", tags=["Ingestion"])


@router.post("/csv")
async def ingest_csv(file: UploadFile = File(...)):
    """
    CSV ingestion endpoint.
    Delegates processing to service layer.
    """
    return ingest_csv_file(file)
