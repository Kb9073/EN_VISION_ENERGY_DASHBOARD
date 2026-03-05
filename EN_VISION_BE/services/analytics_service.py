from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from db.models import EnergyEvent
from db.analytics_models import DailyEnergySummary


def compute_daily_energy_summary(db: Session):
    """
    Aggregates raw energy events into daily summaries.
    """

    results = (
        db.query(
            cast(EnergyEvent.timestamp, Date).label("date"),
            EnergyEvent.department_id,
            EnergyEvent.device_id,
            func.sum(EnergyEvent.kwh).label("total_kwh"),
            func.avg(EnergyEvent.kwh).label("avg_kwh"),
            func.max(EnergyEvent.kwh).label("peak_kwh"),
        )
        .group_by(
            cast(EnergyEvent.timestamp, Date),
            EnergyEvent.department_id,
            EnergyEvent.device_id,
        )
        .all()
    )

    # Clear old summaries (rebuildable table)
    db.query(DailyEnergySummary).delete()

    for row in results:
        summary = DailyEnergySummary(
            date=row.date,
            department_id=row.department_id,
            device_id=row.device_id,
            total_kwh=row.total_kwh,
            avg_kwh=row.avg_kwh,
            peak_kwh=row.peak_kwh,
        )
        db.add(summary)

    db.commit()
