from datetime import datetime

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.orm import Session

from db.session import get_db
from schemas.base import StandardResponse
from schemas.eb_bill_schema import EBBillIngestResult, EBBillScanResult
from services.auth.dependencies import require_roles
from services.dashboard.bill_parser.ingest_service import ingest_parsed_bill
from services.dashboard.bill_parser.service import parse_eb_bill

router = APIRouter()


@router.post("/bill-parser/scan", response_model=StandardResponse[EBBillScanResult])
async def scan_eb_bill(file: UploadFile = File(...)):
    parsed = await parse_eb_bill(file)
    return StandardResponse(
        success=True,
        data=parsed,
        timestamp=datetime.utcnow(),
    )


@router.post(
    "/bill-parser/ingest",
    response_model=StandardResponse[EBBillIngestResult],
    dependencies=[Depends(require_roles("Admin"))],
)
def ingest_eb_bill(
    parsed: EBBillScanResult,
    company_id: int = Query(...),
    meter_id: int | None = Query(default=None),
    device_id: int | None = Query(default=None),
    clear_existing: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    data = ingest_parsed_bill(
        db=db,
        company_id=company_id,
        parsed=parsed,
        meter_id=meter_id,
        device_id=device_id,
        clear_existing=clear_existing,
    )
    return StandardResponse(
        success=True,
        data=data,
        timestamp=datetime.utcnow(),
    )
