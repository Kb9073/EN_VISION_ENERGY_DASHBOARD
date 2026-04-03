from sqlalchemy.orm import Session
from sqlalchemy import func
from models.energy import EnergyAggDaily, EnergyAggHourly, EnergyReading
from models.meter import Meter
from models.device import Device
from models.department import Department
from typing import Optional
from datetime import datetime, timedelta
from utils.tariff import cost_from_kwh

EMISSIONS_PER_KWH = 0.00082


def _apply_filters(query, company_id: int, department_id: Optional[int], device_id: Optional[int], model):
    """
    Shared filter logic for both daily and hourly queries.

    Join path when filtering by department/device:
        EnergyAggDaily/Hourly → Meter → Device → Department (company filter)

    Use Device → Department as the canonical company filter path.
    This keeps trend results aligned with KPI/cost services and works for
    bill-ingested rows that may not have complete Zone/Location linkage.
    """
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
    start_dt = datetime.combine(start, datetime.min.time())
    end_dt = datetime.combine(end + timedelta(days=1), datetime.min.time())

    readings_exist = (
        db.query(func.count(EnergyReading.id))
        .join(Meter, Meter.id == EnergyReading.meter_id)
        .join(Device, Device.id == Meter.device_id)
        .join(Department, Department.id == Device.department_id)
        .filter(
            Department.company_id == company_id,
            EnergyReading.recorded_at >= start_dt,
            EnergyReading.recorded_at < end_dt,
        )
    )

    if department_id:
        readings_exist = readings_exist.filter(Device.department_id == department_id)
    if device_id:
        readings_exist = readings_exist.filter(Meter.device_id == device_id)

    use_readings_source = bool(readings_exist.scalar() or 0)

    if use_readings_source:
        if granularity == "hourly":
            query = (
                db.query(
                    func.date_trunc("hour", EnergyReading.recorded_at).label("timestamp"),
                    func.sum(EnergyReading.reading_kw) / 60.0,
                    func.sum(EnergyReading.reading_kw) / 60.0 * EMISSIONS_PER_KWH,
                    func.max(EnergyReading.reading_kw),
                    func.sum(EnergyReading.reading_kw * 0),
                )
                .join(Meter, Meter.id == EnergyReading.meter_id)
                .join(Device, Device.id == Meter.device_id)
                .join(Department, Department.id == Device.department_id)
                .filter(
                    Department.company_id == company_id,
                    EnergyReading.recorded_at >= start_dt,
                    EnergyReading.recorded_at < end_dt,
                )
            )

            if department_id:
                query = query.filter(Device.department_id == department_id)
            if device_id:
                query = query.filter(Meter.device_id == device_id)

            rows = (
                query
                .group_by(func.date_trunc("hour", EnergyReading.recorded_at))
                .order_by(func.date_trunc("hour", EnergyReading.recorded_at))
                .all()
            )
        else:
            query = (
                db.query(
                    func.date(EnergyReading.recorded_at).label("timestamp"),
                    func.sum(EnergyReading.reading_kw) / 60.0,
                    func.sum(EnergyReading.reading_kw) / 60.0 * EMISSIONS_PER_KWH,
                    func.max(EnergyReading.reading_kw),
                    func.sum(EnergyReading.reading_kw * 0),
                )
                .join(Meter, Meter.id == EnergyReading.meter_id)
                .join(Device, Device.id == Meter.device_id)
                .join(Department, Department.id == Device.department_id)
                .filter(
                    Department.company_id == company_id,
                    EnergyReading.recorded_at >= start_dt,
                    EnergyReading.recorded_at < end_dt,
                )
            )

            if department_id:
                query = query.filter(Device.department_id == department_id)
            if device_id:
                query = query.filter(Meter.device_id == device_id)

            rows = (
                query
                .group_by(func.date(EnergyReading.recorded_at))
                .order_by(func.date(EnergyReading.recorded_at))
                .all()
            )

        return [
            {
                "timestamp": row.timestamp.isoformat(),
                "total_kwh": float(row[1] or 0),
                "total_cost": float(round(cost_from_kwh(float(row[1] or 0)), 2)),
                "total_emissions": float(row[2] or 0),
                "peak_power": float(row[3] or 0),
                "baseline_kwh": float(row[4] or 0),
            }
            for row in rows
        ]

    if granularity == "hourly":
        base_query = db.query(
            EnergyAggHourly.hour_start.label("timestamp"),
            func.sum(EnergyAggHourly.total_kwh).label("total_kwh"),
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
            "total_cost": float(round(cost_from_kwh(float(row.total_kwh or 0)), 2)),
            "total_emissions": float(row.total_emissions or 0),
            "peak_power": float(row.peak_power or 0),
            "baseline_kwh": float(row.baseline_kwh or 0),
        }
        for row in rows
    ]