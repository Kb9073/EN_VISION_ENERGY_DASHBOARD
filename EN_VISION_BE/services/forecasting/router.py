from fastapi import APIRouter
from services.forecasting.xgboost_model import run_xgboost_forecast
from services.forecasting.lstm_model import run_lstm_forecast

router = APIRouter()

@router.post("/xgboost")
def forecast_xgboost():
    run_xgboost_forecast()
    return {"status": "XGBoost forecast generated"}

@router.post("/lstm")
def forecast_lstm():
    from services.forecasting.lstm_model import run_lstm_forecast
    run_lstm_forecast()
    return {"status": "LSTM forecast generated"}
