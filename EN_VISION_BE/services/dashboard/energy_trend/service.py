from sqlalchemy.orm import Session
from sqlalchemy import func
from models.energy import EnergyAggDaily, EnergyAggHourly
from models.meter import Meter
from models.device import Device
from models.department import Department
from models.zone import Zone
from models.location import Location
from typing import Optional


def _apply_filters(query, company_id: int, department_id: Optional[int], device_id: Optional[int], model):
    """
    Shared filter logic for both daily and hourly queries.

    Join path when filtering by department/device:
        EnergyAggDaily/Hourly → Meter → Device → Department (company filter)

    Join path when no department/device filter:
        EnergyAggDaily/Hourly → Meter → Zone → Location (company filter)

    Both paths are valid since Meter has both zone_id and device_id.
    """
    if department_id or device_id:
        # Filter via Device → Department chain
        query = (
            query
            .join(Meter)
            .join(Device, Device.id == Meter.device_id)
            .join(Department, Department.id == Device.department_id)
            .filter(Department.company_id == company_id)
        )
        if department_id:
            query = query.filter(Device.department_id == department_id)
        if device_id:
            query = query.filter(Meter.device_id == device_id)
    else:
        # Default path via Zone → Location
        query = (
            query
            .join(Meter)
            .join(Zone, Zone.id == Meter.zone_id)
            .join(Location, Location.id == Zone.location_id)
            .filter(Location.company_id == company_id)
        )

    return query


def fetch_energy_trend(
    db: Session,
    company_id: int,
    start,
    end,
    granularity: str = "daily",
    department_id: Optional[int] = None,
    device_id: Optional[int] = None,
):
    if granularity == "hourly":
        base_query = db.query(
            EnergyAggHourly.hour_start.label("timestamp"),
            func.sum(EnergyAggHourly.total_kwh).label("total_kwh"),
            func.sum(EnergyAggHourly.total_cost).label("total_cost"),
            func.sum(EnergyAggHourly.total_emissions).label("total_emissions"),
            func.max(EnergyAggHourly.peak_kw).label("peak_power"),
            # baseline not available at hourly level, default to 0
            func.sum(EnergyAggHourly.total_kwh * 0).label("baseline_kwh"),
        ).filter(EnergyAggHourly.hour_start.between(start, end))

        query = _apply_filters(
            base_query, company_id, department_id, device_id, EnergyAggHourly
        )

        rows = (
            query
            .group_by(EnergyAggHourly.hour_start)
            .order_by(EnergyAggHourly.hour_start)
            .all()
        )

    else:
        base_query = db.query(
            EnergyAggDaily.date.label("timestamp"),
            func.sum(EnergyAggDaily.total_kwh).label("total_kwh"),
            func.sum(EnergyAggDaily.total_cost).label("total_cost"),
            func.sum(EnergyAggDaily.total_emissions).label("total_emissions"),
            func.max(EnergyAggDaily.peak_kw).label("peak_power"),
            func.sum(EnergyAggDaily.baseline_kwh).label("baseline_kwh"),
        ).filter(EnergyAggDaily.date.between(start, end))

        query = _apply_filters(
            base_query, company_id, department_id, device_id, EnergyAggDaily
        )

        rows = (
            query
            .group_by(EnergyAggDaily.date)
            .order_by(EnergyAggDaily.date)
            .all()
        )

    return [
        {
            "timestamp": row.timestamp.isoformat(),
            "total_kwh": float(row.total_kwh or 0),
            "total_cost": float(row.total_cost or 0),
            "total_emissions": float(row.total_emissions or 0),
            "peak_power": float(row.peak_power or 0),
            "baseline_kwh": float(row.baseline_kwh or 0),
        }
        for row in rows
    ]