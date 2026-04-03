from pydantic import BaseModel
from datetime import datetime
from typing import Any, Dict, Generic, Optional, TypeVar

T = TypeVar("T")


class StandardResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T
    timestamp: datetime
    meta: Optional[Dict[str, Any]] = None