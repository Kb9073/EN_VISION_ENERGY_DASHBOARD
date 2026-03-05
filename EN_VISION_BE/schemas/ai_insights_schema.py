from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Literal


class AIInsight(BaseModel):
    id: str
    type: Literal["alert", "improvement", "forecast", "info"]
    message: str
    timestamp: datetime
    source: Optional[str] = None
    confidence: Optional[float] = None