import csv
import random
from datetime import datetime, timedelta

OUTPUT_FILE = "energy_events.csv"

DAYS = 120
READINGS_PER_DAY = 48  # every 30 minutes

DEPARTMENTS = ["manufacturing", "rnd", "admin"]
DEVICES = {
    "manufacturing": ["DEV_01", "DEV_02"],
    "rnd": ["DEV_03"],
    "admin": ["DEV_04"]
}

SOURCE_TYPE = "sensor"  # consistent, realistic source


def generate_energy_events():
    now = datetime.now()
    start_time = now - timedelta(days=DAYS)

    rows = []
    current = start_time

    while current < now:
        hour = current.hour
        weekday = current.weekday()
        is_weekend = weekday >= 5

        for dept in DEPARTMENTS:
            for device in DEVICES[dept]:

                # Base kWh per 30-min interval
                base = {
                    "manufacturing": 4.8,
                    "rnd": 2.6,
                    "admin": 1.8
                }[dept]

                # Office hours effect
                if 8 <= hour <= 18:
                    base *= 1.25
                else:
                    base *= 0.75

                # Weekend reduction
                if is_weekend:
                    base *= 0.7

                # Noise ±10%
                base *= random.uniform(0.9, 1.1)

                # Rare spike (enterprise realism)
                if random.random() < 0.002:
                    base *= random.uniform(2.0, 3.5)

                rows.append([
                    current.strftime("%Y-%m-%d %H:%M:%S"),
                    device,
                    dept,
                    round(base, 3),
                    SOURCE_TYPE
                ])

        current += timedelta(minutes=30)

    # Sort chronologically (important for ingestion + analytics)
    rows.sort(key=lambda r: r[0])

    with open(OUTPUT_FILE, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "timestamp",
            "device_id",
            "department_id",
            "kwh",
            "source_type"
        ])
        writer.writerows(rows)

    print(f"✅ Generated {len(rows)} raw energy events → {OUTPUT_FILE}")


if __name__ == "__main__":
    generate_energy_events()
