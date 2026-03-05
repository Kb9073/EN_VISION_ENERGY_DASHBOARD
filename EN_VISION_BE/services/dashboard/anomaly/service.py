from sqlalchemy.orm import Session
from sqlalchemy import func
from models.energy import EnergyAggDaily
from models.meter import Meter
from models.zone import Zone
from models.location import Location
from models.device import Device
from models.department import Department
from typing import Optional
import statistics


def get_anomalies(
    db: Session,
    company_id: int,
    start,
    end,
    department_id: Optional[int] = None,
    device_id: Optional[int] = None,
    threshold_z: float = 1.5,
):
    """
    Real anomaly detection using Z-score against rolling baseline.
    Returns daily data points flagged as anomalous when deviation
    exceeds threshold_z standard deviations from mean.
    """

    # 1️⃣ Pull daily totals for the period
    query = (
        db.query(
            EnergyAggDaily.date,
            func.sum(EnergyAggDaily.total_kwh).label("actual"),
            func.sum(EnergyAggDaily.baseline_kwh).label("baseline"),
        )
        .join(Meter, EnergyAggDaily.meter_id == Meter.id)
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

    rows = (
        query
        .group_by(EnergyAggDaily.date)
        .order_by(EnergyAggDaily.date)
        .all()
    )

    if not rows:
        return []

    # 2️⃣ Compute Z-score across all daily values
    values = [float(r.actual or 0) for r in rows]

    if len(values) < 2:
        mean = values[0] if values else 0
        std = 0.0
    else:
        mean = statistics.mean(values)
        std = statistics.stdev(values)

    results = []
    for row in rows:
        actual = float(row.actual or 0)
        baseline = float(row.baseline or 0)
        deviation = actual - baseline
        deviation_pct = (
            round((deviation / baseline) * 100, 1)
            if baseline > 0 else 0
        )

        z_score = (actual - mean) / std if std > 0 else 0
        is_anomaly = abs(z_score) > threshold_z

        # Severity based on z-score magnitude
        if abs(z_score) > 3.0:
            severity = "critical"
        elif abs(z_score) > 2.5:
            severity = "high"
        elif abs(z_score) > threshold_z:
            severity = "medium"
        else:
            severity = "low"

        results.append({
            "date": row.date.isoformat(),
            "actual": round(actual, 2),
            "baseline": round(baseline, 2),
            "expected": round(mean, 2),
            "deviation": round(deviation, 2),
            "deviation_percent": deviation_pct,
            "z_score": round(z_score, 2),
            "is_anomaly": is_anomaly,
            "severity": severity if is_anomaly else "normal",
        })

    return results


def get_anomaly_summary(
    db: Session,
    company_id: int,
    start,
    end,
    department_id: Optional[int] = None,
    device_id: Optional[int] = None,
):
    """Returns just the anomalous points for the anomaly feed."""
    all_data = get_anomalies(
        db, company_id, start, end, department_id, device_id
    )
    anomalies = [d for d in all_data if d["is_anomaly"]]
    return {
        "series": all_data,
        "anomalies": anomalies,
        "total_anomalies": len(anomalies),
        "critical_count": sum(1 for a in anomalies if a["severity"] == "critical"),
        "high_count": sum(1 for a in anomalies if a["severity"] == "high"),
    }