from fastapi import APIRouter, UploadFile, File, Depends
from services.ingestion.service import ingest_csv_file
from services.auth.dependencies import require_roles

router = APIRouter(prefix="/ingest", tags=["Ingestion"])


@router.post("/csv", dependencies=[Depends(require_roles("Admin"))])
async def ingest_csv(file: UploadFile = File(...)):
    """
    CSV ingestion endpoint.
    Delegates processing to service layer.
    """
    return ingest_csv_file(file)
