from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from db.models import Base

class BaselineMetric(Base):
    __tablename__ = "baseline_metrics"

    id = Column(Integer, primary_key=True)
    department_id = Column(String, nullable=False)
    device_id = Column(String, nullable=False)

    baseline_kwh = Column(Float, nullable=False)
    last_updated = Column(DateTime, default=datetime.utcnow)
