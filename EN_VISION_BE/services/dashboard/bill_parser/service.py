from __future__ import annotations

import io
import json
import os
import re
import shutil
from datetime import datetime
from typing import Any, Callable

import httpx
from fastapi import UploadFile

from schemas.eb_bill_schema import DailyConsumptionItem, EBBillScanResult


def _extract_text_from_pdf(payload: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(payload))
    return "\n".join((page.extract_text() or "") for page in reader.pages)


def _extract_text_from_image(payload: bytes) -> str:
    from PIL import Image
    import pytesseract

    tesseract_cmd = os.getenv("TESSERACT_CMD", "").strip()
    if tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
    elif os.name == "nt":
        fallback_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
        if os.path.exists(fallback_cmd):
            pytesseract.pytesseract.tesseract_cmd = fallback_cmd

    image = Image.open(io.BytesIO(payload))
    return pytesseract.image_to_string(image) or ""


def _extract_text_from_text_file(payload: bytes) -> str:
    return payload.decode("utf-8", errors="ignore")


def _find_first_number(text: str, labels: list[str]) -> float | None:
    for label in labels:
        pattern = rf"{label}[^\d]{{0,40}}([\d,]+(?:\.\d+)?)"
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            raw = match.group(1).replace(",", "")
            try:
                return float(raw)
            except ValueError:
                continue
    return None


def _find_first_text(text: str, labels: list[str]) -> str:
    for label in labels:
        pattern = rf"{label}\s*[:\-]?\s*([A-Za-z0-9\-/ ]{{3,60}})"
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return ""


def _extract_dates(text: str) -> tuple[str, str, str]:
    date_pattern = r"\b(\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4})\b"
    found = re.findall(date_pattern, text)
    if not found:
        return "", "", ""

    bill_date = found[0]
    start = found[0] if len(found) > 1 else ""
    end = found[1] if len(found) > 1 else ""
    return bill_date, start, end


def _extract_daywise_rows(text: str) -> list[DailyConsumptionItem]:
    rows: list[DailyConsumptionItem] = []
    line_pattern = re.compile(
        r"(?P<date>\d{1,2}[\-/]\d{1,2}(?:[\-/]\d{2,4})?)\D{0,12}(?P<kwh>\d+(?:\.\d+)?)",
        re.IGNORECASE,
    )
    for line in text.splitlines():
        match = line_pattern.search(line)
        if not match:
            continue
        try:
            kwh = float(match.group("kwh"))
        except ValueError:
            continue
        rows.append(DailyConsumptionItem(date=match.group("date"), kwh=kwh))

    return rows[:31]


def _compute_confidence(data: EBBillScanResult) -> float:
    total_fields = 12
    scored = 0
    if data.provider_name:
        scored += 1
    if data.consumer_number:
        scored += 1
    if data.meter_number:
        scored += 1
    if data.bill_date:
        scored += 1
    if data.total_energy_consumption_kwh > 0:
        scored += 1
    if data.total_amount_inr > 0:
        scored += 1
    if data.energy_charges_inr > 0:
        scored += 1
    if data.fixed_charges_inr > 0:
        scored += 1
    if data.billing_days > 0:
        scored += 1
    if data.max_demand_kw > 0:
        scored += 1
    if data.amount_payable_inr > 0:
        scored += 1
    if data.day_wise_consumption:
        scored += 1

    return round((scored / total_fields) * 100, 1)


def _missing_fields(data: EBBillScanResult) -> list[str]:
    missing: list[str] = []

    def add_if_empty(field_name: str, value: float | int | str) -> None:
        if isinstance(value, str) and not value:
            missing.append(field_name)
        elif isinstance(value, (int, float)) and value == 0:
            missing.append(field_name)

    add_if_empty("provider_name", data.provider_name)
    add_if_empty("consumer_number", data.consumer_number)
    add_if_empty("meter_number", data.meter_number)
    add_if_empty("bill_date", data.bill_date)
    add_if_empty("total_energy_consumption_kwh", data.total_energy_consumption_kwh)
    add_if_empty("total_amount_inr", data.total_amount_inr)

    return missing


def _safe_extract(extractor: Callable[[bytes], str], payload: bytes, warnings: list[str], warning_msg: str) -> str:
    try:
        return extractor(payload)
    except Exception:
        warnings.append(warning_msg)
        return ""


def _coerce_float(value: Any) -> float:
    if value in (None, "", "null"):
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    cleaned = str(value).replace(",", "").strip()
    match = re.search(r"-?\d+(?:\.\d+)?", cleaned)
    if not match:
        return 0.0
    try:
        return float(match.group(0))
    except ValueError:
        return 0.0


def _coerce_int(value: Any) -> int:
    return int(round(_coerce_float(value)))


