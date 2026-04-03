from pydantic import BaseModel, Field


class DailyConsumptionItem(BaseModel):
    date: str
    kwh: float = 0.0


class EBBillScanResult(BaseModel):
    provider_name: str = ""
    bill_number: str = ""
    consumer_number: str = ""
    meter_number: str = ""
    bill_date: str = ""
    billing_period_start: str = ""
    billing_period_end: str = ""
    billing_days: int = 0

    total_energy_consumption_kwh: float = 0.0
    sanctioned_load_kw: float = 0.0
    connected_load_kw: float = 0.0
    max_demand_kw: float = 0.0

    energy_charges_inr: float = 0.0
    fixed_charges_inr: float = 0.0
    fuel_adjustment_inr: float = 0.0
    duty_inr: float = 0.0
    tax_inr: float = 0.0
    total_amount_inr: float = 0.0
    amount_payable_inr: float = 0.0

    carbon_emissions_kg_co2: float = 0.0

    day_wise_consumption: list[DailyConsumptionItem] = Field(default_factory=list)

    confidence: float = 0.0
    extracted_text_preview: str = ""
    missing_fields: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class EBBillIngestResult(BaseModel):
    meter_id: int = 0
    rows_upserted: int = 0
    mode: str = ""
    date_start: str = ""
    date_end: str = ""
    total_kwh_ingested: float = 0.0
