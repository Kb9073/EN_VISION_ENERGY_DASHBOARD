from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, Date, Float
from db.session import Base
from datetime import date, datetime

class CarbonEmission(Base):
    __tablename__ = "carbon_emissions"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"))
    source: Mapped[str]
    scope: Mapped[str]
    emissions_tco2e: Mapped[float] = mapped_column(Float)
    recorded_at: Mapped[date]

    company = relationship("Company", back_populates="carbon_emissions")