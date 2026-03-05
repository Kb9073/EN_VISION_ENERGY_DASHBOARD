from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import timedelta
from models.energy import EnergyAggDaily


def simple_daily_forecast(db: Session, meter_id: int, days_ahead: int = 7):

    recent_avg = (
        db.query(func.avg(EnergyAggDaily.total_kwh))
        .filter(EnergyAggDaily.meter_id == meter_id)
        .scalar()
    )

    if not recent_avg:
        return []

    forecasts = []

    last_date = (
        db.query(func.max(EnergyAggDaily.date))
        .filter(EnergyAggDaily.meter_id == meter_id)
        .scalar()
    )

    for i in range(1, days_ahead + 1):
        forecasts.append({
            "date": last_date + timedelta(days=i),
            "predicted_kwh": float(recent_avg),
        })

    return forecasts