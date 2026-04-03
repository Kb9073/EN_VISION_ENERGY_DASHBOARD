from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.bill_energy import BillEnergyAggDaily
from models.department import Department
from models.device import Device
from models.meter import Meter
from schemas.eb_bill_schema import DailyConsumptionItem, EBBillIngestResult, EBBillScanResult
from utils.tariff import cost_from_kwh

EMISSION_FACTOR_TCO2E_PER_KWH = 0.00082


def _clear_company_energy_data(db: Session, company_id: int) -> None:
    db.query(BillEnergyAggDaily).filter(BillEnergyAggDaily.company_id == company_id).delete(
        synchronize_session=False
    )


def _parse_date(raw: str, fallback_year: Optional[int] = None) -> Optional[date]:
    if not raw:
        return None

    cleaned = raw.strip()
    for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%m-%d-%Y", "%m/%d/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue

    for fmt in ("%d-%m", "%d/%m", "%m-%d", "%m/%d"):
        try:
            parsed = datetime.strptime(cleaned, fmt).date()
            return parsed.replace(year=fallback_year or datetime.utcnow().year)
        except ValueError:
            continue

    return None


def _resolve_meter(db: Session, company_id: int, meter_id: Optional[int], device_id: Optional[int]) -> Meter:
    query = (
        db.query(Meter)
        .join(Device, Device.id == Meter.device_id)
        .join(Department, Department.id == Device.department_id)
        .filter(Department.company_id == company_id)
    )

    if meter_id:
        query = query.filter(Meter.id == meter_id)
    elif device_id:
        query = query.filter(Meter.device_id == device_id)

    meter = query.order_by(Meter.id.asc()).first()
    if not meter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No eligible meter found for this company/device selection.",
        )
    return meter


def _build_daily_rows(parsed: EBBillScanResult) -> tuple[list[DailyConsumptionItem], str]:
    reference_end = _parse_date(parsed.billing_period_end) or _parse_date(parsed.bill_date) or datetime.utcnow().date()

    normalized_rows: list[DailyConsumptionItem] = []
    for item in parsed.day_wise_consumption:
        parsed_date = _parse_date(item.date, fallback_year=reference_end.year)
        if not parsed_date:
            continue
        normalized_rows.append(DailyConsumptionItem(date=parsed_date.isoformat(), kwh=max(float(item.kwh or 0), 0.0)))

    if normalized_rows:
        return normalized_rows, "day_wise"

    total_kwh = max(float(parsed.total_energy_consumption_kwh or 0), 0.0)
    if total_kwh == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Parsed bill has no usable consumption values to ingest.",
        )

    start = _parse_date(parsed.billing_period_start)
    end = _parse_date(parsed.billing_period_end) or _parse_date(parsed.bill_date) or datetime.utcnow().date()

    if start and end and end >= start:
        days = (end - start).days + 1
    else:
        days = max(int(parsed.billing_days or 0), 1)
        start = end - timedelta(days=days - 1)

    per_day = round(total_kwh / max(days, 1), 4)
    spread_rows = [
        DailyConsumptionItem(date=(start + timedelta(days=i)).isoformat(), kwh=per_day)
        for i in range(days)
    ]
    return spread_rows, "distributed"


def ingest_parsed_bill(
    db: Session,
    company_id: int,
    parsed: EBBillScanResult,
    meter_id: Optional[int] = None,
    device_id: Optional[int] = None,
    clear_existing: bool = False,
) -> EBBillIngestResult:
    if clear_existing:
        _clear_company_energy_data(db, company_id)

    meter = _resolve_meter(db, company_id, meter_id, device_id)
    rows, mode = _build_daily_rows(parsed)

    total_kwh = round(sum(float(r.kwh or 0) for r in rows), 4)
    factor = EMISSION_FACTOR_TCO2E_PER_KWH
    if parsed.carbon_emissions_kg_co2 > 0 and total_kwh > 0:
        factor = max((parsed.carbon_emissions_kg_co2 / 1000.0) / total_kwh, 0.0)

    for row in rows:
        row_date = datetime.strptime(row.date, "%Y-%m-%d").date()
        existing = (
            db.query(BillEnergyAggDaily)
            .filter(
                BillEnergyAggDaily.company_id == company_id,
                BillEnergyAggDaily.meter_id == meter.id,
                BillEnergyAggDaily.date == row_date,
            )
            .first()
        )

        total_cost = round(float(cost_from_kwh(float(row.kwh or 0))), 2)
        total_emissions = round(float(row.kwh or 0) * factor, 5)
        avg_kw = round(float(row.kwh or 0) / 24.0, 4)

        if existing:
            existing.total_kwh = float(row.kwh or 0)
            existing.total_cost = total_cost
            existing.total_emissions = total_emissions
            existing.avg_kw = avg_kw
            existing.peak_kw = max(existing.peak_kw or 0, avg_kw)
        else:
            db.add(
                BillEnergyAggDaily(
                    company_id=company_id,
                    meter_id=meter.id,
                    date=row_date,
                    total_kwh=float(row.kwh or 0),
                    baseline_kwh=0,
                    avg_kw=avg_kw,
                    peak_kw=avg_kw,
                    total_cost=total_cost,
                    total_emissions=total_emissions,
                )
            )

    db.commit()

    sorted_dates = sorted(datetime.strptime(r.date, "%Y-%m-%d").date() for r in rows)
    return EBBillIngestResult(
        meter_id=meter.id,
        rows_upserted=len(rows),
        mode=mode,
        date_start=sorted_dates[0].isoformat() if sorted_dates else "",
        date_end=sorted_dates[-1].isoformat() if sorted_dates else "",
        total_kwh_ingested=total_kwh,
    )