from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date
from typing import Optional

from db.session import get_db
from schemas.base import StandardResponse
from services.dashboard.appliances.service import (
    get_appliance_summary,
    get_device_energy_usage,
)

router = APIRouter(tags=["Dashboard - Appliances"])


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


# ---------------------------------------
# 1️⃣ Summary Endpoint
# ---------------------------------------
@router.get("/appliances/summary", response_model=StandardResponse)
def appliances_summary(
    company_id: int = Query(...),
    department_id: Optional[int] = None,
    device_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    data = get_appliance_summary(
        db=db,
        company_id=company_id,
        department_id=department_id,
        device_id=device_id,
    )

    return StandardResponse(
        success=True,
        data=data,
        timestamp=datetime.utcnow(),
    )


# ---------------------------------------
# 2️⃣ Device Energy Usage Endpoint
# ---------------------------------------
@router.get("/appliances/usage", response_model=StandardResponse)
def appliances_usage(
    company_id: int = Query(...),
    range: str = Query("7d"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    department_id: Optional[int] = None,
    device_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    start, end = resolve_range(range, start_date, end_date)

    data = get_device_energy_usage(
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