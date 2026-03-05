from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date
from typing import Optional

from db.session import get_db
from schemas.base import StandardResponse
from services.dashboard.cost.service import get_cost_metrics

router = APIRouter(tags=["Dashboard - Cost"])


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


@router.get("/cost-metrics", response_model=StandardResponse)
def cost_metrics(
    company_id: int = Query(...),
    range: str = Query("30d"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    department_id: Optional[int] = None,
    device_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    start, end = resolve_range(range, start_date, end_date)

    data = get_cost_metrics(
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