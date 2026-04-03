#!/usr/bin/env python3
"""
seed_and_simulate_energy_data.py
═══════════════════════════════════════════════════════════════
EN-VISION  –  Production Data Seeder & Live Simulator
═══════════════════════════════════════════════════════════════

Usage:
    python seed_and_simulate_energy_data.py

Phase 1 – seeds historical data (90 days, 100 devices).
Phase 2 – enters a continuous live-simulation loop (every 10 s).

Tables populated:
  companies, locations, zones, departments, devices, meters,
  energy_readings, energy_agg_hourly, energy_agg_daily,
  energy_consumption, energy_costs, carbon_emissions,
  energy_anomalies, energy_forecasts, appliance_activity,
  recommendations, ai_insights
"""

import random
import time
import sys
from datetime import datetime, date, timedelta

import numpy as np
import psycopg2
import psycopg2.extras

try:
    from faker import Faker
    fake = Faker("en_IN")
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "faker"])
    from faker import Faker
    fake = Faker("en_IN")

# ────────────────────────────────────────────────────────────────────────────────
#  REPRODUCIBLE SEED
# ────────────────────────────────────────────────────────────────────────────────
random.seed(42)
np.random.seed(42)

# ────────────────────────────────────────────────────────────────────────────────
#  DATABASE CONFIG
# ────────────────────────────────────────────────────────────────────────────────
DB_CONFIG = {
    "host":     "localhost",
    "port":     5432,
    "dbname":   "EN-VISION(Updated)",
    "user":     "postgres",
    "password": "StrongNewPassword123",
}


def get_conn() -> psycopg2.extensions.connection:
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False
    return conn


# ────────────────────────────────────────────────────────────────────────────────
#  GLOBAL CONSTANTS
# ────────────────────────────────────────────────────────────────────────────────
COMPANY_ID          = 1
HISTORY_DAYS        = 90
CARBON_DAYS         = 120
TARGET_DEVICES      = 100
SIMULATE_INTERVAL_S = 10

# India average grid emission factor (tCO₂e per kWh)
EMISSION_FACTOR = 0.00082

DEPT_NAMES = [
    "Manufacturing",
    "Packaging",
    "Logistics",
    "Warehouse",
    "Data Center",
    "Office Floor 1",
    "Office Floor 2",
    "Maintenance",
    "R&D Lab",
    "Security",
]

ZONE_NAMES = ["Zone A", "Zone B", "Warehouse", "Assembly Floor", "Data Center"]

# (display_name, kw_min, kw_max, pattern, dept_affinities)
DEVICE_CATALOG = [
    ("CNC Machine",           20,  80,  "shift",    ["Manufacturing", "Maintenance"]),
    ("Industrial Furnace",    40, 120,  "shift",    ["Manufacturing"]),
    ("HVAC System",           10,  50,  "hvac",     ["Office Floor 1", "Office Floor 2",
                                                      "Data Center", "Manufacturing"]),
    ("Lighting Grid",          2,  20,  "lighting", ["Office Floor 1", "Office Floor 2",
                                                      "Warehouse", "Assembly Floor"]),
    ("Server Rack",            5,  30,  "constant", ["Data Center"]),
    ("Cooling Pump",           3,  15,  "hvac",     ["Data Center", "Manufacturing"]),
    ("Conveyor Motor",         5,  40,  "shift",    ["Packaging", "Logistics", "Warehouse"]),
    ("Industrial Compressor", 20,  80,  "shift",    ["Manufacturing", "Packaging"]),
    ("Packaging Machine",     10,  50,  "shift",    ["Packaging"]),
    ("3D Printer",             2,   8,  "office",   ["R&D Lab"]),
]

CARBON_SOURCES = [
    # (source, scope, daily_base_tco2e)
    ("Electricity",   "Scope 2", 1.50),
    ("Fleet",         "Scope 1", 0.38),
    ("Supply Chain",  "Scope 3", 0.45),
    ("Manufacturing", "Scope 1", 0.17),
]

ANOMALY_TYPES = [
    "power_spike",
    "unexpected_shutdown",
    "sustained_abnormal_load",
    "sensor_anomaly",
    "phase_imbalance",
]

RECOMMENDATIONS = [
    ("Reduce HVAC usage during off-hours to cut overnight base load",                         840),
    ("Optimize industrial compressor schedule — shift runs to off-peak tariff window",        680),
    ("Shift heavy manufacturing loads to off-peak periods (22:00–06:00)",                    520),
    ("Upgrade inefficient fluorescent lighting to LED across all departments",               410),
    ("Install variable-frequency drives on Conveyor Motors to reduce ramp losses",           730),
    ("Schedule Industrial Furnaces for overnight off-peak window",                           950),
    ("Implement server virtualisation to reduce idle Server Rack consumption",               370),
    ("Add power-factor correction capacitors to motor banks",                                620),
    ("Enable demand-response HVAC setback during on-peak pricing windows",                   470),
    ("Replace aging compressors with inverter-driven units to cut cycling losses",           790),
    ("Install sub-meters on Packaging line to identify hidden waste",                        300),
    ("Deploy occupancy sensors in Office Floors to automate Lighting Grid shutdown",         280),
]

