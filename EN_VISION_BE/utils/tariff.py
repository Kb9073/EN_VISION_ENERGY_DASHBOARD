"""Electricity tariff helpers for INR cost conversion."""

# Blended average commercial electricity tariff in India (INR/kWh).
# Keep this configurable here so cost outputs stay consistent across services.
INDIA_AVG_ELECTRICITY_RATE_INR_PER_KWH = 8.2


def cost_from_kwh(kwh: float) -> float:
    """Convert energy in kWh to INR cost using India average tariff."""
    return float(kwh or 0) * INDIA_AVG_ELECTRICITY_RATE_INR_PER_KWH
