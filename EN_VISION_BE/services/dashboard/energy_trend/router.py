from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from typing import Optional

from db.session import get_db
from services.dashboard.energy_trend.service import fetch_energy_trend
from schemas.base import StandardResponse

router = APIRouter(tags=["Dashboard"])


def resolve_range(range: str, start_date, end_date):
    end = end_date or datetime.utcnow().date()

    if start_date:
        return start_date, end

    if range == "24h":
        start = end - timedelta(days=1)
    elif range == "7d":
        start = end - timedelta(days=7)
    elif range == "30d":
        start = end - timedelta(days=30)
    elif range == "90d":
        start = end - timedelta(days=90)
    else:
        start = end - timedelta(days=7)

    return start, end


@router.get("/energy-trend", response_model=StandardResponse)
def get_energy_trend(
    company_id: int = Query(...),
    range: str = Query("7d"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    granularity: str = Query("daily"),
    department_id: Optional[int] = None,
    device_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    start, end = resolve_range(range, start_date, end_date)

    data = fetch_energy_trend(
        db=db,
        company_id=company_id,
        start=start,
        end=end,
        granularity=granularity,
        department_id=department_id,
        device_id=device_id,
    )

    return StandardResponse(
        success=True,
        data=data,
        timestamp=datetime.utcnow(),
    )