AI_INSIGHTS = [
    ("overconsumption",
     "Energy usage is 18% above the 90-day baseline. "
     "HVAC and compressors are the primary contributors."),
    ("peak_alert",
     "Peak demand exceeded 450 kW on 5 consecutive weekdays — "
     "review shift scheduling for CNC machines."),
    ("cost_spike",
     "Energy cost increased 22% vs previous period. "
     "High-load devices are active during peak tariff windows."),
    ("carbon_trend",
     "CO₂ emissions trending upward 12% month-on-month. "
     "Electricity Scope 2 dominates at 68%."),
    ("efficiency_win",
     "Lighting Grid efficiency improved 9% after LED rollout "
     "in Office Floor 1 and Office Floor 2."),
    ("anomaly_pattern",
     "Anomalous overnight consumption detected on CNC Machines — "
     "possible idle running after shift end."),
    ("forecast_alert",
     "14-day forecast predicts 7% consumption rise. "
     "Recommend pre-emptive load balancing across zones."),
    ("savings_opp",
     "Shifting batch processes to off-peak hours could save "
     "₹42,000 per month at current tariffs."),
]


# ────────────────────────────────────────────────────────────────────────────────
#  ENERGY PATTERN ENGINE
# ────────────────────────────────────────────────────────────────────────────────
def kw_reading(pattern: str, hour: int, minute: int,
               weekday: int, power_rating: float) -> float:
    """
    Returns a realistic instantaneous kW draw for a device
    at the given hour/minute/weekday.
    weekday: 0 = Monday … 6 = Sunday.
    """
    is_weekend = weekday >= 5

    if pattern == "constant":
        # Servers / UPS – always on with light variation
        return power_rating * max(0.50, random.gauss(0.76, 0.04))

    elif pattern == "shift":
        # Industrial machines – weekday shifts 06:00–18:00
        if is_weekend:
            return power_rating * random.uniform(0.01, 0.06)
        frac_hour = hour + minute / 60.0
        if 6.0 <= frac_hour < 8.0:
            ramp = (frac_hour - 6.0) / 2.0
            return power_rating * (0.18 + 0.60 * ramp) * random.uniform(0.88, 1.05)
        elif 8.0 <= frac_hour < 17.0:
            return power_rating * random.uniform(0.68, 0.96)
        elif 17.0 <= frac_hour < 19.0:
            ramp_dn = (19.0 - frac_hour) / 2.0
            return power_rating * (0.12 + 0.55 * ramp_dn) * random.uniform(0.85, 1.0)
        else:
            return power_rating * random.uniform(0.01, 0.05)

    elif pattern == "hvac":
        mult = 0.35 if is_weekend else 1.0
        if 8 <= hour < 18:
            return power_rating * mult * random.uniform(0.60, 0.92)
        elif 18 <= hour < 22:
            return power_rating * mult * random.uniform(0.25, 0.45)
        else:
            return power_rating * mult * random.uniform(0.08, 0.20)

    elif pattern == "lighting":
        if is_weekend:
            if 9 <= hour < 15:
                return power_rating * random.uniform(0.14, 0.30)
            return power_rating * random.uniform(0.03, 0.07)
        if 7 <= hour < 20:
            return power_rating * random.uniform(0.72, 0.95)
        elif 6 <= hour < 7 or 20 <= hour < 22:
            return power_rating * random.uniform(0.22, 0.42)
        return power_rating * random.uniform(0.03, 0.07)

    elif pattern == "office":
        # 3D printers, misc office gear
        if is_weekend:
            return power_rating * random.uniform(0.01, 0.04)
        if 8 <= hour < 17:
            return power_rating * random.uniform(0.42, 0.88)
        return power_rating * random.uniform(0.02, 0.07)

    # Fallback
    return power_rating * random.uniform(0.20, 0.40)


# ────────────────────────────────────────────────────────────────────────────────
#  BATCH INSERT HELPER
# ────────────────────────────────────────────────────────────────────────────────
def bulk_insert(cur, table: str, columns: list, rows: list,
                page_size: int = 5000, conflict: str = "DO NOTHING") -> None:
    """Wrapper around psycopg2.extras.execute_values with ON CONFLICT handling."""
    if not rows:
        return
    sql = (
        f"INSERT INTO {table} ({', '.join(columns)}) VALUES %s "
        f"ON CONFLICT {conflict}"
    )
    psycopg2.extras.execute_values(cur, sql, rows, page_size=page_size)


