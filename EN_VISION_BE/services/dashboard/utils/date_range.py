from datetime import datetime, timedelta, date
from fastapi import HTTPException
from typing import Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from models.department import Department
from models.device import Device
from models.energy import EnergyAggDaily, EnergyReading
from models.meter import Meter


def resolve_date_range(
    start_date: Optional[str],
    end_date: Optional[str],
    range_param: Optional[str],
) -> Tuple[date, date]:

    # 1️⃣ If explicit dates passed
    if start_date and end_date:
        try:
            start = datetime.fromisoformat(start_date).date()
            end = datetime.fromisoformat(end_date).date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")

    # 2️⃣ If using predefined range
    elif range_param:
        end = datetime.utcnow().date()

        if range_param == "24h":
            start = end - timedelta(days=1)
        elif range_param == "7d":
            start = end - timedelta(days=7)
        elif range_param == "30d":
            start = end - timedelta(days=30)
        elif range_param == "90d":
            start = end - timedelta(days=90)
        else:
            raise HTTPException(status_code=400, detail="Invalid range")

    else:
        raise HTTPException(status_code=400, detail="Date range required")

    if start > end:
        raise HTTPException(status_code=400, detail="Invalid date range")

    return start, end


def _range_days(range_param: Optional[str]) -> int:
    mapping = {
        "24h": 1,
        "7d": 7,
        "30d": 30,
        "90d": 90,
    }
    return mapping.get(range_param or "7d", 7)


def _latest_scoped_data_date(
    db: Session,
    company_id: int,
    department_id: Optional[int] = None,
    device_id: Optional[int] = None,
) -> Optional[date]:
    agg_query = (
        db.query(func.max(EnergyAggDaily.date))
        .join(Meter, Meter.id == EnergyAggDaily.meter_id)
        .join(Device, Device.id == Meter.device_id)
        .join(Department, Department.id == Device.department_id)
        .filter(Department.company_id == company_id)
    )

    reading_query = (
        db.query(func.max(EnergyReading.recorded_at))
        .join(Meter, Meter.id == EnergyReading.meter_id)
        .join(Device, Device.id == Meter.device_id)
        .join(Department, Department.id == Device.department_id)
        .filter(Department.company_id == company_id)
    )

    if department_id is not None:
        agg_query = agg_query.filter(Device.department_id == department_id)
        reading_query = reading_query.filter(Device.department_id == department_id)

    if device_id is not None:
        agg_query = agg_query.filter(Device.id == device_id)
        reading_query = reading_query.filter(Device.id == device_id)

    agg_max = agg_query.scalar()
    reading_max = reading_query.scalar()

    candidates = []
    if agg_max is not None:
        candidates.append(agg_max)
    if reading_max is not None:
        candidates.append(reading_max.date())

    return max(candidates) if candidates else None


def resolve_scoped_range(
    db: Session,
    company_id: int,
    range_param: Optional[str],
    start_date: Optional[date],
    end_date: Optional[date],
    department_id: Optional[int] = None,
    device_id: Optional[int] = None,
) -> Tuple[date, date]:
    latest_data_end = _latest_scoped_data_date(
        db=db,
        company_id=company_id,
        department_id=department_id,
        device_id=device_id,
    )

    end = end_date or latest_data_end or datetime.utcnow().date()

    if start_date is not None:
        start = start_date
    else:
        start = end - timedelta(days=_range_days(range_param))

    if start > end:
        raise HTTPException(status_code=400, detail="Invalid date range")

    return start, end