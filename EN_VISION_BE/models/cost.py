from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import ForeignKey, Date, Float
from db.session import Base
from datetime import date, datetime

class EnergyCost(Base):
    __tablename__ = "energy_costs"

    id: Mapped[int] = mapped_column(primary_key=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id", ondelete="CASCADE"))
    cost_amount: Mapped[float] = mapped_column(Float)
    recorded_at: Mapped[date]