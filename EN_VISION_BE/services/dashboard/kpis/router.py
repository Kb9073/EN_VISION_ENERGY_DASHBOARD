from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date
from typing import Optional

from db.session import get_db
from schemas.base import StandardResponse
from schemas.dashboard_kpis import DashboardKPIs
from services.dashboard.kpis.service import calculate_kpis

router = APIRouter()


def resolve_date_range(
    range: str,
    start_date: Optional[date],
    end_date: Optional[date],
):
    today = datetime.utcnow().date()
    end = end_date or today

    if start_date:
        start = start_date
    else:
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


@router.get("/kpis", response_model=StandardResponse[DashboardKPIs])
def get_dashboard_kpis(
    company_id: int = Query(...),
    range: Optional[str] = Query(default="7d"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    department_id: Optional[int] = None,
    device_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    start, end = resolve_date_range(range, start_date, end_date)

    data = calculate_kpis(
        db=db,
        company_id=company_id,
        start=start,
        end=end,
        department_id=department_id,
        device_id=device_id,
    )

    return StandardResponse(
        success=True,
        data=data,
        timestamp=datetime.utcnow(),
    )