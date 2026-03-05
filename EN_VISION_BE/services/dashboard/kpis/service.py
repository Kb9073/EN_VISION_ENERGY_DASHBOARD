from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date, timedelta

from models.energy import EnergyAggDaily
from models.device import Device
from models.department import Department
from models.meter import Meter
from models.carbon import CarbonEmission


def calculate_kpis(
    db: Session,
    company_id: int,
    start: date,
    end: date,
    department_id: Optional[int] = None,
    device_id: Optional[int] = None,
):

    # -----------------------------
    # 1️⃣ Current Period Aggregation
    # -----------------------------

    current_query = (
        db.query(
            func.coalesce(func.sum(EnergyAggDaily.total_kwh), 0).label("total_kwh"),
            func.coalesce(func.sum(EnergyAggDaily.total_cost), 0).label("total_cost"),
            func.coalesce(func.sum(EnergyAggDaily.total_emissions), 0).label("total_emissions"),
            func.avg(EnergyAggDaily.avg_kw).label("avg_load"),
            func.max(EnergyAggDaily.peak_kw).label("peak_load"),
        )
        .join(Meter)
        .join(Device)
        .join(Department)
        .filter(
            Department.company_id == company_id,
            EnergyAggDaily.date.between(start, end),
        )
    )

    if department_id:
        current_query = current_query.filter(Device.department_id == department_id)

    if device_id:
        current_query = current_query.filter(Meter.device_id == device_id)

    current = current_query.first()

    total_kwh = float(current.total_kwh or 0)
    total_cost = float(current.total_cost or 0)
    total_emissions = float(current.total_emissions or 0)

    # -----------------------------
    # 2️⃣ Previous Period
    # -----------------------------

    period_length = (end - start).days
    previous_start = start - timedelta(days=period_length)
    previous_end = start

    previous_query = (
        db.query(
            func.coalesce(func.sum(EnergyAggDaily.total_kwh), 0).label("total_kwh"),
            func.coalesce(func.sum(EnergyAggDaily.total_emissions), 0).label("total_emissions"),
        )
        .join(Meter)
        .join(Device)
        .join(Department)
        .filter(
            Department.company_id == company_id,
            EnergyAggDaily.date.between(previous_start, previous_end),
        )
    )

    if department_id:
        previous_query = previous_query.filter(Device.department_id == department_id)

    if device_id:
        previous_query = previous_query.filter(Meter.device_id == device_id)

    previous = previous_query.first()

    prev_kwh = float(previous.total_kwh or 0)
    prev_emissions = float(previous.total_emissions or 0)

    # -----------------------------
    # 3️⃣ Delta Calculations
    # -----------------------------

    def percent_delta(current_val, previous_val):
        if previous_val == 0:
            return 0
        return round(((current_val - previous_val) / previous_val) * 100, 2)

    kwh_delta = percent_delta(total_kwh, prev_kwh)
    emissions_delta = percent_delta(total_emissions, prev_emissions)

    # -----------------------------
    # 4️⃣ Carbon Total (Tonnes)
    # -----------------------------

    carbon_query = (
        db.query(func.coalesce(func.sum(CarbonEmission.emissions_tco2e), 0))
        .filter(
            CarbonEmission.company_id == company_id,
            CarbonEmission.recorded_at.between(start, end),
        )
    )

    carbon_total = carbon_query.scalar()

    # -----------------------------
    # 5️⃣ Final Response
    # -----------------------------

    return {
        "totalEnergyConsumption": {
            "value": round(total_kwh, 2),
            "unit": "kWh",
            "delta": kwh_delta,
            "period": f"{start} to {end}",
        },
        "energySaved": {
            "value": round(max(0, prev_kwh - total_kwh), 2),
            "unit": "kWh",
            "delta": kwh_delta,
        },
        "overConsumptionPercent": {
            "value": 0,
            "unit": "%",
            "delta": 0,
        },
        "co2Emissions": {
            "value": round(float(carbon_total or 0), 2),
            "unit": "tCO₂e",
            "delta": emissions_delta,
        },
        "avgConsumption": round(float(current.avg_load or 0), 2),
        "peakConsumption": round(float(current.peak_load or 0), 2),
        "totalCost": round(total_cost, 2),
        "systemStatus": "stable" if kwh_delta < 10 else "at-risk",
        "sustainabilityStatus": "on-track",
    }