from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime

from db.session import get_db
from schemas.base import StandardResponse
from services.dashboard.forecast.service import get_forecast

router = APIRouter()


@router.get("/forecast", response_model=StandardResponse)
def forecast(
    company_id: int = Query(...),
    horizon: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
):
    data = get_forecast(
        db=db,
        company_id=company_id,
        horizon_days=horizon,
    )

    return StandardResponse(
        success=True,
        data=data,
        timestamp=datetime.utcnow(),
    )