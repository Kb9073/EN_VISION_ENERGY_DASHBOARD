from fastapi import APIRouter

from services.dashboard.kpis.router import router as kpis_router
from services.dashboard.energy_trend.router import router as energy_trend_router
from services.dashboard.carbon.router import router as carbon_router
from services.dashboard.cost.router import router as cost_router
from services.dashboard.appliances.router import router as appliances_router
from services.dashboard.anomaly.router import router as anomaly_router
from services.dashboard.filters.router import router as filters_router
from services.dashboard.forecast.router import router as forecast_router
from services.dashboard.location_consumption.router import router as location_router
from services.dashboard.ai_insights.router import router as ai_insights_router

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)

router.include_router(kpis_router)
router.include_router(energy_trend_router)
router.include_router(carbon_router)
router.include_router(cost_router)
router.include_router(appliances_router)
router.include_router(anomaly_router)
router.include_router(filters_router)
router.include_router(forecast_router)
router.include_router(location_router)
router.include_router(ai_insights_router)