from db.session import SessionLocal
from jobs.aggregation import aggregate_hourly, aggregate_daily
from datetime import datetime, timedelta

db = SessionLocal()

end = datetime.utcnow()
start = end - timedelta(days=1)

aggregate_hourly(db, start, end)
aggregate_daily(db, start, end)

print("Aggregation complete.")