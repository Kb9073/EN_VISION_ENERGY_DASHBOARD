from pydantic import BaseModel
from typing import Optional


class KPIItem(BaseModel):
    value: float
    unit: str
    delta: float
    period: Optional[str] = None


class DashboardKPIs(BaseModel):
    totalEnergyConsumption: KPIItem
    energySaved: KPIItem
    overConsumptionPercent: KPIItem
    co2Emissions: KPIItem

    avgConsumption: float
    peakConsumption: float
    totalCost: float

    systemStatus: str
    sustainabilityStatus: str