from sqlalchemy.orm import Session
from models.energy import EnergyAggDaily


def detect_daily_anomalies(db: Session, threshold_percent: float = 20):

    rows = db.query(EnergyAggDaily).all()

    anomalies = []

    for row in rows:
        if row.baseline_kwh and row.baseline_kwh > 0:
            deviation = row.total_kwh - row.baseline_kwh
            percent = (deviation / row.baseline_kwh) * 100

            if percent > threshold_percent:
                anomalies.append({
                    "meter_id": row.meter_id,
                    "date": row.date,
                    "deviation_percent": round(percent, 2),
                })

    return anomalies