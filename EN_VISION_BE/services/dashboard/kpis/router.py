from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, date
from typing import Optional

from db.session import get_db
from models.energy import EnergyAggDaily, EnergyReading
from models.meter import Meter
from models.device import Device
from models.department import Department
from schemas.base import StandardResponse
from schemas.dashboard_kpis import DashboardKPIs
from services.dashboard.kpis.service import calculate_kpis

router = APIRouter()


def _normalize_range(range_param: Optional[str]) -> str:
    normalized = (range_param or "7d").strip().lower()
    if normalized not in {"24h", "7d", "30d", "90d"}:
        return "7d"
    return normalized


def resolve_date_range(
    range: str,
    start_date: Optional[date],
    end_date: Optional[date],
):
    today = datetime.utcnow().date()
    end = end_date or today

    normalized_range = _normalize_range(range)

    if start_date:
        start = start_date
    else:
        if normalized_range == "24h":
            start = end - timedelta(days=1)
        elif normalized_range == "7d":
            start = end - timedelta(days=7)
        elif normalized_range == "30d":
            start = end - timedelta(days=30)
        elif normalized_range == "90d":
            start = end - timedelta(days=90)
        else:
            start = end - timedelta(days=7)

    return start, end


def _latest_company_energy_date(db: Session, company_id: int) -> Optional[date]:
    latest_agg = (
        db.query(func.max(EnergyAggDaily.date))
        .join(Meter, Meter.id == EnergyAggDaily.meter_id)
        .join(Device, Device.id == Meter.device_id)
        .join(Department, Department.id == Device.department_id)
        .filter(Department.company_id == company_id)
        .scalar()
    )

    latest_reading_dt = (
        db.query(func.max(EnergyReading.recorded_at))
        .join(Meter, Meter.id == EnergyReading.meter_id)
        .join(Device, Device.id == Meter.device_id)
        .join(Department, Department.id == Device.department_id)
        .filter(Department.company_id == company_id)
        .scalar()
    )
    latest_reading = latest_reading_dt.date() if latest_reading_dt else None

    candidates = [d for d in (latest_agg, latest_reading) if d is not None]
    return max(candidates) if candidates else None


def _company_data_exists_in_window(db: Session, company_id: int, start: date, end: date) -> bool:
    agg_count = (
        db.query(func.count(EnergyAggDaily.id))
        .join(Meter, Meter.id == EnergyAggDaily.meter_id)
        .join(Device, Device.id == Meter.device_id)
        .join(Department, Department.id == Device.department_id)
        .filter(
            Department.company_id == company_id,
            EnergyAggDaily.date.between(start, end),
        )
        .scalar()
    )
    if agg_count:
        return True

    start_dt = datetime.combine(start, datetime.min.time())
    end_dt = datetime.combine(end + timedelta(days=1), datetime.min.time())
    reading_count = (
        db.query(func.count(EnergyReading.id))
        .join(Meter, Meter.id == EnergyReading.meter_id)
        .join(Device, Device.id == Meter.device_id)
        .join(Department, Department.id == Device.department_id)
        .filter(
            Department.company_id == company_id,
            EnergyReading.recorded_at >= start_dt,
            EnergyReading.recorded_at < end_dt,
        )
        .scalar()
    )
    return bool(reading_count or 0)


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
    normalized_range = _normalize_range(range)
    start, end = resolve_date_range(normalized_range, start_date, end_date)
    fallback_applied = False

    if start > end:
        start, end = end, start

    # If no explicit dates are provided and recent window is empty,
    # shift window to the latest available company data so default login
    # always shows meaningful main-database values.
    if not start_date and not end_date:
        if not _company_data_exists_in_window(db, company_id, start, end):
            latest_date = _latest_company_energy_date(db, company_id)
            if latest_date:
                fallback_applied = True
                end = latest_date
                if normalized_range == "24h":
                    start = end - timedelta(days=1)
                elif normalized_range == "30d":
                    start = end - timedelta(days=30)
                elif normalized_range == "90d":
                    start = end - timedelta(days=90)
                else:
                    start = end - timedelta(days=7)

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
        meta={
            "requested_range": normalized_range,
            "effective_start": start.isoformat(),
            "effective_end": end.isoformat(),
            "fallback_applied": fallback_applied,
            "used_explicit_dates": bool(start_date or end_date),
        },
    )