from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from typing import Optional

from models.energy import EnergyAggDaily
from models.meter import Meter
from models.device import Device
from models.department import Department


def _build_cost_query(
    db: Session,
    company_id: int,
    start: date,
    end: date,
    department_id: Optional[int],
    device_id: Optional[int],
):
    """
    Shared base query for cost aggregation.
    Join path: EnergyAggDaily → Meter → Device → Department
    Department.company_id is used as the company filter.
    """
    query = (
        db.query(
            func.coalesce(func.sum(EnergyAggDaily.total_cost), 0).label("total_cost"),
        )
        .join(Meter, Meter.id == EnergyAggDaily.meter_id)
        .join(Device, Device.id == Meter.device_id)
        .join(Department, Department.id == Device.department_id)
        .filter(
            Department.company_id == company_id,
            EnergyAggDaily.date.between(start, end),
        )
    )

    if department_id:
        query = query.filter(Device.department_id == department_id)

    if device_id:
        query = query.filter(Meter.device_id == device_id)

    return query


def get_cost_metrics(
    db: Session,
    company_id: int,
    start: date,
    end: date,
    department_id: Optional[int] = None,
    device_id: Optional[int] = None,
):
    # -----------------------------
    # 1️⃣ Current Period Total Cost
    # -----------------------------
    current_result = _build_cost_query(
        db, company_id, start, end, department_id, device_id
    ).first()

    current_cost = float(current_result.total_cost or 0)

    # -----------------------------
    # 2️⃣ Previous Period Total Cost
    # (same length window shifted back)
    # -----------------------------
    period_days = (end - start).days or 1
    prev_start = start - timedelta(days=period_days)
    prev_end = start

    previous_result = _build_cost_query(
        db, company_id, prev_start, prev_end, department_id, device_id
    ).first()

    previous_cost = float(previous_result.total_cost or 0)

    # -----------------------------
    # 3️⃣ Cost by Device Type
    # Splits total into electricity vs other
    # using device_type on Device model
    # -----------------------------
    type_rows = (
        db.query(
            Device.device_type,
            func.coalesce(func.sum(EnergyAggDaily.total_cost), 0).label("cost"),
        )
        .join(Meter, Meter.id == EnergyAggDaily.meter_id)
        .join(Device, Device.id == Meter.device_id)
        .join(Department, Department.id == Device.department_id)
        .filter(
            Department.company_id == company_id,
            EnergyAggDaily.date.between(start, end),
        )
        .group_by(Device.device_type)
        .all()
    )

    electricity_cost = 0.0
    other_cost = 0.0

    for row in type_rows:
        device_type = (row.device_type or "").lower()
        if "electric" in device_type or "hvac" in device_type or "light" in device_type:
            electricity_cost += float(row.cost or 0)
        else:
            other_cost += float(row.cost or 0)

    # If no device_type breakdown available, split proportionally
    if electricity_cost == 0 and other_cost == 0 and current_cost > 0:
        electricity_cost = round(current_cost * 0.71, 2)
        other_cost = round(current_cost * 0.29, 2)

    # -----------------------------
    # 4️⃣ Delta Calculation
    # -----------------------------
    def percent_delta(current_val: float, previous_val: float) -> float:
        if previous_val == 0:
            return 0.0
        return round(((current_val - previous_val) / previous_val) * 100, 2)

    cost_change_percent = percent_delta(current_cost, previous_cost)

    # -----------------------------
    # 5️⃣ Month Labels
    # -----------------------------
    current_month = end.strftime("%b")
    previous_month = prev_end.strftime("%b")

    return {
        "total_cost": round(current_cost, 2),
        "electricity_cost": round(electricity_cost, 2),
        "other_cost": round(other_cost, 2),
        "previous_cost": round(previous_cost, 2),
        "current_cost": round(current_cost, 2),
        "previous_month": previous_month,
        "current_month": current_month,
        "cost_change_percent": cost_change_percent,
    }