# ────────────────────────────────────────────────────────────────────────────────
#  PHASE 1 – INITIAL SEEDING FUNCTIONS
# ────────────────────────────────────────────────────────────────────────────────

def seed_company(cur) -> int:
    cur.execute(
        "INSERT INTO companies (id, name, industry, country) "
        "VALUES (%s, %s, %s, %s) ON CONFLICT (id) DO NOTHING",
        (COMPANY_ID, "Acme Industries Pvt. Ltd.", "Manufacturing", "India"),
    )
    print(f"  ✔  Company id={COMPANY_ID}")
    return COMPANY_ID


def seed_locations(cur, company_id: int) -> list:
    cur.execute(
        "SELECT id FROM locations WHERE company_id = %s ORDER BY id",
        (company_id,),
    )
    existing = [r[0] for r in cur.fetchall()]
    if existing:
        print(f"  ✔  Locations: {len(existing)} already exist")
        return existing

    data = [
        (company_id, "Main Factory Campus",
         "14, Industrial Estate, Phase II", "Pune",   "India"),
        (company_id, "North Warehouse Hub",
         "7, Logistics Park, Sector 12",   "Mumbai", "India"),
    ]
    ids: list = []
    for d in data:
        cur.execute(
            "INSERT INTO locations (company_id, name, address, city, country) "
            "VALUES (%s,%s,%s,%s,%s) RETURNING id",
            d,
        )
        ids.append(cur.fetchone()[0])
    print(f"  ✔  Locations created: {len(ids)}")
    return ids


def seed_zones(cur, location_ids: list) -> list:
    all_ids: list = []
    for i, loc_id in enumerate(location_ids):
        cur.execute(
            "SELECT id FROM zones WHERE location_id = %s ORDER BY id",
            (loc_id,),
        )
        existing = [r[0] for r in cur.fetchall()]
        if existing:
            all_ids.extend(existing)
            continue
        names = ZONE_NAMES if i == 0 else ["Zone C", "Zone D"]
        for zn in names:
            cur.execute(
                "INSERT INTO zones (location_id, name) VALUES (%s,%s) RETURNING id",
                (loc_id, zn),
            )
            all_ids.append(cur.fetchone()[0])
    print(f"  ✔  Zones: {len(all_ids)}")
    return all_ids


