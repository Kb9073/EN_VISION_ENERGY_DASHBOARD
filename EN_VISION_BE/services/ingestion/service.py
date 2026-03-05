import pandas as pd
import uuid
import logging

from fastapi import UploadFile, HTTPException
from sqlalchemy import text
from psycopg2.extras import Json

from db.session import engine

logger = logging.getLogger(__name__)


def ingest_csv_file(file: UploadFile):
    try:
        # 1️⃣ Read CSV
        df = pd.read_csv(file.file)

        required_columns = {
            "timestamp",
            "device_id",
            "department_id",
            "kwh",
            "source_type",
        }

        if not required_columns.issubset(df.columns):
            raise ValueError(
                f"Missing required columns: {required_columns - set(df.columns)}"
            )

        batch_id = str(uuid.uuid4())
        df["ingestion_batch_id"] = batch_id

        # 2️⃣ Insert raw data
        df.to_sql(
            "energy_events",
            engine,
            if_exists="append",
            index=False,
            method="multi",
        )

        # 3️⃣ Audit log (always succeeds if ingestion succeeded)
        with engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO audit_logs (
                        service_name,
                        event_type,
                        payload
                    )
                    VALUES (
                        :service_name,
                        :event_type,
                        :payload
                    )
                """),
                {
                    "service_name": "ingestion_service",
                    "event_type": "CSV_INGEST",
                    "payload": Json({
                        "file_name": file.filename,
                        "rows_ingested": len(df),
                        "batch_id": batch_id,
                    }),
                },
            )

        # 4️⃣ Trigger analytics pipeline (lazy imports = no circular deps)
        try:
            from services.analytics.daily_summary import run_daily_energy_summary
            from services.analytics.baseline import run_baseline_metrics
            from services.analytics.deviation import run_deviation_detection
            from services.anomaly.isolation_forest import run_isolation_forest

            run_daily_energy_summary()
            run_baseline_metrics()
            run_deviation_detection()
            run_isolation_forest()

        except Exception as analytics_error:
            logger.error(
                f"Analytics pipeline failed for batch {batch_id}: {analytics_error}"
            )

        return {
            "status": "success",
            "records_ingested": len(df),
            "batch_id": batch_id,
            "analytics_triggered": True,
        }

    except Exception as e:
        logger.exception("CSV ingestion failed")
        raise HTTPException(
            status_code=500,
            detail=f"Ingestion failed: {str(e)}",
        )

