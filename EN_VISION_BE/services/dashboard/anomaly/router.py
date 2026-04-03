from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import Optional

from db.session import get_db
from schemas.base import StandardResponse
from services.dashboard.anomaly.service import get_anomaly_summary
from services.dashboard.utils.date_range import resolve_scoped_range

router = APIRouter()


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
    start, end = resolve_scoped_range(
        db=db,
        company_id=company_id,
        range_param=range,
        start_date=start_date,
        end_date=end_date,
        department_id=department_id,
        device_id=device_id,
    )

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