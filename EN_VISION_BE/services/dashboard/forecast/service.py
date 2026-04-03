from sqlalchemy.orm import Session
from sqlalchemy import func
from models.energy import EnergyAggDaily
from models.meter import Meter
from models.zone import Zone
from models.location import Location
from datetime import timedelta
from typing import Optional
import statistics
from utils.tariff import cost_from_kwh


def get_forecast(
    db: Session,
    company_id: int,
    horizon_days: int = 7,
):
    """
    Rolling weighted average forecast.
    Uses last 30 days of actuals to forecast next horizon_days.
    Weights recent data more heavily (exponential decay).
    """

    # Pull last 30 days of actual data
    last_date = (
        db.query(func.max(EnergyAggDaily.date))
        .join(Meter, EnergyAggDaily.meter_id == Meter.id)
        .join(Zone, Zone.id == Meter.zone_id)
        .join(Location, Location.id == Zone.location_id)
        .filter(Location.company_id == company_id)
        .scalar()
    )

    if not last_date:
        return {"historical": [], "forecast": [], "summary": {}}

    lookback_start = last_date - timedelta(days=30)

    historical_rows = (
        db.query(
            EnergyAggDaily.date,
            func.sum(EnergyAggDaily.total_kwh).label("total_kwh"),
            func.sum(EnergyAggDaily.total_emissions).label("total_emissions"),
            func.sum(EnergyAggDaily.baseline_kwh).label("baseline_kwh"),
        )
        .join(Meter, EnergyAggDaily.meter_id == Meter.id)
        .join(Zone, Zone.id == Meter.zone_id)
        .join(Location, Location.id == Zone.location_id)
        .filter(
            Location.company_id == company_id,
            EnergyAggDaily.date.between(lookback_start, last_date),
        )
        .group_by(EnergyAggDaily.date)
        .order_by(EnergyAggDaily.date)
        .all()
    )

    if not historical_rows:
        return {"historical": [], "forecast": [], "summary": {}}

    historical = [
        {
            "date": row.date.isoformat(),
            "actual_kwh": round(float(row.total_kwh or 0), 2),
            "actual_cost": round(cost_from_kwh(float(row.total_kwh or 0)), 2),
            "actual_emissions": round(float(row.total_emissions or 0), 2),
            "baseline_kwh": round(float(row.baseline_kwh or 0), 2),
            "is_forecast": False,
        }
        for row in historical_rows
    ]

    # Weighted average — more recent days get higher weight
    kwh_values = [h["actual_kwh"] for h in historical]
    cost_values = [h["actual_cost"] for h in historical]
    emission_values = [h["actual_emissions"] for h in historical]

    n = len(kwh_values)
    weights = [0.5 ** (n - 1 - i) for i in range(n)]
    total_weight = sum(weights)

    avg_kwh = sum(w * v for w, v in zip(weights, kwh_values)) / total_weight
    avg_cost = sum(w * v for w, v in zip(weights, cost_values)) / total_weight
    avg_emissions = sum(w * v for w, v in zip(weights, emission_values)) / total_weight

    # Compute trend (slope over last 7 days)
    recent = kwh_values[-7:] if len(kwh_values) >= 7 else kwh_values
    if len(recent) >= 2:
        slope = (recent[-1] - recent[0]) / len(recent)
    else:
        slope = 0

    # Cap slope to avoid runaway forecasts
    max_slope = avg_kwh * 0.05
    slope = max(-max_slope, min(max_slope, slope))

    # Std dev for confidence interval
    std_kwh = statistics.stdev(kwh_values) if len(kwh_values) > 1 else avg_kwh * 0.1

    forecast = []
    for i in range(1, horizon_days + 1):
        forecast_date = last_date + timedelta(days=i)
        predicted = max(0, avg_kwh + slope * i)
        predicted_cost = max(0, avg_cost + (avg_cost / avg_kwh * slope * i if avg_kwh > 0 else 0))
        predicted_emissions = max(0, avg_emissions + (avg_emissions / avg_kwh * slope * i if avg_kwh > 0 else 0))

        forecast.append({
            "date": forecast_date.isoformat(),
            "predicted_kwh": round(predicted, 2),
            "predicted_cost": round(predicted_cost, 2),
            "predicted_emissions": round(predicted_emissions, 2),
            "lower_bound": round(max(0, predicted - std_kwh), 2),
            "upper_bound": round(predicted + std_kwh, 2),
            "is_forecast": True,
        })

    total_forecast_kwh = sum(f["predicted_kwh"] for f in forecast)
    total_forecast_cost = sum(f["predicted_cost"] for f in forecast)
    total_forecast_emissions = sum(f["predicted_emissions"] for f in forecast)

    return {
        "historical": historical,
        "forecast": forecast,
        "summary": {
            "horizon_days": horizon_days,
            "total_predicted_kwh": round(total_forecast_kwh, 2),
            "total_predicted_cost": round(total_forecast_cost, 2),
            "total_predicted_emissions": round(total_forecast_emissions, 2),
            "avg_daily_kwh": round(avg_kwh, 2),
            "trend_direction": "up" if slope > 0 else "down" if slope < 0 else "stable",
        },
    }