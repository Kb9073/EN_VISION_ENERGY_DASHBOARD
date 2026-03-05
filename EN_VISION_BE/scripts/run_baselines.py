from db.session import SessionLocal
from services.baseline_service import compute_baselines

db = SessionLocal()
compute_baselines(db)
db.close()

print("Baseline metrics computed.")
