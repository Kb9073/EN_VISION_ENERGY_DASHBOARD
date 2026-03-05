from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date
from typing import Optional

from db.session import get_db
from schemas.base import StandardResponse
from services.dashboard.carbon.service import (
    get_total_emissions,
    get_emissions_breakdown,
    get_emissions_by_scope,
)

router = APIRouter(tags=["Dashboard - Carbon"])


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
# 1️⃣ Total Emissions
# NOTE: CarbonEmission is recorded at company level.
# department_id / device_id are accepted for API consistency
# but do not narrow the query (no FK relationship exists).
# ---------------------------------------
@router.get("/carbon/total", response_model=StandardResponse)
def carbon_total(
    company_id: int = Query(...),
    range: str = Query("7d"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    department_id: Optional[int] = None,  # accepted, not applied
    device_id: Optional[int] = None,       # accepted, not applied
    db: Session = Depends(get_db),
):
    start, end = resolve_range(range, start_date, end_date)
    total = get_total_emissions(db, company_id, start, end)

    return StandardResponse(
        success=True,
        data={"total_emissions": total},
        timestamp=datetime.utcnow(),
    )


# ---------------------------------------
# 2️⃣ Breakdown by Source
# ---------------------------------------
@router.get("/carbon/breakdown", response_model=StandardResponse)
def carbon_breakdown(
    company_id: int = Query(...),
    range: str = Query("7d"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    department_id: Optional[int] = None,  # accepted, not applied
    device_id: Optional[int] = None,       # accepted, not applied
    db: Session = Depends(get_db),
):
    start, end = resolve_range(range, start_date, end_date)
    data = get_emissions_breakdown(db, company_id, start, end)

    return StandardResponse(
        success=True,
        data=data,
        timestamp=datetime.utcnow(),
    )


# ---------------------------------------
# 3️⃣ Scope Split
# ---------------------------------------
@router.get("/carbon/scope", response_model=StandardResponse)
def carbon_scope(
    company_id: int = Query(...),
    range: str = Query("7d"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    department_id: Optional[int] = None,  # accepted, not applied
    device_id: Optional[int] = None,       # accepted, not applied
    db: Session = Depends(get_db),
):
    start, end = resolve_range(range, start_date, end_date)
    data = get_emissions_by_scope(db, company_id, start, end)

    return StandardResponse(
        success=True,
        data=data,
        timestamp=datetime.utcnow(),
    )