from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional

from db.session import get_db
from schemas.base import StandardResponse
from models.department import Department
from models.device import Device

router = APIRouter(tags=["Filters"])


@router.get("/filters/departments", response_model=StandardResponse)
def list_departments(
    company_id: int = Query(...),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Department.id, Department.name)
        .filter(Department.company_id == company_id)
        .order_by(Department.name)
        .all()
    )

    return StandardResponse(
        success=True,
        data=[{"id": row.id, "name": row.name} for row in rows],
        timestamp=datetime.utcnow(),
    )


@router.get("/filters/devices", response_model=StandardResponse)
def list_devices(
    company_id: int = Query(...),
    department_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = (
        db.query(Device.id, Device.name, Device.department_id)
        .join(Department, Department.id == Device.department_id)
        .filter(Department.company_id == company_id)
    )

    if department_id:
        query = query.filter(Device.department_id == department_id)

    rows = query.order_by(Device.name).all()

    return StandardResponse(
        success=True,
        data=[{"id": row.id, "name": row.name} for row in rows],
        timestamp=datetime.utcnow(),
    )