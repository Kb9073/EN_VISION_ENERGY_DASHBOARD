from sqlalchemy.orm import Session
from sqlalchemy import func
from db.analytics_models import DailyEnergySummary
from db.baseline_models import BaselineMetric


def compute_baselines(db: Session):
    """
    Computes baseline energy consumption per device & department.
    """

    results = (
        db.query(
            DailyEnergySummary.department_id,
            DailyEnergySummary.device_id,
            func.avg(DailyEnergySummary.total_kwh).label("baseline_kwh"),
        )
        .group_by(
            DailyEnergySummary.department_id,
            DailyEnergySummary.device_id
        )
        .all()
    )

    # Clear old baselines
    db.query(BaselineMetric).delete()

    for row in results:
        baseline = BaselineMetric(
            department_id=row.department_id,
            device_id=row.device_id,
            baseline_kwh=row.baseline_kwh,
        )
        db.add(baseline)

    db.commit()
