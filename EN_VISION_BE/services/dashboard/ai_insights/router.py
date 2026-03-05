from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date
from typing import Optional

from db.session import get_db
from schemas.base import StandardResponse
from services.dashboard.ai_insights.service import generate_ai_insights

router = APIRouter()


def resolve_range(range: str, start_date, end_date):
    end = end_date or datetime.utcnow().date()
    if start_date:
        return start_date, end
    mapping = {"24h": 1, "7d": 7, "30d": 30, "90d": 90}
    return end - timedelta(days=mapping.get(range, 7)), end


@router.get("/ai-insights", response_model=StandardResponse)
def ai_insights(
    company_id: int = Query(...),
    range: str = Query("7d"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    department_id: Optional[int] = None,
    device_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    start, end = resolve_range(range, start_date, end_date)

    data = generate_ai_insights(
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