from db.models import Base
from db.session import engine

from db.models import EnergyEvent, AuditLog
from db.analytics_models import DailyEnergySummary
from db.baseline_models import BaselineMetric

def main():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Done.")

if __name__ == "__main__":
    main()
