from sqlalchemy.orm import Session
from sqlalchemy import func, literal
from datetime import datetime, timedelta
from models.energy import EnergyAggDaily
from models.energy import EnergyReading
from models.meter import Meter
from models.zone import Zone
from models.location import Location
from models.device import Device
from typing import Optional
from utils.tariff import cost_from_kwh


def get_location_consumption(
    db: Session,
    company_id: int,
    start,
    end,
    department_id: Optional[int] = None,
    device_id: Optional[int] = None,
):
    """
    Returns energy consumption grouped by Zone for location-wise chart.
    Join: EnergyAggDaily → Meter → Zone → Location
    Optional filter: Department → Device
    """

    query = (
        db.query(
            Zone.name.label("zone"),
            Location.name.label("location"),
            func.sum(EnergyAggDaily.total_kwh).label("total_kwh"),
            func.sum(EnergyAggDaily.baseline_kwh).label("baseline_kwh"),
            func.max(EnergyAggDaily.peak_kw).label("peak_kw"),
        )
        .join(Meter, EnergyAggDaily.meter_id == Meter.id)
        .join(Zone, Meter.zone_id == Zone.id)
        .join(Location, Zone.location_id == Location.id)
        .filter(
            Location.company_id == company_id,
            EnergyAggDaily.date.between(start, end),
        )
    )

    # Apply device/department filters via Device → Department path
    if department_id or device_id:
        query = query.join(Device, Device.id == Meter.device_id)
        if department_id:
            query = query.filter(Device.department_id == department_id)
        if device_id:
            query = query.filter(Device.id == device_id)

    rows = (
        query
        .group_by(Zone.name, Location.name)
        .order_by(func.sum(EnergyAggDaily.total_kwh).desc())
        .all()
    )

    if not rows:
        start_dt = datetime.combine(start, datetime.min.time())
        end_dt = datetime.combine(end + timedelta(days=1), datetime.min.time())

        readings_query = (
            db.query(
                Zone.name.label("zone"),
                Location.name.label("location"),
                (func.sum(EnergyReading.reading_kw) / 60.0).label("total_kwh"),
                literal(0.0).label("baseline_kwh"),
                func.max(EnergyReading.reading_kw).label("peak_kw"),
            )
            .join(Meter, EnergyReading.meter_id == Meter.id)
            .join(Zone, Meter.zone_id == Zone.id)
            .join(Location, Zone.location_id == Location.id)
            .filter(
                Location.company_id == company_id,
                EnergyReading.recorded_at >= start_dt,
                EnergyReading.recorded_at < end_dt,
            )
        )

        if department_id or device_id:
            readings_query = readings_query.join(Device, Device.id == Meter.device_id)
            if department_id:
                readings_query = readings_query.filter(Device.department_id == department_id)
            if device_id:
                readings_query = readings_query.filter(Device.id == device_id)

        readings_rows = (
            readings_query
            .group_by(Zone.name, Location.name)
            .order_by((func.sum(EnergyReading.reading_kw) / 60.0).desc())
            .all()
        )

        rows = readings_rows

    total_kwh = sum(float(r.total_kwh or 0) for r in rows)

    return [
        {
            "zone": row.zone,
            "location": row.location,
            "total_kwh": round(float(row.total_kwh or 0), 2),
            "baseline_kwh": round(float(row.baseline_kwh or 0), 2),
            "total_cost": round(cost_from_kwh(float(row.total_kwh or 0)), 2),
            "peak_kw": round(float(row.peak_kw or 0), 2),
            "deviation": round(
                float(row.total_kwh or 0) - float(row.baseline_kwh or 0), 2
            ),
            "percentage": round(
                (float(row.total_kwh or 0) / total_kwh * 100) if total_kwh > 0 else 0,
                1,
            ),
        }
        for row in rows
    ]