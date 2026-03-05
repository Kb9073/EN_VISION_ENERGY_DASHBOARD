from sqlalchemy.orm import Session
from sqlalchemy import func
from models.energy import EnergyAggDaily
from models.meter import Meter
from models.zone import Zone
from models.location import Location
from models.device import Device
from models.department import Department
from datetime import timedelta
from typing import Optional
import statistics


def generate_ai_insights(
    db: Session,
    company_id: int,
    start,
    end,
    department_id: Optional[int] = None,
    device_id: Optional[int] = None,
):
    """
    Rule-based AI insights engine.
    Analyzes real energy data and generates contextual insights.
    No external API needed.
    """

    insights = []

    # ── 1. Trend Analysis ──────────────────────────────
    daily_rows = (
        db.query(
            EnergyAggDaily.date,
            func.sum(EnergyAggDaily.total_kwh).label("kwh"),
            func.sum(EnergyAggDaily.baseline_kwh).label("baseline"),
            func.sum(EnergyAggDaily.total_cost).label("cost"),
        )
        .join(Meter, EnergyAggDaily.meter_id == Meter.id)
        .join(Device, Device.id == Meter.device_id)
        .join(Department, Department.id == Device.department_id)
        .filter(
            Department.company_id == company_id,
            EnergyAggDaily.date.between(start, end),
        )
        .group_by(EnergyAggDaily.date)
        .order_by(EnergyAggDaily.date)
        .all()
    )

    if not daily_rows:
        return []

    kwh_values = [float(r.kwh or 0) for r in daily_rows]
    baseline_values = [float(r.baseline or 0) for r in daily_rows]
    total_kwh = sum(kwh_values)
    total_baseline = sum(baseline_values)
    avg_kwh = statistics.mean(kwh_values) if kwh_values else 0

    # ── 2. Overconsumption Check ──────────────────────
    if total_baseline > 0:
        over_pct = ((total_kwh - total_baseline) / total_baseline) * 100
        if over_pct > 15:
            insights.append({
                "title": "High Overconsumption Detected",
                "description": f"Energy usage is {over_pct:.1f}% above baseline for this period. Consider auditing high-load zones.",
                "severity": "high",
                "category": "efficiency",
            })
        elif over_pct > 5:
            insights.append({
                "title": "Moderate Overconsumption",
                "description": f"Usage is {over_pct:.1f}% above baseline. Monitor peak-hour devices.",
                "severity": "medium",
                "category": "efficiency",
            })
        elif over_pct < -10:
            insights.append({
                "title": "Energy Savings Achieved",
                "description": f"Usage is {abs(over_pct):.1f}% below baseline — strong efficiency performance.",
                "severity": "low",
                "category": "sustainability",
            })

    # ── 3. Trend Direction ────────────────────────────
    if len(kwh_values) >= 3:
        recent_avg = statistics.mean(kwh_values[-3:])
        earlier_avg = statistics.mean(kwh_values[:3])
        trend_pct = ((recent_avg - earlier_avg) / earlier_avg * 100) if earlier_avg > 0 else 0

        if trend_pct > 10:
            insights.append({
                "title": "Rising Consumption Trend",
                "description": f"Energy usage has increased {trend_pct:.1f}% from start to end of period. Investigate escalating loads.",
                "severity": "medium",
                "category": "trend",
            })
        elif trend_pct < -10:
            insights.append({
                "title": "Consumption Declining",
                "description": f"Usage has dropped {abs(trend_pct):.1f}% across the period — efficiency measures may be working.",
                "severity": "low",
                "category": "trend",
            })

    # ── 4. Peak Spike Detection ───────────────────────
    if len(kwh_values) >= 2:
        std = statistics.stdev(kwh_values)
        mean = statistics.mean(kwh_values)
        spikes = [v for v in kwh_values if v > mean + 2 * std]
        if spikes:
            insights.append({
                "title": f"{len(spikes)} Consumption Spike{'s' if len(spikes) > 1 else ''} Detected",
                "description": f"Peak value was {max(spikes):.0f} kWh — {((max(spikes) - mean) / mean * 100):.0f}% above average. Review scheduling for heavy loads.",
                "severity": "high" if len(spikes) > 2 else "medium",
                "category": "anomaly",
            })

    # ── 5. Top Zone ───────────────────────────────────
    zone_rows = (
        db.query(
            Zone.name,
            func.sum(EnergyAggDaily.total_kwh).label("kwh"),
        )
        .join(Meter, EnergyAggDaily.meter_id == Meter.id)
        .join(Zone, Meter.zone_id == Zone.id)
        .join(Location, Zone.location_id == Location.id)
        .filter(
            Location.company_id == company_id,
            EnergyAggDaily.date.between(start, end),
        )
        .group_by(Zone.name)
        .order_by(func.sum(EnergyAggDaily.total_kwh).desc())
        .limit(1)
        .first()
    )

    if zone_rows and total_kwh > 0:
        zone_pct = (float(zone_rows.kwh or 0) / total_kwh) * 100
        if zone_pct > 40:
            insights.append({
                "title": f"{zone_rows.name} Dominates Consumption",
                "description": f"This zone accounts for {zone_pct:.1f}% of total energy. Consider load balancing or efficiency upgrades.",
                "severity": "medium",
                "category": "zone",
            })

    # ── 6. Carbon Insight ─────────────────────────────
    carbon_rows = (
        db.query(
            func.sum(EnergyAggDaily.total_emissions).label("emissions")
        )
        .join(Meter, EnergyAggDaily.meter_id == Meter.id)
        .join(Device, Device.id == Meter.device_id)
        .join(Department, Department.id == Device.department_id)
        .filter(
            Department.company_id == company_id,
            EnergyAggDaily.date.between(start, end),
        )
        .first()
    )

    emissions = float(carbon_rows.emissions or 0) if carbon_rows else 0
    if emissions > 0 and total_kwh > 0:
        intensity = emissions / total_kwh * 1000
        if intensity > 300:
            insights.append({
                "title": "High Carbon Intensity",
                "description": f"Carbon intensity is {intensity:.0f}g CO₂/kWh — above typical targets. Review renewable sourcing options.",
                "severity": "high",
                "category": "carbon",
            })
        elif intensity < 150:
            insights.append({
                "title": "Low Carbon Intensity",
                "description": f"Carbon intensity of {intensity:.0f}g CO₂/kWh is excellent — on track with sustainability goals.",
                "severity": "low",
                "category": "carbon",
            })

    # Add timestamps
    from datetime import datetime
    for i, insight in enumerate(insights):
        insight["id"] = f"insight-{i}"
        insight["timestamp"] = datetime.utcnow().isoformat()

    return insights[:5]  # Cap at 5 insights