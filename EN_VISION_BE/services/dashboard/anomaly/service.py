from sqlalchemy.orm import Session
from sqlalchemy import func, literal
from models.energy import EnergyAggDaily
from models.energy import EnergyReading
from models.meter import Meter
from models.zone import Zone
from models.device import Device
from models.department import Department
from typing import Optional
import statistics
from datetime import datetime, timedelta


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

    if department_id is not None:
        query = query.filter(Device.department_id == department_id)
    if device_id is not None:
        query = query.filter(Meter.device_id == device_id)

    rows = (
        query
        .group_by(EnergyAggDaily.date)
        .order_by(EnergyAggDaily.date)
        .all()
    )

    using_readings_fallback = False
    if not rows:
        using_readings_fallback = True
        start_dt = datetime.combine(start, datetime.min.time())
        end_dt = datetime.combine(end + timedelta(days=1), datetime.min.time())

        rows = (
            db.query(
                func.date(EnergyReading.recorded_at).label("date"),
                (func.sum(EnergyReading.reading_kw) / 60.0).label("actual"),
                literal(0.0).label("baseline"),
            )
            .join(Meter, EnergyReading.meter_id == Meter.id)
            .join(Device, Device.id == Meter.device_id)
            .join(Department, Department.id == Device.department_id)
            .filter(
                Department.company_id == company_id,
                EnergyReading.recorded_at >= start_dt,
                EnergyReading.recorded_at < end_dt,
            )
        )

        if department_id is not None:
            rows = rows.filter(Device.department_id == department_id)
        if device_id is not None:
            rows = rows.filter(Meter.device_id == device_id)

        rows = (
            rows
            .group_by(func.date(EnergyReading.recorded_at))
            .order_by(func.date(EnergyReading.recorded_at))
            .all()
        )

    if not rows:
        return []

    if using_readings_fallback:
        enriched = []
        for idx, row in enumerate(rows):
            actual = float(row.actual or 0)
            history = [float(prev.actual or 0) for prev in rows[max(0, idx - 7):idx]]
            baseline = statistics.mean(history) if history else actual
            enriched.append({"date": row.date, "actual": actual, "baseline": baseline})
    else:
        enriched = [
            {
                "date": row.date,
                "actual": float(row.actual or 0),
                "baseline": float(row.baseline or 0),
            }
            for row in rows
        ]

    # 1b) Attribution by date: pick the device/zone/department with the
    # largest absolute daily deviation for each date.
    if using_readings_fallback:
        start_dt = datetime.combine(start, datetime.min.time())
        end_dt = datetime.combine(end + timedelta(days=1), datetime.min.time())
        source_rows = (
            db.query(
                func.date(EnergyReading.recorded_at).label("date"),
                Device.id.label("device_id"),
                Zone.id.label("zone_id"),
                Department.id.label("department_id"),
                Device.name.label("device_name"),
                Zone.name.label("zone_name"),
                Department.name.label("department_name"),
                (func.sum(EnergyReading.reading_kw) / 60.0).label("actual"),
                literal(0.0).label("baseline"),
            )
            .join(Meter, EnergyReading.meter_id == Meter.id)
            .join(Device, Device.id == Meter.device_id)
            .join(Department, Department.id == Device.department_id)
            .join(Zone, Zone.id == Meter.zone_id)
            .filter(
                Department.company_id == company_id,
                EnergyReading.recorded_at >= start_dt,
                EnergyReading.recorded_at < end_dt,
            )
        )
    else:
        source_rows = (
            db.query(
                EnergyAggDaily.date.label("date"),
                Device.id.label("device_id"),
                Zone.id.label("zone_id"),
                Department.id.label("department_id"),
                Device.name.label("device_name"),
                Zone.name.label("zone_name"),
                Department.name.label("department_name"),
                func.sum(EnergyAggDaily.total_kwh).label("actual"),
                func.sum(EnergyAggDaily.baseline_kwh).label("baseline"),
            )
            .join(Meter, EnergyAggDaily.meter_id == Meter.id)
            .join(Device, Device.id == Meter.device_id)
            .join(Department, Department.id == Device.department_id)
            .join(Zone, Zone.id == Meter.zone_id)
            .filter(
                Department.company_id == company_id,
                EnergyAggDaily.date.between(start, end),
            )
        )

    if department_id is not None:
        source_rows = source_rows.filter(Device.department_id == department_id)
    if device_id is not None:
        source_rows = source_rows.filter(Meter.device_id == device_id)

    source_date_group = func.date(EnergyReading.recorded_at) if using_readings_fallback else EnergyAggDaily.date
    source_rows = (
        source_rows
        .group_by(
            source_date_group,
            Device.id,
            Zone.id,
            Department.id,
            Device.name,
            Zone.name,
            Department.name,
        )
        .all()
    )

    source_by_date = {}
    for row in source_rows:
        actual = float(row.actual or 0)
        baseline = float(row.baseline or 0)
        score = abs(actual - baseline)
        current = source_by_date.get(row.date)
        if not current or score > current["score"]:
            source_by_date[row.date] = {
                "score": score,
                "source_device_id": row.device_id,
                "source_zone_id": row.zone_id,
                "source_department_id": row.department_id,
                "source_device": row.device_name,
                "source_zone": row.zone_name,
                "source_department": row.department_name,
            }

    # If a specific device is selected, pin source attribution to that
    # device context so UI never displays another device for filtered results.
    selected_device_source = None
    if device_id is not None:
        selected_device_row = (
            db.query(
                Device.id.label("device_id"),
                Zone.id.label("zone_id"),
                Department.id.label("department_id"),
                Device.name.label("device_name"),
                Zone.name.label("zone_name"),
                Department.name.label("department_name"),
            )
            .join(Meter, Meter.device_id == Device.id)
            .join(Zone, Zone.id == Meter.zone_id)
            .join(Department, Department.id == Device.department_id)
            .filter(
                Department.company_id == company_id,
                Device.id == device_id,
            )
            .order_by(Meter.id.asc())
            .first()
        )
        if selected_device_row:
            selected_device_source = {
                "source_device_id": selected_device_row.device_id,
                "source_zone_id": selected_device_row.zone_id,
                "source_department_id": selected_device_row.department_id,
                "source_device": selected_device_row.device_name,
                "source_zone": selected_device_row.zone_name,
                "source_department": selected_device_row.department_name,
            }

    # 2️⃣ Compute Z-score on residuals (actual - baseline) so anomaly scoring
    # reflects deviation from expected behavior for the selected scope.
    values = [point["actual"] - point["baseline"] for point in enriched]

    if len(values) < 2:
        mean = values[0] if values else 0
        std = 0.0
    else:
        mean = statistics.mean(values)
        std = statistics.stdev(values)

    results = []
    for point in enriched:
        actual = point["actual"]
        baseline = point["baseline"]
        deviation = actual - baseline
        deviation_pct = (
            round((deviation / baseline) * 100, 1)
            if baseline > 0 else 0
        )

        z_score = (deviation - mean) / std if std > 0 else 0
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

        source = selected_device_source or source_by_date.get(point["date"], {})

        results.append({
            "date": point["date"].isoformat(),
            "actual": round(actual, 2),
            "baseline": round(baseline, 2),
            "expected": round(baseline, 2),
            "deviation": round(deviation, 2),
            "deviation_percent": deviation_pct,
            "z_score": round(z_score, 2),
            "is_anomaly": is_anomaly,
            "severity": severity if is_anomaly else "normal",
            "source_device_id": source.get("source_device_id"),
            "source_zone_id": source.get("source_zone_id"),
            "source_department_id": source.get("source_department_id"),
            "source_device": source.get("source_device"),
            "source_zone": source.get("source_zone"),
            "source_department": source.get("source_department"),
        })

    return results


