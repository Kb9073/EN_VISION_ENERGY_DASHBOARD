from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime, timedelta
from typing import Optional

from db.session import get_db
from services.dashboard.energy_trend.service import fetch_energy_trend
from schemas.base import StandardResponse
from models.energy import EnergyAggDaily, EnergyReading
from models.meter import Meter
from models.device import Device
from models.department import Department

router = APIRouter(tags=["Dashboard"])


def _normalize_range(range_param: Optional[str]) -> str:
    normalized = (range_param or "7d").strip().lower()
    if normalized not in {"24h", "7d", "30d", "90d"}:
        return "7d"
    return normalized


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
    normalized_range = _normalize_range(range)
    start, end = resolve_range(normalized_range, start_date, end_date)
    fallback_applied = False

    # Keep default dashboard trend populated by shifting to latest data window
    # when selected relative range has no rows in recent dates.
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
        meta={
            "requested_range": normalized_range,
            "effective_start": start.isoformat(),
            "effective_end": end.isoformat(),
            "fallback_applied": fallback_applied,
            "used_explicit_dates": bool(start_date or end_date),
            "granularity": granularity,
        },
    )