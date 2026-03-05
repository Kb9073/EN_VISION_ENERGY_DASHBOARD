from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, String
from db.session import Base

class Meter(Base):
    __tablename__ = "meters"

    id: Mapped[int] = mapped_column(primary_key=True)
    zone_id: Mapped[int] = mapped_column(ForeignKey("zones.id", ondelete="CASCADE"))
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id", ondelete="CASCADE"))
    meter_type: Mapped[str] = mapped_column(String(50))

    zone = relationship("Zone", back_populates="meters")
    device = relationship("Device", back_populates="meters")
    readings = relationship("EnergyReading", back_populates="meter", cascade="all, delete")
    agg_daily = relationship("EnergyAggDaily", back_populates="meter", cascade="all, delete")