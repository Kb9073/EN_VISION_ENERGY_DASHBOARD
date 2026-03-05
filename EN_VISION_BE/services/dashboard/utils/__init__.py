from datetime import date, timedelta
from sqlalchemy import text

def resolve_date_range(db, range: str = "7d", start_date=None, end_date=None):
    max_date = db.execute(
        text("SELECT MAX(date) FROM daily_energy_summary")
    ).scalar()

    if not max_date:
        return None, None

    end = end_date or max_date

    if start_date:
        start = start_date
    else:
        days_map = {
            "24h": 1,
            "7d": 7,
            "30d": 30,
            "90d": 90,
        }
        days = days_map.get(range, 7)
        start = end - timedelta(days=days)

    # Clamp to available data
    min_date = db.execute(
        text("SELECT MIN(date) FROM daily_energy_summary")
    ).scalar()

    if start < min_date:
        start = min_date

    return start, end
