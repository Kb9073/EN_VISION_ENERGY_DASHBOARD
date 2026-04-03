from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import Optional

from db.session import get_db
from schemas.base import StandardResponse
from services.dashboard.appliances.service import (
    get_appliance_summary,
    get_device_energy_usage,
)
from services.dashboard.utils.date_range import resolve_scoped_range

router = APIRouter(tags=["Dashboard - Appliances"])


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
    start, end = resolve_scoped_range(
        db=db,
        company_id=company_id,
        range_param=range,
        start_date=start_date,
        end_date=end_date,
        department_id=department_id,
        device_id=device_id,
    )

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