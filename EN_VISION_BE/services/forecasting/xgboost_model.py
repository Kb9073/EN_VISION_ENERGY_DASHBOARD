import pandas as pd
from sqlalchemy import text
from db.session import engine
from xgboost import XGBRegressor


def run_xgboost_forecast(days_ahead=7):
    """
    Forecast energy usage using XGBoost
    """

    df = pd.read_sql("""
        SELECT date, department_id, device_id, total_kwh
        FROM daily_energy_summary
        ORDER BY date
    """, engine)

    if df.empty:
        return

    df["date"] = pd.to_datetime(df["date"])
    df["day_of_week"] = df["date"].dt.dayofweek
    df["month"] = df["date"].dt.month

    # Lag features
    df["lag_1"] = df.groupby(["department_id", "device_id"])["total_kwh"].shift(1)
    df["lag_7"] = df.groupby(["department_id", "device_id"])["total_kwh"].shift(7)
    df.dropna(inplace=True)

    features = ["day_of_week", "month", "lag_1", "lag_7"]
    target = "total_kwh"

    model = XGBRegressor(
        n_estimators=100,
        learning_rate=0.1,
        max_depth=4,
        random_state=42
    )

    forecasts = []

    for (dept, dev), group in df.groupby(["department_id", "device_id"]):
        X = group[features]
        y = group[target]

        model.fit(X, y)

        last_row = group.iloc[-1]
        future_date = last_row["date"]

        for _ in range(days_ahead):
            future_date += pd.Timedelta(days=1)

            future_features = [[
                future_date.dayofweek,
                future_date.month,
                last_row["lag_1"],
                last_row["lag_7"]
            ]]

            pred = model.predict(future_features)[0]

            forecasts.append({
                "forecast_date": future_date.date(),
                "department_id": dept,
                "device_id": dev,
                "model_type": "XGBOOST",
                "predicted_kwh": round(float(pred), 2)
            })

    with engine.begin() as conn:
        conn.execute(text("DELETE FROM energy_forecasts WHERE model_type='XGBOOST';"))
        for f in forecasts:
            conn.execute(text("""
                INSERT INTO energy_forecasts
                (forecast_date, department_id, device_id, model_type, predicted_kwh)
                VALUES (:forecast_date, :department_id, :device_id, :model_type, :predicted_kwh)
            """), f)
