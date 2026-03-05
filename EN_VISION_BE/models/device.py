from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, String, Float, Enum
import enum
from db.session import Base


class DeviceStatus(enum.Enum):
    active = "active"
    inactive = "inactive"


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(primary_key=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    device_type: Mapped[str] = mapped_column(String(100))
    power_rating_kw: Mapped[float] = mapped_column(Float)
    status: Mapped[DeviceStatus] = mapped_column(Enum(DeviceStatus), default=DeviceStatus.active)

    department = relationship("Department", back_populates="devices")
    meters = relationship("Meter", back_populates="device", cascade="all, delete")