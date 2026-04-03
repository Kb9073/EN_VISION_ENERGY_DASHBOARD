# EN VISION ENERGY DASHBOARD

I built this project to monitor energy consumption, cost, carbon impact, and anomalies across a multi-location setup with both backend analytics and a modern frontend dashboard.

This repository contains the cleaned project structure with backend services, frontend dashboard modules, auth flows, bill parsing support, scripts, and project documentation.

## What I Built

- A FastAPI backend for energy analytics APIs
- A Next.js frontend dashboard for KPIs, trends, anomalies, and forecasting
- Department and device level filtering across dashboard modules
- Bill parser and ingestion flow for electricity bill based data updates
- Utility scripts for data generation, seeding, aggregation, and local environment setup

## Project Structure

- EN_VISION_BE: backend APIs, models, services, scripts, data utilities
- EN_VISION_FE: frontend app, dashboard UI components, API client hooks
- Project Documents: project related documents and references

## Tech Stack

- Backend: FastAPI, SQLAlchemy, PostgreSQL
- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Data and Analytics: pandas, numpy, custom aggregation and anomaly logic

## Local Run

### Backend

1. cd EN_VISION_BE
2. . .\scripts\activate_venv.ps1
3. python -m uvicorn main:app --host 127.0.0.1 --port 8000

### Frontend

1. cd EN_VISION_FE
2. npm install
3. npm run dev

## Notes

- This codebase currently includes dashboard improvements and data fallback handling so charts can still render when aggregate tables are sparse.
- The repository reflects an actively evolving implementation, and I continue to refine both accuracy and usability.
