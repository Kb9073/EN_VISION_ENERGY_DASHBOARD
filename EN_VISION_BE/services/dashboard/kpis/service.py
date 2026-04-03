from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date, datetime, timedelta

from models.energy import EnergyAggDaily, EnergyReading
from models.device import Device
from models.department import Department
from models.meter import Meter
from models.carbon import CarbonEmission
from utils.tariff import cost_from_kwh

EMISSIONS_PER_KWH = 0.00082


def _readings_window_summary(
    db: Session,
    company_id: int,
    start: date,
    end: date,
    department_id: Optional[int] = None,
    device_id: Optional[int] = None,
):
    start_dt = datetime.combine(start, datetime.min.time())
    end_dt = datetime.combine(end + timedelta(days=1), datetime.min.time())

    query = (
        db.query(
            func.coalesce(func.sum(EnergyReading.reading_kw) / 60.0, 0).label("total_kwh"),
            func.avg(EnergyReading.reading_kw).label("avg_load"),
            func.max(EnergyReading.reading_kw).label("peak_load"),
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

    row = query.first()
    total_kwh = float(row.total_kwh or 0)
    return {
        "total_kwh": total_kwh,
        "total_emissions": total_kwh * EMISSIONS_PER_KWH,
        "avg_load": float(row.avg_load or 0),
        "peak_load": float(row.peak_load or 0),
    }


def _has_readings_in_window(
    db: Session,
    company_id: int,
    start: date,
    end: date,
    department_id: Optional[int] = None,
    device_id: Optional[int] = None,
) -> bool:
    start_dt = datetime.combine(start, datetime.min.time())
    end_dt = datetime.combine(end + timedelta(days=1), datetime.min.time())

    query = (
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
        query = query.filter(Device.department_id == department_id)
    if device_id:
        query = query.filter(Meter.device_id == device_id)

    return bool(query.scalar() or 0)


def calculate_kpis(
    db: Session,
    company_id: int,
    start: date,
    end: date,
    department_id: Optional[int] = None,
    device_id: Optional[int] = None,
):
    use_readings_source = _has_readings_in_window(
        db=db,
        company_id=company_id,
        start=start,
        end=end,
        department_id=department_id,
        device_id=device_id,
    )

    # -----------------------------
    # 1️⃣ Current Period Aggregation
    # -----------------------------

    if use_readings_source:
        current = _readings_window_summary(
            db=db,
            company_id=company_id,
            start=start,
            end=end,
            department_id=department_id,
            device_id=device_id,
        )
        total_baseline = 0.0
    else:
        current_query = (
            db.query(
                func.coalesce(func.sum(EnergyAggDaily.total_kwh), 0).label("total_kwh"),
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

        current_row = current_query.first()
        current = {
            "total_kwh": float(current_row.total_kwh or 0),
            "total_emissions": float(current_row.total_emissions or 0),
            "avg_load": float(current_row.avg_load or 0),
            "peak_load": float(current_row.peak_load or 0),
        }

        baseline_query = (
            db.query(
                func.coalesce(func.sum(EnergyAggDaily.baseline_kwh), 0).label("baseline_kwh"),
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
            baseline_query = baseline_query.filter(Device.department_id == department_id)

        if device_id:
            baseline_query = baseline_query.filter(Meter.device_id == device_id)

        baseline_result = baseline_query.first()
        total_baseline = float(baseline_result.baseline_kwh or 0)

    total_kwh = float(current["total_kwh"] or 0)
    total_cost = cost_from_kwh(total_kwh)
    total_emissions = float(current["total_emissions"] or 0)

    # -----------------------------
    # 2️⃣ Previous Period
    # -----------------------------

    period_days = (end - start).days + 1
    previous_end = start - timedelta(days=1)
    previous_start = previous_end - timedelta(days=period_days - 1)

    if use_readings_source:
        previous = _readings_window_summary(
            db=db,
            company_id=company_id,
            start=previous_start,
            end=previous_end,
            department_id=department_id,
            device_id=device_id,
        )
        prev_kwh = float(previous["total_kwh"] or 0)
        prev_emissions = float(previous["total_emissions"] or 0)
    else:
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
    # 3b. Overconsumption vs Baseline
    # -----------------------------

    # Overconsumption %: how far actual is above baseline for the period
    if total_baseline > 0:
        over_pct = round(((total_kwh - total_baseline) / total_baseline) * 100, 2)
    else:
        # Fallback: compare to previous period if no baseline data
        over_pct = round(percent_delta(total_kwh, prev_kwh), 2) if prev_kwh > 0 else 0.0

    # Delta for overconsumption: compare current over_pct vs previous period's over_pct
    # (If baseline covers the whole DB, previous period would have same baseline density; approximate as 0)
    over_pct_delta = 0.0

    # Energy saved: kWh below baseline (positive = savings, 0 when over-consuming)
    if total_baseline > 0:
        energy_saved = max(0.0, round(total_baseline - total_kwh, 2))
        # delta for energy saved: negative kwh_delta means consumption fell → good
        energy_saved_delta = round(-kwh_delta, 2)
    else:
        energy_saved = max(0.0, round(prev_kwh - total_kwh, 2))
        energy_saved_delta = round(-kwh_delta, 2)

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
            "value": energy_saved,
            "unit": "kWh",
            "delta": energy_saved_delta,
        },
        "overConsumptionPercent": {
            "value": over_pct,
            "unit": "%",
            "delta": over_pct_delta,
        },
        "co2Emissions": {
            "value": round(float(carbon_total or 0), 2),
            "unit": "tCO₂e",
            "delta": emissions_delta,
        },
        "avgConsumption": round(float(current["avg_load"] or 0), 2),
        "peakConsumption": round(float(current["peak_load"] or 0), 2),
        "totalCost": round(total_cost, 2),
        "systemStatus": "stable" if kwh_delta < 10 else "at-risk",
        "sustainabilityStatus": "on-track",
    }