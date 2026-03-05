from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from models.energy import EnergyReading, EnergyAggHourly, EnergyAggDaily
from models.meter import Meter


# -----------------------------
# Hourly Aggregation
# -----------------------------
def aggregate_hourly(db: Session, start: datetime, end: datetime):

    rows = (
        db.query(
            EnergyReading.meter_id,
            func.date_trunc("hour", EnergyReading.recorded_at).label("hour_start"),
            func.avg(EnergyReading.reading_kw).label("avg_kw"),
            func.max(EnergyReading.reading_kw).label("peak_kw"),
            func.sum(EnergyReading.reading_kw) / 60.0,
        )
        .filter(
            EnergyReading.recorded_at >= start,
            EnergyReading.recorded_at < end,
        )
        .group_by(
            EnergyReading.meter_id,
            func.date_trunc("hour", EnergyReading.recorded_at),
        )
        .all()
    )

    for row in rows:
        db.add(
            EnergyAggHourly(
                meter_id=row.meter_id,
                hour_start=row.hour_start,
                avg_kw=row.avg_kw or 0,
                peak_kw=row.peak_kw or 0,
                total_kwh=row[4] or 0,
            )
        )

    db.commit()


# -----------------------------
# Daily Aggregation
# -----------------------------
def aggregate_daily(db: Session, start: datetime, end: datetime):

    rows = (
        db.query(
            EnergyAggHourly.meter_id,
            func.date(EnergyAggHourly.hour_start).label("date"),
            func.avg(EnergyAggHourly.avg_kw),
            func.max(EnergyAggHourly.peak_kw),
            func.sum(EnergyAggHourly.total_kwh),
        )
        .filter(
            EnergyAggHourly.hour_start >= start,
            EnergyAggHourly.hour_start < end,
        )
        .group_by(
            EnergyAggHourly.meter_id,
            func.date(EnergyAggHourly.hour_start),
        )
        .all()
    )

    for row in rows:
        db.add(
            EnergyAggDaily(
                meter_id=row.meter_id,
                date=row.date,
                avg_kw=row[2] or 0,
                peak_kw=row[3] or 0,
                total_kwh=row[4] or 0,
                baseline_kwh=0,  # can compute smarter later
            )
        )

    db.commit()