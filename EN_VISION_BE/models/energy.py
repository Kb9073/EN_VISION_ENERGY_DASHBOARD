from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, Date, DateTime, Float
from datetime import datetime
from db.session import Base


class EnergyReading(Base):
    __tablename__ = "energy_readings"

    id: Mapped[int] = mapped_column(primary_key=True)
    meter_id: Mapped[int] = mapped_column(ForeignKey("meters.id", ondelete="CASCADE"))
    reading_kw: Mapped[float] = mapped_column(Float, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    meter = relationship("Meter", back_populates="readings")


class EnergyAggHourly(Base):
    __tablename__ = "energy_agg_hourly"

    id: Mapped[int] = mapped_column(primary_key=True)
    meter_id: Mapped[int] = mapped_column(ForeignKey("meters.id", ondelete="CASCADE"))
    hour_start: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    avg_kw: Mapped[float] = mapped_column(Float)
    peak_kw: Mapped[float] = mapped_column(Float)
    total_kwh: Mapped[float] = mapped_column(Float)


class EnergyAggDaily(Base):
    __tablename__ = "energy_agg_daily"

    id: Mapped[int] = mapped_column(primary_key=True)
    meter_id: Mapped[int] = mapped_column(ForeignKey("meters.id", ondelete="CASCADE"))
    date: Mapped[datetime] = mapped_column(Date, nullable=False)

    total_kwh: Mapped[float] = mapped_column(Float, default=0)
    baseline_kwh: Mapped[float] = mapped_column(Float, default=0)

    avg_kw: Mapped[float] = mapped_column(Float)
    peak_kw: Mapped[float] = mapped_column(Float)

    total_cost: Mapped[float] = mapped_column(Float, default=0)
    total_emissions: Mapped[float] = mapped_column(Float, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    meter = relationship("Meter", back_populates="agg_daily")