def seed_departments(cur, company_id: int, location_ids: list) -> list:
    cur.execute(
        "SELECT id FROM departments WHERE company_id = %s ORDER BY id",
        (company_id,),
    )
    existing = [r[0] for r in cur.fetchall()]
    if existing:
        print(f"  ✔  Departments: {len(existing)} already exist")
        return existing

    loc_cycle = (location_ids * ((len(DEPT_NAMES) // len(location_ids)) + 1))
    dept_ids: list = []
    for i, name in enumerate(DEPT_NAMES):
        cur.execute(
            "INSERT INTO departments (company_id, location_id, name) "
            "VALUES (%s,%s,%s) RETURNING id",
            (company_id, loc_cycle[i], name),
        )
        dept_ids.append(cur.fetchone()[0])
    print(f"  ✔  Departments created: {len(dept_ids)}")
    return dept_ids


def seed_devices(cur, dept_ids: list, dept_name_map: dict) -> list:
    """
    Returns list of (device_id, pattern, power_rating_kw).
    """
    cur.execute("SELECT id, device_type, power_rating_kw FROM devices ORDER BY id")
    existing = cur.fetchall()
    if existing:
        type_to_pattern = {dc[0]: dc[3] for dc in DEVICE_CATALOG}
        result = [
            (int(r[0]), type_to_pattern.get(r[1], "shift"), float(r[2]))
            for r in existing
        ]
        print(f"  ✔  Devices: {len(result)} already exist")
        return result

    devices: list = []
    # Track per-type counter for numbered names
    type_counter: dict = {}
    for _ in range(TARGET_DEVICES):
        cat = random.choice(DEVICE_CATALOG)
        name_tmpl, pw_min, pw_max, pattern, affinities = cat

        preferred = [
            did for did, dname in dept_name_map.items()
            if dname in affinities
        ]
        dept_id = random.choice(preferred if preferred else dept_ids)

        power = round(random.uniform(pw_min, pw_max), 1)
        n = type_counter.get(name_tmpl, 0) + 1
        type_counter[name_tmpl] = n
        full_name = f"{name_tmpl} #{n:02d}"
        status = "active" if random.random() < 0.90 else "inactive"

        cur.execute(
            "INSERT INTO devices "
            "(department_id, name, device_type, power_rating_kw, status) "
            "VALUES (%s,%s,%s,%s,%s) RETURNING id",
            (dept_id, full_name, name_tmpl, power, status),
        )
        dev_id = cur.fetchone()[0]
        devices.append((dev_id, pattern, power))

    print(f"  ✔  Devices created: {len(devices)}")
    return devices


def seed_meters(cur, devices: list, zone_ids: list) -> list:
    """
    Returns list of (meter_id, device_id, pattern, power_rating_kw).
    """
    cur.execute("SELECT id, device_id FROM meters ORDER BY id")
    existing = cur.fetchall()
    if existing:
        dev_info = {d[0]: (d[1], d[2]) for d in devices}  # dev_id → (pattern, power)
        result = []
        for mid, did in existing:
            if did in dev_info:
                pat, pwr = dev_info[did]
                result.append((int(mid), int(did), pat, pwr))
        print(f"  ✔  Meters: {len(result)} already exist")
        return result

    meters: list = []
    dev_info = {d[0]: (d[1], d[2]) for d in devices}
    for i, (dev_id, pattern, power) in enumerate(devices):
        zid = zone_ids[i % len(zone_ids)]
        cur.execute(
            "INSERT INTO meters (zone_id, device_id, meter_type) "
            "VALUES (%s,%s,%s) RETURNING id",
            (zid, dev_id, "smart"),
        )
        mid = cur.fetchone()[0]
        meters.append((mid, dev_id, pattern, power))

    print(f"  ✔  Meters created: {len(meters)}")
    return meters


# ─── ENERGY HISTORICAL DATA ───────────────────────────────────────────────────

def seed_energy_history(cur, conn, meters: list):
    """
    Seed 90 days × 100 meters × 96 (15-min) intervals.
    Flushes to DB every 7 days to keep memory manageable.
    """
    cur.execute("SELECT COUNT(*) FROM energy_readings")
    if cur.fetchone()[0] > 10_000:
        print("  ✔  energy_readings already populated — skipping")
        return

    today     = date.today()
    start_dt  = today - timedelta(days=HISTORY_DAYS)

    total_readings = 0
    total_hourly   = 0
    total_daily    = 0

    readings_buf:     list = []
    hourly_buf:       list = []
    daily_buf:        list = []
    consumption_buf:  list = []

    print(f"  Generating {HISTORY_DAYS} days × {len(meters)} meters × 96 intervals …")
    print(f"  (Target ≈ {HISTORY_DAYS * len(meters) * 96:,} readings)")

    for day_off in range(HISTORY_DAYS):
        cur_date  = start_dt + timedelta(days=day_off)
        weekday   = cur_date.weekday()          # 0 = Mon
        daily_rate = random.uniform(6.0, 9.0)  # ₹ / kWh

        for meter_id, dev_id, pattern, pwr in meters:
            day_kw_vals: list = []

            for hour in range(24):
                hr_ts     = datetime(cur_date.year, cur_date.month, cur_date.day, hour, 0)
                hr_kw:    list = []

                for qtr in range(4):
                    minute = qtr * 15
                    ts = datetime(cur_date.year, cur_date.month, cur_date.day, hour, minute)
                    kw = max(0.01, kw_reading(pattern, hour, minute, weekday, pwr))
                    kw = round(kw, 3)
                    readings_buf.append((meter_id, kw, ts))
                    hr_kw.append(kw)
                    day_kw_vals.append(kw)

                # Hourly aggregate
                avg_kw_hr  = float(np.mean(hr_kw))
                peak_kw_hr = float(np.max(hr_kw))
                kwh_hr     = round(avg_kw_hr * 1.0, 4)   # 1 h window
                hourly_buf.append((
                    meter_id,
                    hr_ts,
                    round(avg_kw_hr,  3),
                    round(peak_kw_hr, 3),
                    kwh_hr,
                ))

            # Daily aggregate
            avg_kw_d   = float(np.mean(day_kw_vals))
            peak_kw_d  = float(np.max(day_kw_vals))
            kwh_d      = round(avg_kw_d * 24.0, 3)
            base_kwh   = round(kwh_d * random.uniform(0.84, 0.96), 3)
            cost       = round(kwh_d * daily_rate, 2)
            emissions  = round(kwh_d * EMISSION_FACTOR, 5)

            daily_buf.append((
                meter_id, cur_date,
                kwh_d, base_kwh,
                round(avg_kw_d, 3), round(peak_kw_d, 3),
                cost, emissions,
                datetime.utcnow(),
            ))
            consumption_buf.append((dev_id, kwh_d, cur_date))

        # Flush every 7 days to avoid large in-memory batches
        if (day_off + 1) % 7 == 0 or day_off == HISTORY_DAYS - 1:
            bulk_insert(cur, "energy_readings",
                        ["meter_id", "reading_kw", "recorded_at"], readings_buf)
            bulk_insert(cur, "energy_agg_hourly",
                        ["meter_id", "hour_start", "avg_kw", "peak_kw", "total_kwh"],
                        hourly_buf)
            bulk_insert(cur, "energy_agg_daily",
                        ["meter_id", "date", "total_kwh", "baseline_kwh",
                         "avg_kw", "peak_kw", "total_cost", "total_emissions",
                         "created_at"],
                        daily_buf)
            bulk_insert(cur, "energy_consumption",
                        ["device_id", "consumption_kwh", "recorded_at"],
                        consumption_buf)
            conn.commit()

            total_readings += len(readings_buf)
            total_hourly   += len(hourly_buf)
            total_daily    += len(daily_buf)
            print(
                f"    Day {day_off+1:3d}/{HISTORY_DAYS}: "
                f"+{len(readings_buf):6,} readings  "
                f"(total {total_readings:,})"
            )
            readings_buf.clear()
            hourly_buf.clear()
            daily_buf.clear()
            consumption_buf.clear()

    print(
        f"  ✔  energy_readings   : {total_readings:,}\n"
        f"  ✔  energy_agg_hourly : {total_hourly:,}\n"
        f"  ✔  energy_agg_daily  : {total_daily:,}"
    )


# ─── CARBON EMISSIONS ────────────────────────────────────────────────────────

def seed_carbon_emissions(cur, company_id: int):
    cur.execute(
        "SELECT COUNT(*) FROM carbon_emissions WHERE company_id = %s",
        (company_id,),
    )
    if cur.fetchone()[0] > 50:
        print("  ✔  carbon_emissions already populated — skipping")
        return

    today = date.today()
    rows: list = []
    for day_off in range(CARBON_DAYS):
        day   = today - timedelta(days=CARBON_DAYS - day_off)
        scale = 1.0 if day.weekday() < 5 else 0.60
        for source, scope, base_val in CARBON_SOURCES:
            noise  = random.gauss(0.0, base_val * 0.08)
            tco2e  = round(max(0.005, (base_val + noise) * scale), 4)
            rows.append((company_id, source, scope, tco2e, day))

    bulk_insert(cur, "carbon_emissions",
                ["company_id", "source", "scope", "emissions_tco2e", "recorded_at"],
                rows, page_size=2000)
    print(f"  ✔  carbon_emissions : {len(rows):,} records")


# ─── ENERGY COSTS ─────────────────────────────────────────────────────────────

def seed_energy_costs(cur, dept_ids: list):
    cur.execute("SELECT COUNT(*) FROM energy_costs")
    if cur.fetchone()[0] > 500:
        print("  ✔  energy_costs already populated — skipping")
        return

    today = date.today()
    rows: list = []
    for day_off in range(HISTORY_DAYS):
        day        = today - timedelta(days=HISTORY_DAYS - day_off)
        daily_rate = random.uniform(6.0, 9.0)
        scale      = 1.0 if day.weekday() < 5 else 0.50
        for dept_id in dept_ids:
            kwh  = random.uniform(400, 1800) * scale
            cost = round(kwh * daily_rate, 2)
            rows.append((dept_id, cost, day))

    bulk_insert(cur, "energy_costs",
                ["department_id", "cost_amount", "recorded_at"],
                rows, page_size=2000)
    print(f"  ✔  energy_costs     : {len(rows):,} records")


# ─── ENERGY ANOMALIES ────────────────────────────────────────────────────────

def seed_anomalies(cur, meters: list):
    cur.execute("SELECT COUNT(*) FROM energy_anomalies")
    if cur.fetchone()[0] > 10:
        print("  ✔  energy_anomalies already populated — skipping")
        return

    now     = datetime.utcnow()
    sample  = random.sample(meters, min(20, len(meters)))
    rows: list = []
    for meter_id, dev_id, pattern, pwr in sample:
        atype     = random.choice(ANOMALY_TYPES)
        threshold = round(pwr * 0.90, 3)

        if atype == "power_spike":
            detected = pwr * random.uniform(1.15, 1.48)
        elif atype == "unexpected_shutdown":
            detected = pwr * random.uniform(0.01, 0.03)
        elif atype == "sustained_abnormal_load":
            detected = pwr * random.uniform(0.96, 1.12)
        else:  # sensor_anomaly / phase_imbalance
            detected = pwr * random.uniform(1.08, 1.35)

        days_ago    = random.randint(1, 60)
        detected_at = now - timedelta(days=days_ago, hours=random.randint(0, 23),
                                      minutes=random.randint(0, 59))
        rows.append((meter_id, atype, round(detected, 3), threshold, detected_at))

    bulk_insert(cur, "energy_anomalies",
                ["meter_id", "anomaly_type", "detected_value",
                 "threshold_value", "detected_at"],
                rows)
    print(f"  ✔  energy_anomalies : {len(rows)} records")


# ─── ENERGY FORECASTS ─────────────────────────────────────────────────────────

def seed_forecasts(cur, meters: list):
    cur.execute("SELECT COUNT(*) FROM energy_forecasts")
    if cur.fetchone()[0] > 100:
        print("  ✔  energy_forecasts already populated — skipping")
        return

    # Pull per-meter daily stats to anchor the forecast
    cur.execute(
        "SELECT meter_id, AVG(total_kwh), COALESCE(STDDEV(total_kwh), 0) "
        "FROM energy_agg_daily GROUP BY meter_id"
    )
    stats = {int(r[0]): (float(r[1]), float(r[2])) for r in cur.fetchall()}

    today = date.today()
    now   = datetime.utcnow()
    rows: list = []
    for meter_id, dev_id, pattern, pwr in meters:
        avg_kwh, std_kwh = stats.get(meter_id, (pwr * 0.65 * 24.0, pwr * 0.05 * 24.0))
        std_kwh = std_kwh if std_kwh > 0 else avg_kwh * 0.08
        for day_ahead in range(1, 15):
            fdate     = today + timedelta(days=day_ahead)
            trend     = avg_kwh * (1.0 + 0.005 * day_ahead)
            noise     = random.gauss(0, std_kwh * 0.10)
            predicted = round(max(0.1, trend + noise), 3)
            rows.append((meter_id, fdate, predicted, "v1", now))

    bulk_insert(cur, "energy_forecasts",
                ["meter_id", "forecast_date", "predicted_kwh",
                 "model_version", "created_at"],
                rows, page_size=2000)
    print(f"  ✔  energy_forecasts : {len(rows):,} records (14 days × {len(meters)} meters)")


# ─── APPLIANCE ACTIVITY ───────────────────────────────────────────────────────

def seed_appliance_activity(cur, devices: list):
    cur.execute("SELECT COUNT(*) FROM appliance_activity")
    if cur.fetchone()[0] > 1000:
        print("  ✔  appliance_activity already populated — skipping")
        return

    now   = datetime.utcnow()
    rows: list = []
    for dev_id, pattern, pwr in devices:
        for day_off in range(30):
            day = now - timedelta(days=day_off)
            wd  = day.weekday()

            if pattern == "constant":
                rows.append((dev_id, "on",
                             day.replace(hour=0, minute=0, second=0, microsecond=0)))

            elif pattern == "shift" and wd < 5:
                on_t  = day.replace(hour=6,  minute=random.randint(0, 20),
                                    second=0, microsecond=0)
                off_t = day.replace(hour=18, minute=random.randint(0, 30),
                                    second=0, microsecond=0)
                rows += [(dev_id, "on", on_t), (dev_id, "off", off_t)]

            elif pattern in ("hvac", "lighting", "office") and wd < 5:
                on_t  = day.replace(hour=7,  minute=random.randint(0, 30),
                                    second=0, microsecond=0)
                off_t = day.replace(hour=20, minute=random.randint(0, 30),
                                    second=0, microsecond=0)
                rows += [(dev_id, "on", on_t), (dev_id, "off", off_t)]

    bulk_insert(cur, "appliance_activity",
                ["device_id", "status", "recorded_at"],
                rows, page_size=3000)
    print(f"  ✔  appliance_activity: {len(rows):,} records")


# ─── RECOMMENDATIONS & AI INSIGHTS ───────────────────────────────────────────

def seed_recommendations(cur, company_id: int):
    cur.execute(
        "SELECT COUNT(*) FROM recommendations WHERE company_id = %s",
        (company_id,),
    )
    if cur.fetchone()[0] > 5:
        print("  ✔  recommendations already populated — skipping")
        return

    now  = datetime.utcnow()
    rows = [(company_id, txt, savings, now) for txt, savings in RECOMMENDATIONS]
    bulk_insert(cur, "recommendations",
                ["company_id", "recommendation_text",
                 "potential_savings_kwh", "created_at"],
                rows)
    print(f"  ✔  recommendations  : {len(rows)} records")


def seed_ai_insights(cur, company_id: int):
    cur.execute(
        "SELECT COUNT(*) FROM ai_insights WHERE company_id = %s",
        (company_id,),
    )
    if cur.fetchone()[0] > 5:
        print("  ✔  ai_insights already populated — skipping")
        return

    now  = datetime.utcnow()
    rows = [(company_id, itype, desc, now) for itype, desc in AI_INSIGHTS]
    bulk_insert(cur, "ai_insights",
                ["company_id", "insight_type", "description", "generated_at"],
                rows)
    print(f"  ✔  ai_insights      : {len(rows)} records")


# ────────────────────────────────────────────────────────────────────────────────
#  PHASE 2 – LIVE SIMULATION LOOP
# ────────────────────────────────────────────────────────────────────────────────

def simulate_live(meters: list, dept_ids: list, company_id: int) -> None:
    """
    Runs indefinitely (Ctrl-C to stop).
    Every SIMULATE_INTERVAL_S seconds:
      1. Insert fresh energy_readings for all meters.
      2. Upsert energy_agg_hourly for the current hour.
      3. Upsert energy_agg_daily  for today.
      4. Log appliance_activity status events.
      5. 5 % chance → insert a new energy_anomaly.
      6. Every 6th tick → refresh today's energy_costs per department.
    """
    print(f"\n{'═'*62}")
    print("  🔁  Live simulation started  (Ctrl-C to stop)")
    print(f"      Interval : {SIMULATE_INTERVAL_S} s  |  Meters : {len(meters)}")
    print(f"{'═'*62}\n")

    tick = 0

    while True:
        try:
            conn = get_conn()
            cur  = conn.cursor()

            now         = datetime.utcnow()
            hour_start  = now.replace(minute=0, second=0, microsecond=0)
            today       = now.date()
            weekday     = today.weekday()
            daily_rate  = random.uniform(6.0, 9.0)

            # ── 1. New energy readings ────────────────────────────────────────
            reading_rows = [
                (mid, round(max(0.01, kw_reading(pat, now.hour, now.minute,
                                                  weekday, pwr)), 3), now)
                for mid, did, pat, pwr in meters
            ]
            bulk_insert(cur, "energy_readings",
                        ["meter_id", "reading_kw", "recorded_at"],
                        reading_rows, conflict="DO NOTHING")

            # ── 2. Hourly aggregates (current hour) ───────────────────────────
            hourly_rows: list = []
            for mid, did, pat, pwr in meters:
                cur.execute(
                    "SELECT AVG(reading_kw), MAX(reading_kw), COUNT(*) "
                    "FROM energy_readings "
                    "WHERE meter_id = %s AND recorded_at >= %s AND recorded_at < %s",
                    (mid, hour_start, hour_start + timedelta(hours=1)),
                )
                r = cur.fetchone()
                if r and r[2] > 0:
                    avg_kw  = float(r[0])
                    peak_kw = float(r[1])
                    kwh     = round(avg_kw * float(r[2]) / 4.0, 4)  # n 15-min slots
                    hourly_rows.append((mid, hour_start,
                                        round(avg_kw, 3), round(peak_kw, 3), kwh))

            if hourly_rows:
                bulk_insert(cur, "energy_agg_hourly",
                            ["meter_id", "hour_start", "avg_kw", "peak_kw", "total_kwh"],
                            hourly_rows, conflict="DO NOTHING")

            # ── 3. Daily aggregates (today) ───────────────────────────────────
            daily_rows: list = []
            consumption_rows: list = []
            for mid, did, pat, pwr in meters:
                cur.execute(
                    "SELECT AVG(reading_kw), MAX(reading_kw), COUNT(*) "
                    "FROM energy_readings "
                    "WHERE meter_id = %s AND recorded_at::date = %s",
                    (mid, today),
                )
                r = cur.fetchone()
                if r and r[2] > 0:
                    avg_kw  = float(r[0])
                    peak_kw = float(r[1])
                    kwh_d   = round(avg_kw * 24.0, 3)
                    base    = round(kwh_d * 0.92, 3)
                    cost    = round(kwh_d * daily_rate, 2)
                    emiss   = round(kwh_d * EMISSION_FACTOR, 5)
                    daily_rows.append((mid, today, kwh_d, base,
                                       round(avg_kw, 3), round(peak_kw, 3),
                                       cost, emiss, now))
                    consumption_rows.append((did, kwh_d, today))

            if daily_rows:
                bulk_insert(cur, "energy_agg_daily",
                            ["meter_id", "date", "total_kwh", "baseline_kwh",
                             "avg_kw", "peak_kw", "total_cost", "total_emissions",
                             "created_at"],
                            daily_rows, conflict="DO NOTHING")

            if consumption_rows:
                bulk_insert(cur, "energy_consumption",
                            ["device_id", "consumption_kwh", "recorded_at"],
                            consumption_rows, conflict="DO NOTHING")

            # ── 4. Appliance activity ─────────────────────────────────────────
            sample_meters = random.sample(meters, min(15, len(meters)))
            app_rows = []
            for mid, did, pat, pwr in sample_meters:
                kw     = kw_reading(pat, now.hour, now.minute, weekday, pwr)
                status = "on" if kw > pwr * 0.10 else "off"
                app_rows.append((did, status, now))
            bulk_insert(cur, "appliance_activity",
                        ["device_id", "status", "recorded_at"],
                        app_rows, conflict="DO NOTHING")

            # ── 5. Occasional anomaly (5 % probability) ───────────────────────
            if random.random() < 0.05:
                mid, did, pat, pwr = random.choice(meters)
                atype     = random.choice(ANOMALY_TYPES)
                threshold = round(pwr * 0.90, 3)
                detected  = round(pwr * random.uniform(1.15, 1.50), 3)
                cur.execute(
                    "INSERT INTO energy_anomalies "
                    "(meter_id, anomaly_type, detected_value, threshold_value, detected_at) "
                    "VALUES (%s,%s,%s,%s,%s)",
                    (mid, atype, detected, threshold, now),
                )

            # ── 6. Energy costs refresh (every 6 ticks ≈ 1 min) ──────────────
            if tick % 6 == 0:
                for dept_id in dept_ids:
                    cur.execute(
                        "SELECT SUM(ad.total_cost) "
                        "FROM energy_agg_daily ad "
                        "JOIN meters m  ON m.id = ad.meter_id "
                        "JOIN devices d ON d.id = m.device_id "
                        "WHERE d.department_id = %s AND ad.date = %s",
                        (dept_id, today),
                    )
                    row  = cur.fetchone()
                    cost = float(row[0]) if row and row[0] else random.uniform(800, 2500)

                    cur.execute(
                        "SELECT id FROM energy_costs "
                        "WHERE department_id = %s AND recorded_at = %s",
                        (dept_id, today),
                    )
                    if not cur.fetchone():
                        cur.execute(
                            "INSERT INTO energy_costs "
                            "(department_id, cost_amount, recorded_at) "
                            "VALUES (%s,%s,%s)",
                            (dept_id, round(cost, 2), today),
                        )

            conn.commit()
            tick += 1

            if tick % 6 == 0:
                print(
                    f"[{now.strftime('%H:%M:%S')}] tick #{tick:5d} | "
                    f"{len(reading_rows):3d} readings  "
                    f"| anomaly={'YES' if random.random() < 0.05 else 'no '}"
                )

        except KeyboardInterrupt:
            print("\n  Simulation stopped by user.")
            break
        except Exception as exc:
            print(f"  ⚠  Simulation error: {exc}")
            try:
                conn.rollback()
            except Exception:
                pass
        finally:
            try:
                cur.close()
                conn.close()
            except Exception:
                pass

        time.sleep(SIMULATE_INTERVAL_S)


# ────────────────────────────────────────────────────────────────────────────────
#  ENTRY POINT
# ────────────────────────────────────────────────────────────────────────────────

def main() -> None:
    print("\n" + "═" * 62)
    print("  EN-VISION  –  Data Seeder & Live Simulator")
    print("═" * 62 + "\n")

    conn = get_conn()
    cur  = conn.cursor()

    try:
        print("【1/9】 Company …")
        company_id = seed_company(cur)
        conn.commit()

        print("【2/9】 Locations …")
        location_ids = seed_locations(cur, company_id)
        conn.commit()

        print("【3/9】 Zones …")
        zone_ids = seed_zones(cur, location_ids)
        conn.commit()

        print("【4/9】 Departments …")
        dept_ids = seed_departments(cur, company_id, location_ids)
        cur.execute(
            "SELECT id, name FROM departments WHERE company_id = %s",
            (company_id,),
        )
        dept_name_map = {int(r[0]): r[1] for r in cur.fetchall()}
        conn.commit()

        print("【5/9】 Devices …")
        devices = seed_devices(cur, dept_ids, dept_name_map)
        conn.commit()

        print("【6/9】 Meters …")
        meters = seed_meters(cur, devices, zone_ids)
        conn.commit()

        print("【7/9】 Energy history (90 days) …")
        seed_energy_history(cur, conn, meters)

        print("【8/9】 Supporting tables …")
        seed_carbon_emissions(cur, company_id)
        conn.commit()

        seed_energy_costs(cur, dept_ids)
        conn.commit()

        seed_anomalies(cur, meters)
        seed_forecasts(cur, meters)
        conn.commit()

        seed_appliance_activity(cur, devices)
        conn.commit()

        seed_recommendations(cur, company_id)
        seed_ai_insights(cur, company_id)
        conn.commit()

        print("\n【9/9】 Initial seeding complete!")
        print("\n  Summary of target volumes:")
        print(f"    energy_readings    target ≥ 500,000")
        print(f"    energy_agg_hourly  target ≥ 200,000")
        print(f"    energy_agg_daily   target ≥   9,000")
        print(f"    energy_forecasts        ≈   1,400")
        print(f"    energy_anomalies        ≈      20")
        print(f"    recommendations         =      {len(RECOMMENDATIONS)}")
        print(f"    ai_insights             =      {len(AI_INSIGHTS)}")

    except Exception as exc:
        conn.rollback()
        print(f"\n❌  Seeding failed: {exc}")
        raise
    finally:
        cur.close()
        conn.close()

    # Hand off to live simulation
    simulate_live(meters, dept_ids, company_id)


if __name__ == "__main__":
    main()
