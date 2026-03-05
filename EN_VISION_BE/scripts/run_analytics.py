from db.session import SessionLocal
from services.analytics_service import compute_daily_energy_summary

db = SessionLocal()
compute_daily_energy_summary(db)
db.close()

print("Daily energy aggregation completed.")
