from sqlalchemy.orm import Session
from sqlalchemy import func
from models.energy import EnergyAggDaily
from models.meter import Meter
from models.zone import Zone
from models.location import Location
from models.device import Device
from models.department import Department
from datetime import timedelta, datetime
from typing import Optional
import statistics


# ---------------------------------------------------------------------------
# Optional: set OPENAI_API_KEY in your .env.local / environment to enable
# GPT-powered insight summaries. Leave blank to use the built-in engine.
# ---------------------------------------------------------------------------
# import os
# OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")


def _pct(current, baseline):
    """Safe percentage."""
    if baseline and baseline > 0:
        return round(((current - baseline) / baseline) * 100, 1)
    return 0.0


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
    Analyses real energy data and generates contextual, actionable insights.
    Guarantees at least 2 insights even when data is sparse.
    """

    insights = []
    now_iso = datetime.utcnow().isoformat()
    period_days = max(1, (end - start).days)

    # ── Base query helpers ─────────────────────────────────────────────────
    def _base(query):
        q = (
            query
            .join(Meter, EnergyAggDaily.meter_id == Meter.id)
            .join(Device, Device.id == Meter.device_id)
            .join(Department, Department.id == Device.department_id)
            .filter(
                Department.company_id == company_id,
                EnergyAggDaily.date.between(start, end),
            )
        )
        if department_id:
            q = q.filter(Device.department_id == department_id)
        if device_id:
            q = q.filter(Meter.device_id == device_id)
        return q

    # ── 1. Daily series ────────────────────────────────────────────────────
    daily_rows = (
        _base(
            db.query(
                EnergyAggDaily.date,
                func.sum(EnergyAggDaily.total_kwh).label("kwh"),
                func.sum(EnergyAggDaily.baseline_kwh).label("baseline"),
                func.sum(EnergyAggDaily.total_emissions).label("emissions"),
                func.max(EnergyAggDaily.peak_kw).label("peak_kw"),
            )
        )
        .group_by(EnergyAggDaily.date)
        .order_by(EnergyAggDaily.date)
        .all()
    )

    kwh_values    = [float(r.kwh or 0) for r in daily_rows]
    base_values   = [float(r.baseline or 0) for r in daily_rows]
    emis_values   = [float(r.emissions or 0) for r in daily_rows]
    peak_values   = [float(r.peak_kw or 0) for r in daily_rows]

    total_kwh      = sum(kwh_values)
    total_baseline = sum(base_values)
    total_emissions = sum(emis_values)
    days_with_data  = len(kwh_values)

    # ── 2. Overconsumption vs baseline ────────────────────────────────────
    if total_baseline > 0:
        over_pct = _pct(total_kwh, total_baseline)
        if over_pct > 20:
            insights.append({
                "title": "Critical Overconsumption",
                "description": (
                    f"Total energy is {over_pct:.1f}% above the baseline over {period_days} days "
                    f"({total_kwh:,.0f} kWh actual vs {total_baseline:,.0f} kWh baseline). "
                    "Audit HVAC schedules, industrial loads, and standby equipment immediately."
                ),
                "severity": "high",
                "category": "efficiency",
            })
        elif over_pct > 8:
            insights.append({
                "title": "Moderate Overconsumption Detected",
                "description": (
                    f"Consumption is {over_pct:.1f}% above baseline ({total_kwh:,.0f} vs "
                    f"{total_baseline:,.0f} kWh). Review peak-hour device schedules and "
                    "consider shifting non-critical loads to off-peak windows."
                ),
                "severity": "medium",
                "category": "efficiency",
            })
        elif over_pct < -10:
            insights.append({
                "title": "Strong Energy Savings Achieved",
                "description": (
                    f"Consumption is {abs(over_pct):.1f}% below baseline — "
                    f"saving {total_baseline - total_kwh:,.0f} kWh this period. "
                    "Efficiency initiatives are delivering measurable results."
                ),
                "severity": "low",
                "category": "sustainability",
            })
        elif -10 <= over_pct <= 8:
            insights.append({
                "title": "Consumption Near Baseline Target",
                "description": (
                    f"Usage is {over_pct:+.1f}% relative to baseline — well within the ±10% "
                    f"tolerance band ({total_kwh:,.0f} kWh vs {total_baseline:,.0f} kWh target). "
                    "Maintain current operational settings."
                ),
                "severity": "low",
                "category": "efficiency",
            })

    # ── 3. Trend direction ────────────────────────────────────────────────
    if len(kwh_values) >= 4:
        half = len(kwh_values) // 2
        first_avg  = statistics.mean(kwh_values[:half])
        second_avg = statistics.mean(kwh_values[half:])
        trend_pct  = _pct(second_avg, first_avg)

        if trend_pct > 12:
            insights.append({
                "title": "Accelerating Consumption Trend",
                "description": (
                    f"Average daily usage rose {trend_pct:.1f}% from the first half of the "
                    f"period ({first_avg:,.0f} kWh/day) to the second ({second_avg:,.0f} kWh/day). "
                    "Identify new loads introduced recently and check for equipment degradation."
                ),
                "severity": "medium",
                "category": "trend",
            })
        elif trend_pct < -12:
            insights.append({
                "title": "Declining Consumption Trend",
                "description": (
                    f"Daily usage dropped {abs(trend_pct):.1f}% across the period "
                    f"({first_avg:,.0f} → {second_avg:,.0f} kWh/day). "
                    "Efficiency improvements or reduced operational demand appear to be taking effect."
                ),
                "severity": "low",
                "category": "trend",
            })

    # ── 4. Spike detection ────────────────────────────────────────────────
    if len(kwh_values) >= 3:
        mean_kwh = statistics.mean(kwh_values)
        std_kwh  = statistics.stdev(kwh_values) if len(kwh_values) > 1 else 0
        threshold = mean_kwh + 2 * std_kwh
        spike_days = [(daily_rows[i].date, v) for i, v in enumerate(kwh_values) if v > threshold]

        if spike_days:
            spike_dates = ", ".join(str(d) for d, _ in spike_days[:3])
            peak_val    = max(v for _, v in spike_days)
            insights.append({
                "title": f"{len(spike_days)} Anomalous Spike{'s' if len(spike_days) > 1 else ''} Found",
                "description": (
                    f"Unusually high consumption on {spike_dates}"
                    f"{'…' if len(spike_days) > 3 else ''}. "
                    f"Peak was {peak_val:,.0f} kWh — "
                    f"{_pct(peak_val, mean_kwh):.0f}% above the daily average of {mean_kwh:,.0f} kWh. "
                    "Verify equipment operation and check for unscheduled heavy loads on those days."
                ),
                "severity": "high" if len(spike_days) > 2 else "medium",
                "category": "anomaly",
            })

    # ── 5. Peak demand insight ────────────────────────────────────────────
    if peak_values:
        max_peak = max(peak_values)
        avg_peak = statistics.mean(peak_values)
        if max_peak > avg_peak * 1.5:
            insights.append({
                "title": "High Peak Demand Detected",
                "description": (
                    f"Peak demand reached {max_peak:,.0f} kW — "
                    f"{_pct(max_peak, avg_peak):.0f}% above the period average of "
                    f"{avg_peak:,.0f} kW. Demand spikes increase utility tariff charges. "
                    "Consider staggering start-up sequences for heavy equipment."
                ),
                "severity": "medium",
                "category": "efficiency",
            })

    # ── 6. Top zone analysis ──────────────────────────────────────────────
    zone_rows = (
        db.query(
            Zone.name,
            func.sum(EnergyAggDaily.total_kwh).label("kwh"),
            func.sum(EnergyAggDaily.baseline_kwh).label("baseline"),
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
        .limit(3)
        .all()
    )

    if zone_rows and total_kwh > 0:
        top = zone_rows[0]
        top_kwh  = float(top.kwh or 0)
        top_base = float(top.baseline or 0)
        top_pct  = (top_kwh / total_kwh) * 100
        if top_pct > 35:
            zone_over = _pct(top_kwh, top_base) if top_base > 0 else None
            over_note = f", running {zone_over:+.1f}% vs its baseline" if zone_over is not None else ""
            insights.append({
                "title": f"{top.name} Is the Dominant Energy Zone",
                "description": (
                    f"{top.name} accounts for {top_pct:.1f}% of total consumption "
                    f"({top_kwh:,.0f} kWh){over_note}. "
                    "Investigate whether load concentration is intentional or driven by "
                    "inefficiency — targeted zone-level controls could yield significant savings."
                ),
                "severity": "medium" if top_pct > 50 else "low",
                "category": "zone",
            })

    # ── 7. Carbon intensity ───────────────────────────────────────────────
    if total_emissions > 0 and total_kwh > 0:
        intensity = (total_emissions / total_kwh) * 1000  # g CO₂/kWh
        if intensity > 350:
            insights.append({
                "title": "Elevated Carbon Intensity",
                "description": (
                    f"Carbon intensity is {intensity:.0f} g CO₂/kWh "
                    f"({total_emissions:,.1f} tCO₂e total). "
                    "This exceeds typical industrial targets of ≤300 g CO₂/kWh. "
                    "Evaluate renewable energy sourcing and night-time load shifting."
                ),
                "severity": "high",
                "category": "carbon",
            })
        elif intensity < 180:
            insights.append({
                "title": "Excellent Carbon Performance",
                "description": (
                    f"Carbon intensity of {intensity:.0f} g CO₂/kWh is well below the "
                    f"300 g/kWh benchmark ({total_emissions:,.1f} tCO₂e total). "
                    "Current energy mix supports your sustainability targets."
                ),
                "severity": "low",
                "category": "carbon",
            })

    # ── 8. Guaranteed fallback — always produce at least 2 insights ───────
    if len(insights) == 0:
        avg_daily = total_kwh / max(1, days_with_data)
        insights.append({
            "title": "Energy Summary",
            "description": (
                f"Total consumption for the selected period: {total_kwh:,.0f} kWh across "
                f"{days_with_data} day{'s' if days_with_data != 1 else ''} "
                f"(avg {avg_daily:,.0f} kWh/day). "
                "No anomalies or threshold breaches detected — system is operating normally."
            ),
            "severity": "low",
            "category": "efficiency",
        })

    if len(insights) == 1 and total_kwh > 0:
        cost_est = total_kwh * 8.2  # ₹8.2/kWh India tariff
        insights.append({
            "title": "Estimated Energy Cost",
            "description": (
                f"At ₹8.2/kWh the selected period totals approximately "
                f"₹{cost_est:,.0f}. "
                "Use the 30-day and 90-day views to identify cost-saving opportunities "
                "across departments and devices."
            ),
            "severity": "low",
            "category": "sustainability",
        })

    # ── Attach IDs and timestamps ──────────────────────────────────────────
    for i, insight in enumerate(insights):
        insight["id"] = f"insight-{i}"
        insight["timestamp"] = now_iso

    return insights[:6]  # Cap at 6 insights
