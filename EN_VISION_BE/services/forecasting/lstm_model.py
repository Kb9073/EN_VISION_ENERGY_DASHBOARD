def run_lstm_forecast(days_ahead=7):
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense
    import numpy as np
    import pandas as pd
    from sqlalchemy import text
    from db.session import engine
    """
    LSTM-based time series forecasting
    """

    df = pd.read_sql("""
        SELECT date, department_id, device_id, total_kwh
        FROM daily_energy_summary
        ORDER BY date
    """, engine)

    if df.empty:
        return

    df["date"] = pd.to_datetime(df["date"])

    forecasts = []

    for (dept, dev), group in df.groupby(["department_id", "device_id"]):
        series = group["total_kwh"].values

        if len(series) < 20:
            continue

        X, y = [], []
        for i in range(len(series) - 5):
            X.append(series[i:i+5])
            y.append(series[i+5])

        X, y = np.array(X), np.array(y)
        X = X.reshape((X.shape[0], X.shape[1], 1))

        model = Sequential([
            LSTM(50, activation="relu", input_shape=(5, 1)),
            Dense(1)
        ])

        model.compile(optimizer="adam", loss="mse")
        model.fit(X, y, epochs=20, verbose=0)

        last_seq = series[-5:]

        future_date = group["date"].iloc[-1]

        for _ in range(days_ahead):
            pred = model.predict(last_seq.reshape(1, 5, 1), verbose=0)[0][0]
            future_date += pd.Timedelta(days=1)

            forecasts.append({
                "forecast_date": future_date.date(),
                "department_id": dept,
                "device_id": dev,
                "model_type": "LSTM",
                "predicted_kwh": round(float(pred), 2)
            })

            last_seq = np.append(last_seq[1:], pred)

    with engine.begin() as conn:
        conn.execute(text("DELETE FROM energy_forecasts WHERE model_type='LSTM';"))
        for f in forecasts:
            conn.execute(text("""
                INSERT INTO energy_forecasts
                (forecast_date, department_id, device_id, model_type, predicted_kwh)
                VALUES (:forecast_date, :department_id, :device_id, :model_type, :predicted_kwh)
            """), f)