def get_any_device_anomaly_days(
    db: Session,
    company_id: int,
    start,
    end,
    department_id: Optional[int] = None,
    device_id: Optional[int] = None,
    threshold_z: float = 1.5,
):
    """Count unique days where at least one in-scope device is anomalous."""

    query = (
        db.query(
            EnergyAggDaily.date.label("date"),
            Device.id.label("device_id"),
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

    if department_id is not None:
        query = query.filter(Device.department_id == department_id)
    if device_id is not None:
        query = query.filter(Device.id == device_id)

    rows = (
        query
        .group_by(EnergyAggDaily.date, Device.id)
        .order_by(EnergyAggDaily.date)
        .all()
    )

    if not rows:
        start_dt = datetime.combine(start, datetime.min.time())
        end_dt = datetime.combine(end + timedelta(days=1), datetime.min.time())
        rows = (
            db.query(
                func.date(EnergyReading.recorded_at).label("date"),
                Device.id.label("device_id"),
                (func.sum(EnergyReading.reading_kw) / 60.0).label("actual"),
                literal(0.0).label("baseline"),
            )
            .join(Meter, EnergyReading.meter_id == Meter.id)
            .join(Device, Device.id == Meter.device_id)
            .join(Department, Department.id == Device.department_id)
            .filter(
                Department.company_id == company_id,
                EnergyReading.recorded_at >= start_dt,
                EnergyReading.recorded_at < end_dt,
            )
        )

        if department_id is not None:
            rows = rows.filter(Device.department_id == department_id)
        if device_id is not None:
            rows = rows.filter(Device.id == device_id)

        rows = (
            rows
            .group_by(func.date(EnergyReading.recorded_at), Device.id)
            .order_by(func.date(EnergyReading.recorded_at))
            .all()
        )

    if not rows:
        return 0

    per_device = {}
    for row in rows:
        deviation = float((row.actual or 0) - (row.baseline or 0))
        per_device.setdefault(row.device_id, []).append((row.date, deviation))

    anomaly_days = set()
    for _device, series in per_device.items():
        values = [v for _, v in series]

        if len(values) < 2:
            continue

        mean = statistics.mean(values)
        std = statistics.stdev(values)
        if std <= 0:
            continue

        for day, deviation in series:
            z_score = (deviation - mean) / std
            if abs(z_score) > threshold_z:
                anomaly_days.add(day)

    return len(anomaly_days)


def get_anomaly_summary(
    db: Session,
    company_id: int,
    start,
    end,
    department_id: Optional[int] = None,
    device_id: Optional[int] = None,
    threshold_z: float = 1.5,
):
    """Returns just the anomalous points for the anomaly feed."""
    all_data = get_anomalies(
        db, company_id, start, end, department_id, device_id, threshold_z
    )
    anomalies = [d for d in all_data if d["is_anomaly"]]
    any_device_anomaly_days = get_any_device_anomaly_days(
        db=db,
        company_id=company_id,
        start=start,
        end=end,
        department_id=department_id,
        device_id=device_id,
        threshold_z=threshold_z,
    )

    scope = {
        "department_id": department_id,
        "department_name": None,
        "device_id": device_id,
        "device_name": None,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
    }

    if department_id is not None:
        department_row = (
            db.query(Department.name)
            .filter(
                Department.id == department_id,
                Department.company_id == company_id,
            )
            .first()
        )
        if department_row:
            scope["department_name"] = department_row[0]

    if device_id is not None:
        device_row = (
            db.query(Device.name)
            .join(Department, Department.id == Device.department_id)
            .filter(
                Device.id == device_id,
                Department.company_id == company_id,
            )
            .first()
        )
        if device_row:
            scope["device_name"] = device_row[0]

    return {
        "series": all_data,
        "anomalies": anomalies,
        "total_anomalies": len(anomalies),
        "any_device_anomaly_days": any_device_anomaly_days,
        "critical_count": sum(1 for a in anomalies if a["severity"] == "critical"),
        "high_count": sum(1 for a in anomalies if a["severity"] == "high"),
        "applied_scope": scope,
    }