def _extract_json_block(content: str) -> dict[str, Any]:
    # Handle both direct JSON and markdown fenced JSON.
    if "```" in content:
        fenced = re.search(r"```(?:json)?\s*(\{.*\})\s*```", content, re.DOTALL)
        if fenced:
            content = fenced.group(1)

    start = content.find("{")
    end = content.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return {}

    try:
        return json.loads(content[start : end + 1])
    except json.JSONDecodeError:
        return {}


def _llm_extract_fields(text: str, warnings: list[str]) -> dict[str, Any]:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        return {}

    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")

    prompt = (
        "Extract electricity bill fields from the text. "
        "Return strict JSON only with keys: "
        "provider_name, bill_number, consumer_number, meter_number, bill_date, "
        "billing_period_start, billing_period_end, billing_days, total_energy_consumption_kwh, "
        "sanctioned_load_kw, connected_load_kw, max_demand_kw, energy_charges_inr, "
        "fixed_charges_inr, fuel_adjustment_inr, duty_inr, tax_inr, total_amount_inr, "
        "amount_payable_inr, carbon_emissions_kg_co2, day_wise_consumption. "
        "Use number values for numeric keys and [] for day_wise_consumption if unavailable. "
        "If a field is missing, return empty string for text fields and 0 for numeric fields."
    )

    try:
        with httpx.Client(timeout=20.0) as client:
            response = client.post(
                f"{base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "temperature": 0,
                    "messages": [
                        {"role": "system", "content": "You extract structured fields from utility bills."},
                        {"role": "user", "content": f"{prompt}\n\nBILL TEXT:\n{text[:12000]}"},
                    ],
                },
            )
            response.raise_for_status()
            payload = response.json()
    except Exception:
        warnings.append("LLM extraction fallback failed; using rule-based extraction only.")
        return {}

    choices = payload.get("choices") or []
    if not choices:
        return {}

    message = choices[0].get("message") or {}
    content = message.get("content") or ""
    if not isinstance(content, str) or not content.strip():
        return {}

    parsed_json = _extract_json_block(content)
    if not parsed_json:
        warnings.append("LLM response was not valid JSON; skipped LLM merge.")
    return parsed_json


def _merge_llm(parsed: EBBillScanResult, llm_data: dict[str, Any]) -> None:
    if not llm_data:
        return

    text_keys = [
        "provider_name",
        "bill_number",
        "consumer_number",
        "meter_number",
        "bill_date",
        "billing_period_start",
        "billing_period_end",
    ]
    numeric_keys = [
        "billing_days",
        "total_energy_consumption_kwh",
        "sanctioned_load_kw",
        "connected_load_kw",
        "max_demand_kw",
        "energy_charges_inr",
        "fixed_charges_inr",
        "fuel_adjustment_inr",
        "duty_inr",
        "tax_inr",
        "total_amount_inr",
        "amount_payable_inr",
        "carbon_emissions_kg_co2",
    ]

    for key in text_keys:
        current = getattr(parsed, key)
        incoming = str(llm_data.get(key, "") or "").strip()
        if not current and incoming:
            setattr(parsed, key, incoming)

    for key in numeric_keys:
        current = getattr(parsed, key)
        incoming_raw = llm_data.get(key)
        incoming = _coerce_int(incoming_raw) if key == "billing_days" else _coerce_float(incoming_raw)
        if (not current or current == 0) and incoming > 0:
            setattr(parsed, key, incoming)

    if not parsed.day_wise_consumption:
        items = llm_data.get("day_wise_consumption")
        if isinstance(items, list):
            day_rows: list[DailyConsumptionItem] = []
            for item in items[:31]:
                if not isinstance(item, dict):
                    continue
                date = str(item.get("date", "") or "").strip()
                kwh = _coerce_float(item.get("kwh"))
                if date and kwh >= 0:
                    day_rows.append(DailyConsumptionItem(date=date, kwh=kwh))
            parsed.day_wise_consumption = day_rows


