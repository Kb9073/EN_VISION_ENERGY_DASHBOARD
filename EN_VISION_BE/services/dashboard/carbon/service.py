from sqlalchemy.orm import Session
from sqlalchemy import func
from models.carbon import CarbonEmission


# ---------------------------------------
# 1️⃣ Total Carbon Emissions
# ---------------------------------------
def get_total_emissions(db: Session, company_id: int, start, end):

    total = (
        db.query(func.coalesce(func.sum(CarbonEmission.emissions_tco2e), 0))
        .filter(
            CarbonEmission.company_id == company_id,
            CarbonEmission.recorded_at >= start,
            CarbonEmission.recorded_at <= end,
        )
        .scalar()
    )

    return float(total or 0)


# ---------------------------------------
# 2️⃣ Emissions Breakdown by Source
# ---------------------------------------
def get_emissions_breakdown(db: Session, company_id: int, start, end):

    rows = (
        db.query(
            CarbonEmission.source,
            func.coalesce(func.sum(CarbonEmission.emissions_tco2e), 0).label("value"),
        )
        .filter(
            CarbonEmission.company_id == company_id,
            CarbonEmission.recorded_at >= start,
            CarbonEmission.recorded_at <= end,
        )
        .group_by(CarbonEmission.source)
        .order_by(func.sum(CarbonEmission.emissions_tco2e).desc())
        .all()
    )

    return [
        {
            "source": row.source,
            "value": float(row.value or 0),
        }
        for row in rows
    ]


# ---------------------------------------
# 3️⃣ Emissions by Scope
# ---------------------------------------
def get_emissions_by_scope(db: Session, company_id: int, start, end):

    rows = (
        db.query(
            CarbonEmission.scope,
            func.coalesce(func.sum(CarbonEmission.emissions_tco2e), 0).label("value"),
        )
        .filter(
            CarbonEmission.company_id == company_id,
            CarbonEmission.recorded_at.between(start, end)
        )
        .group_by(CarbonEmission.scope)
        .order_by(func.sum(CarbonEmission.emissions_tco2e).desc())
        .all()
    )

    return [
        {
            "scope": row.scope,
            "value": float(row.value or 0),
        }
        for row in rows
    ]