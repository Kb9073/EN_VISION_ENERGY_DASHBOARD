# EN VISION ENERGY DASHBOARD

I built this project to monitor and optimize energy performance for industrial and enterprise environments. The platform combines a FastAPI backend with a Next.js frontend and provides KPI-driven insights for energy, cost, carbon footprint, equipment usage, and anomalies.

My goal with this project was to create an end-to-end, practical dashboard system that supports both data visibility and operational decision-making.

## Project Overview

This repository includes:

- A backend API layer for energy analytics and dashboard services
- A frontend dashboard experience with interactive tabs and filters
- Authentication and protected routes
- Bill parsing and ingestion workflows
- Data generation, aggregation, and utility scripts

## Key KPIs I Track

The dashboard is structured around core KPIs that matter for energy operations:

1. Total Energy Consumption
- Total kWh consumed over a selected period.
- Helps track operational load and identify high-usage windows.

2. Energy Saved
- Estimated savings relative to baseline/expected usage.
- Helps quantify efficiency improvements.

3. Over Consumption Percent
- Percentage by which actual usage exceeds baseline.
- Useful for quick risk flagging and preventive actions.

4. CO2 Emissions
- Carbon output associated with energy usage.
- Supports sustainability and ESG reporting.

5. Average and Peak Consumption
- Average load and peak demand values.
- Useful for demand management, tariff optimization, and capacity planning.

6. Total Cost
- Energy cost computed from tariff logic and usage.
- Connects engineering metrics to financial impact.

7. Anomaly Metrics
- Total anomalies, severity split, and anomaly days.
- Helps identify unusual behavior and potential faults.

8. Forecast Metrics
- Predicted kWh, cost, and emissions for future windows.
- Supports planning and proactive control.

## Skills Demonstrated In This Project

This project reflects my practical skills in:

- Backend API architecture with FastAPI
- Database modeling and query optimization with SQLAlchemy
- Time-series style aggregation and analytics logic
- KPI computation and fallback strategy design
- Anomaly detection logic (z-score based)
- Frontend dashboard engineering with React and TypeScript
- Data visualization and UI composition for analytics use cases
- Authentication, route protection, and API integration
- Debugging full-stack data consistency issues

## Technology Stack

Backend
- FastAPI
- SQLAlchemy ORM
- PostgreSQL
- Pydantic
- Uvicorn

Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- Recharts
- TanStack Query

Data and Utilities
- NumPy
- Pandas
- Python-based seed/simulation scripts

## Repository Structure

- EN_VISION_BE: Backend APIs, services, models, schemas, jobs, and scripts
- EN_VISION_FE: Frontend application, dashboard tabs, components, and hooks
- Project Documents: Project documentation assets (excluded from tracking via gitignore)

## Local Setup and Run

Backend

1. cd EN_VISION_BE
2. . .\scripts\activate_venv.ps1
3. python -m uvicorn main:app --host 127.0.0.1 --port 8000

Frontend

1. cd EN_VISION_FE
2. npm install
3. npm run dev

## Notes

- The backend includes data fallback logic so dashboard panels can still populate when aggregate tables are sparse.
- The codebase is actively evolving, and I continue improving data quality, API reliability, and UI usability.
