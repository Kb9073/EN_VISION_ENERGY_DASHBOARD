from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Boolean, JSON, ForeignKey
)
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


class EnergyEvent(Base):
    __tablename__ = "energy_events"

    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, nullable=False)
    device_id = Column(String, nullable=False)
    department_id = Column(String, nullable=False)
    kwh = Column(Float, nullable=False)

    source_type = Column(String)  # iot / csv / api
    ingestion_batch_id = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True)
    service_name = Column(String)
    event_type = Column(String)
    payload = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)


