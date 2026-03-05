from fastapi import FastAPI, UploadFile, File
import pandas as pd
from services.ingestion.service import ingest_dataframe
from io import BytesIO

app = FastAPI(title="En-Vision Platform API")


@app.post("/ingest/csv")
async def ingest_csv(file: UploadFile = File(...)):
    contents = await file.read()
    df = pd.read_csv(BytesIO(contents))

    required_cols = {"timestamp", "device_id", "department_id", "kwh"}
    if not required_cols.issubset(df.columns):
        return {"error": "Invalid CSV format"}

    df["timestamp"] = pd.to_datetime(df["timestamp"])
    ingest_dataframe(df, source_type="csv")

    return {"status": "success", "rows": len(df)}
