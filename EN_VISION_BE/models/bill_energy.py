from datetime import datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from db.session import Base


class BillEnergyAggDaily(Base):
    __tablename__ = "bill_energy_agg_daily"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    meter_id: Mapped[int] = mapped_column(ForeignKey("meters.id", ondelete="CASCADE"), index=True)
    date: Mapped[datetime] = mapped_column(Date, nullable=False, index=True)

    total_kwh: Mapped[float] = mapped_column(Float, default=0)
    baseline_kwh: Mapped[float] = mapped_column(Float, default=0)
    avg_kw: Mapped[float] = mapped_column(Float, default=0)
    peak_kw: Mapped[float] = mapped_column(Float, default=0)
    total_cost: Mapped[float] = mapped_column(Float, default=0)
    total_emissions: Mapped[float] = mapped_column(Float, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)