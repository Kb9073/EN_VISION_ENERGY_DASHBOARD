from datetime import datetime, timedelta, date
from fastapi import HTTPException
from typing import Optional, Tuple


def resolve_date_range(
    start_date: Optional[str],
    end_date: Optional[str],
    range_param: Optional[str],
) -> Tuple[date, date]:

    # 1️⃣ If explicit dates passed
    if start_date and end_date:
        try:
            start = datetime.fromisoformat(start_date).date()
            end = datetime.fromisoformat(end_date).date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")

    # 2️⃣ If using predefined range
    elif range_param:
        end = datetime.utcnow().date()

        if range_param == "24h":
            start = end - timedelta(days=1)
        elif range_param == "7d":
            start = end - timedelta(days=7)
        elif range_param == "30d":
            start = end - timedelta(days=30)
        elif range_param == "90d":
            start = end - timedelta(days=90)
        else:
            raise HTTPException(status_code=400, detail="Invalid range")

    else:
        raise HTTPException(status_code=400, detail="Date range required")

    if start > end:
        raise HTTPException(status_code=400, detail="Invalid date range")

    return start, end