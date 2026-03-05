from sqlalchemy import Column, Integer, String, Float, Date
from db.models import Base

class DailyEnergySummary(Base):
    __tablename__ = "daily_energy_summary"

    id = Column(Integer, primary_key=True)
    date = Column(Date, nullable=False)
    department_id = Column(String, nullable=False)
    device_id = Column(String, nullable=False)

    total_kwh = Column(Float, nullable=False)
    avg_kwh = Column(Float, nullable=False)
    peak_kwh = Column(Float, nullable=False)