async def parse_eb_bill(file: UploadFile) -> EBBillScanResult:
    payload = await file.read()
    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()

    warnings: list[str] = []
    text = ""

    if filename.endswith(".pdf") or "pdf" in content_type:
        text = _safe_extract(
            _extract_text_from_pdf,
            payload,
            warnings,
            "Could not read PDF text. If this is a scanned PDF, OCR support may be needed.",
        )
    elif filename.endswith((".jpg", ".jpeg", ".png", ".webp")) or content_type.startswith("image/"):
        text = _safe_extract(
            _extract_text_from_image,
            payload,
            warnings,
            "Could not run OCR on image. Install Tesseract OCR in the runtime environment.",
        )
    else:
        text = _safe_extract(
            _extract_text_from_text_file,
            payload,
            warnings,
            "Could not decode text from the uploaded file.",
        )

    lowered = text.lower()

    bill_date, start_date, end_date = _extract_dates(text)

    total_energy = _find_first_number(
        lowered,
        [
            r"total\s+energy\s+consumption",
            r"total\s+consumption",
            r"units\s+consumed",
            r"billed\s+units",
            r"net\s+units",
        ],
    )

    energy_charges = _find_first_number(lowered, [r"energy\s+charges?", r"consumption\s+charges?"])
    fixed_charges = _find_first_number(lowered, [r"fixed\s+charges?", r"demand\s+charges?"])
    fuel_adj = _find_first_number(lowered, [r"fuel\s+(?:adjustment|surcharge)", r"fppca", r"fac"])
    duty = _find_first_number(lowered, [r"electricity\s+duty", r"duty"])
    tax = _find_first_number(lowered, [r"tax", r"gst", r"vat"])
    total_amount = _find_first_number(lowered, [r"total\s+amount", r"bill\s+amount", r"net\s+amount"])
    payable_amount = _find_first_number(lowered, [r"amount\s+payable", r"payable\s+amount", r"current\s+amount\s+due"])

    billing_days_num = _find_first_number(lowered, [r"billing\s+days", r"bill\s+days", r"days"])

    daywise = _extract_daywise_rows(text)

    parsed = EBBillScanResult(
        provider_name=_find_first_text(text, [r"provider", r"board", r"tneb", r"bescom", r"tangedco", r"kseb", r"adani", r"torrent"]),
        bill_number=_find_first_text(text, [r"bill\s*no", r"invoice\s*no", r"reference\s*no"]),
        consumer_number=_find_first_text(text, [r"consumer\s*(?:no|number)", r"service\s*(?:no|number)", r"account\s*(?:no|number)"]),
        meter_number=_find_first_text(text, [r"meter\s*(?:no|number)"]),
        bill_date=bill_date,
        billing_period_start=start_date,
        billing_period_end=end_date,
        billing_days=int(billing_days_num) if billing_days_num else 0,
        total_energy_consumption_kwh=total_energy or 0,
        sanctioned_load_kw=_find_first_number(lowered, [r"sanctioned\s+load", r"contract\s+demand"]) or 0,
        connected_load_kw=_find_first_number(lowered, [r"connected\s+load"]) or 0,
        max_demand_kw=_find_first_number(lowered, [r"maximum\s+demand", r"max\s+demand"]) or 0,
        energy_charges_inr=energy_charges or 0,
        fixed_charges_inr=fixed_charges or 0,
        fuel_adjustment_inr=fuel_adj or 0,
        duty_inr=duty or 0,
        tax_inr=tax or 0,
        total_amount_inr=total_amount or 0,
        amount_payable_inr=payable_amount or total_amount or 0,
        carbon_emissions_kg_co2=0,
        day_wise_consumption=daywise,
        extracted_text_preview=(text.strip().replace("\n", " ")[:450] if text else ""),
        warnings=warnings,
    )

    if parsed.billing_days == 0 and parsed.billing_period_start and parsed.billing_period_end:
        for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%m-%d-%Y", "%m/%d/%Y", "%d-%m-%y", "%d/%m/%y"):
            try:
                start_dt = datetime.strptime(parsed.billing_period_start, fmt)
                end_dt = datetime.strptime(parsed.billing_period_end, fmt)
                parsed.billing_days = max((end_dt - start_dt).days, 0)
                break
            except ValueError:
                continue

    if parsed.total_energy_consumption_kwh == 0 and parsed.day_wise_consumption:
        parsed.total_energy_consumption_kwh = round(sum(row.kwh for row in parsed.day_wise_consumption), 2)

    # Optional LLM pass to improve extraction across highly variable bill formats.
    llm_data = _llm_extract_fields(text, warnings)
    _merge_llm(parsed, llm_data)

    if parsed.total_energy_consumption_kwh == 0 and parsed.day_wise_consumption:
        parsed.total_energy_consumption_kwh = round(sum(row.kwh for row in parsed.day_wise_consumption), 2)

    if parsed.amount_payable_inr == 0 and parsed.total_amount_inr > 0:
        parsed.amount_payable_inr = parsed.total_amount_inr

    parsed.confidence = _compute_confidence(parsed)
    parsed.missing_fields = _missing_fields(parsed)

    if not text:
        parsed.warnings.append("No readable text was extracted from the uploaded bill.")

    if os.name == "nt" and not shutil.which("tesseract") and not os.getenv("TESSERACT_CMD"):
        parsed.warnings.append(
            "Tesseract executable was not found in PATH. Set TESSERACT_CMD if OCR is needed for image bills."
        )

    return parsed
