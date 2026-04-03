from sqlalchemy.orm import Session
from sqlalchemy import func, literal
from datetime import datetime, timedelta
from models.device import Device, DeviceStatus
from models.department import Department
from models.meter import Meter
from models.zone import Zone
from models.location import Location
from models.energy import EnergyAggDaily
from models.energy import EnergyReading
from typing import Optional


# ---------------------------------------
# 1️⃣ Summary (Total + Active Devices)
# ---------------------------------------
def get_appliance_summary(
    db: Session,
    company_id: int,
    department_id: Optional[int] = None,
    device_id: Optional[int] = None,
):
    base = (
        db.query(Device)
        .join(Meter, Meter.device_id == Device.id)
        .join(Zone, Zone.id == Meter.zone_id)
        .join(Location, Location.id == Zone.location_id)
        .filter(Location.company_id == company_id)
    )

    if department_id:
        base = base.filter(Device.department_id == department_id)

    if device_id:
        base = base.filter(Device.id == device_id)

    total_devices = base.with_entities(func.count(Device.id)).scalar()

    active_devices = (
        base
        .filter(Device.status == DeviceStatus.active)
        .with_entities(func.count(Device.id))
        .scalar()
    )

    return {
        "total_devices": total_devices or 0,
        "active_devices": active_devices or 0,
        "inactive_devices": (total_devices or 0) - (active_devices or 0),
    }


# ---------------------------------------
# 2️⃣ Device-wise Energy Usage
# ---------------------------------------
def get_device_energy_usage(
    db: Session,
    company_id: int,
    start,
    end,
    department_id: Optional[int] = None,
    device_id: Optional[int] = None,
):
    query = (
        db.query(
            Device.id,
            Device.name,
            func.sum(EnergyAggDaily.total_kwh).label("total_kwh"),
            func.sum(EnergyAggDaily.baseline_kwh).label("baseline_kwh"),
        )
        .join(Meter, Meter.device_id == Device.id)
        .join(Zone, Zone.id == Meter.zone_id)
        .join(Location, Location.id == Zone.location_id)
        .join(EnergyAggDaily, EnergyAggDaily.meter_id == Meter.id)
        .filter(
            Location.company_id == company_id,
            EnergyAggDaily.date.between(start, end),
        )
    )

    if department_id:
        query = query.filter(Device.department_id == department_id)

    if device_id:
        query = query.filter(Device.id == device_id)

    rows = (
        query
        .group_by(Device.id, Device.name)
        .order_by(func.sum(EnergyAggDaily.total_kwh).desc())
        .all()
    )

    if not rows:
        start_dt = datetime.combine(start, datetime.min.time())
        end_dt = datetime.combine(end + timedelta(days=1), datetime.min.time())

        readings_query = (
            db.query(
                Device.id,
                Device.name,
                (func.sum(EnergyReading.reading_kw) / 60.0).label("total_kwh"),
                literal(0.0).label("baseline_kwh"),
            )
            .join(Meter, Meter.device_id == Device.id)
            .join(Zone, Zone.id == Meter.zone_id)
            .join(Location, Location.id == Zone.location_id)
            .join(EnergyReading, EnergyReading.meter_id == Meter.id)
            .filter(
                Location.company_id == company_id,
                EnergyReading.recorded_at >= start_dt,
                EnergyReading.recorded_at < end_dt,
            )
        )

        if department_id:
            readings_query = readings_query.filter(Device.department_id == department_id)

        if device_id:
            readings_query = readings_query.filter(Device.id == device_id)

        rows = (
            readings_query
            .group_by(Device.id, Device.name)
            .order_by((func.sum(EnergyReading.reading_kw) / 60.0).desc())
            .all()
        )

    return [
        {
            "device_id": row.id,
            "device_name": row.name,
            "total_kwh": float(row.total_kwh or 0),
            "baseline_kwh": float(row.baseline_kwh or 0),
            "deviation": float((row.total_kwh or 0) - (row.baseline_kwh or 0)),
        }
        for row in rows
    ]