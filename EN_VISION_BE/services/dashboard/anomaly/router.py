from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date
from typing import Optional

from db.session import get_db
from schemas.base import StandardResponse
from services.dashboard.anomaly.service import get_anomaly_summary

router = APIRouter()


def resolve_range(range: str, start_date, end_date):
    end = end_date or datetime.utcnow().date()
    if start_date:
        return start_date, end
    mapping = {"24h": 1, "7d": 7, "30d": 30, "90d": 90}
    days = mapping.get(range, 7)
    return end - timedelta(days=days), end


@router.get("/anomalies", response_model=StandardResponse)
def get_anomalies(
    company_id: int = Query(...),
    range: str = Query("30d"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    department_id: Optional[int] = None,
    device_id: Optional[int] = None,
    threshold: float = Query(1.5),
    db: Session = Depends(get_db),
):
    start, end = resolve_range(range, start_date, end_date)

    data = get_anomaly_summary(
        db=db,
        company_id=company_id,
        start=start,
        end=end,
        department_id=department_id,
        device_id=device_id,
        threshold_z=threshold,
    )

    return StandardResponse(
        success=True,
        data=data,
        timestamp=datetime.utcnow(),
    )