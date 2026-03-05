import client from "@/lib/api/client"
import config from "@/lib/config"

/* =============================================================================
   ENVELOPE
============================================================================= */

export interface StandardResponse<T> {
  success: boolean
  data: T
  timestamp: string
}

/* =============================================================================
   DOMAIN TYPES
============================================================================= */

export interface KPIMetric {
  value: number
  unit?: string
  delta: number
  period?: string
}

export interface DashboardKPIs {
  totalEnergyConsumption: KPIMetric
  energySaved: KPIMetric
  overConsumptionPercent: KPIMetric
  co2Emissions: KPIMetric
  avgConsumption: number
  peakConsumption: number
  totalCost: number
  systemStatus: "stable" | "at-risk"
  sustainabilityStatus: "on-track" | "deviating"
}

export interface EnergyTrendPoint {
  timestamp: string
  total_kwh: number
  total_cost: number
  total_emissions: number
  peak_power: number
  baseline_kwh: number
}

export interface CarbonTotal {
  total_emissions: number
}

export interface CarbonBreakdownItem {
  source: string
  value: number
}

export interface CarbonScopeItem {
  scope: string
  value: number
}

export interface ApplianceSummary {
  total_devices: number
  active_devices: number
  inactive_devices: number
}

export interface ApplianceItem {
  device_id?: number
  device_name?: string
  name?: string
  usage?: number
  total_kwh?: number
  baseline_kwh?: number
  deviation?: number
}

export interface DeviationItem {
  zone: string
  actual: number
  baseline: number
  deviation: number
  deviationPercent: number
}

export interface DeviationOverTimePoint {
  date: string
  deviation: number
}

// ── Anomaly (new real implementation) ───────────────────
export interface AnomalyDataPoint {
  date: string
  actual: number
  baseline: number
  expected: number
  deviation: number
  deviation_percent: number
  z_score: number
  is_anomaly: boolean
  severity: "normal" | "low" | "medium" | "high" | "critical"
}

export interface AnomalyResponse {
  series: AnomalyDataPoint[]
  anomalies: AnomalyDataPoint[]
  total_anomalies: number
  critical_count: number
  high_count: number
}

// ── Forecast (new real implementation) ──────────────────
export interface ForecastPoint {
  date: string
  predicted_kwh: number
  predicted_cost: number
  predicted_emissions: number
  lower_bound: number
  upper_bound: number
  is_forecast: true
}

export interface HistoricalPoint {
  date: string
  actual_kwh: number
  actual_cost: number
  actual_emissions: number
  baseline_kwh: number
  is_forecast: false
}

export interface ForecastSummary {
  horizon_days: number
  total_predicted_kwh: number
  total_predicted_cost: number
  total_predicted_emissions: number
  avg_daily_kwh: number
  trend_direction: "up" | "down" | "stable"
}

export interface ForecastResponse {
  historical: HistoricalPoint[]
  forecast: ForecastPoint[]
  summary: ForecastSummary
}

// ── Location Consumption ─────────────────────────────────
export interface LocationConsumptionItem {
  zone: string
  location: string
  total_kwh: number
  baseline_kwh: number
  total_cost: number
  peak_kw: number
  deviation: number
  percentage: number
}

// ── AI Insights ───────────────────────────────────────────
export interface AIInsightItem {
  id: string
  title: string
  description: string
  severity: "low" | "medium" | "high"
  category: "efficiency" | "trend" | "anomaly" | "zone" | "carbon" | "sustainability"
  timestamp: string
}

/* =============================================================================
   PARAMS
============================================================================= */

function withCompany(params?: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {
    ...(params ?? {}),
    company_id: config.companyId,
  }
  // Strip null/undefined so they're never sent as query params
  Object.keys(result).forEach((key) => {
    if (result[key] === null || result[key] === undefined) {
      delete result[key]
    }
  })
  return result
}

/* =============================================================================
   UNWRAP HELPER
============================================================================= */

async function unwrap<T>(
  promise: Promise<StandardResponse<T>>,
  fallback: T
): Promise<T> {
  try {
    const res = await promise
    if (res?.success && res.data !== undefined && res.data !== null) {
      return res.data
    }
    return fallback
  } catch {
    return fallback
  }
}

/* =============================================================================
   API FUNCTIONS
============================================================================= */

/** GET /dashboard/kpis */
export async function getKPIs(
  params?: Record<string, unknown>
): Promise<DashboardKPIs> {
  const fallback: DashboardKPIs = {
    totalEnergyConsumption: { value: 0, delta: 0 },
    energySaved: { value: 0, delta: 0 },
    overConsumptionPercent: { value: 0, delta: 0 },
    co2Emissions: { value: 0, delta: 0 },
    avgConsumption: 0,
    peakConsumption: 0,
    totalCost: 0,
    systemStatus: "stable",
    sustainabilityStatus: "on-track",
  }
  return unwrap(
    client.get<StandardResponse<DashboardKPIs>>(
      "/dashboard/kpis",
      withCompany(params)
    ),
    fallback
  )
}

/** GET /dashboard/energy-trend */
export async function getEnergyTrend(
  params?: Record<string, unknown>
): Promise<EnergyTrendPoint[]> {
  const raw = await unwrap(
    client.get<StandardResponse<EnergyTrendPoint[]>>(
      "/dashboard/energy-trend",
      withCompany(params)
    ),
    []
  )
  if (!Array.isArray(raw)) return []
  return raw.map((item) => ({
    timestamp: item.timestamp,
    total_kwh: Number(item.total_kwh ?? 0),
    total_cost: Number(item.total_cost ?? 0),
    total_emissions: Number(item.total_emissions ?? 0),
    peak_power: Number(item.peak_power ?? 0),
    baseline_kwh: Number(item.baseline_kwh ?? 0),
  }))
}

/** GET /dashboard/carbon/total */
export async function getCarbonTotal(
  params?: Record<string, unknown>
): Promise<CarbonTotal> {
  return unwrap(
    client.get<StandardResponse<CarbonTotal>>(
      "/dashboard/carbon/total",
      withCompany(params)
    ),
    { total_emissions: 0 }
  )
}

/** GET /dashboard/carbon/breakdown */
export async function getCarbonBreakdown(
  params?: Record<string, unknown>
): Promise<CarbonBreakdownItem[]> {
  const raw = await unwrap(
    client.get<StandardResponse<CarbonBreakdownItem[]>>(
      "/dashboard/carbon/breakdown",
      withCompany(params)
    ),
    []
  )
  return Array.isArray(raw) ? raw : []
}

/** GET /dashboard/carbon/scope */
export async function getCarbonScope(
  params?: Record<string, unknown>
): Promise<CarbonScopeItem[]> {
  const raw = await unwrap(
    client.get<StandardResponse<CarbonScopeItem[]>>(
      "/dashboard/carbon/scope",
      withCompany(params)
    ),
    []
  )
  return Array.isArray(raw) ? raw : []
}

/** GET /dashboard/appliances/summary */
export async function getAppliancesSummary(
  params?: Record<string, unknown>
): Promise<ApplianceSummary> {
  return unwrap(
    client.get<StandardResponse<ApplianceSummary>>(
      "/dashboard/appliances/summary",
      withCompany(params)
    ),
    { total_devices: 0, active_devices: 0, inactive_devices: 0 }
  )
}

/** GET /dashboard/appliances/usage */
export async function getAppliancesUsage(
  params?: Record<string, unknown>
): Promise<ApplianceItem[]> {
  const raw = await unwrap(
    client.get<StandardResponse<ApplianceItem[]>>(
      "/dashboard/appliances/usage",
      withCompany(params)
    ),
    []
  )
  return Array.isArray(raw) ? raw : []
}

/** GET /dashboard/deviations */
export async function getDeviations(
  params?: Record<string, unknown>
): Promise<DeviationItem[]> {
  const raw = await unwrap(
    client.get<StandardResponse<DeviationItem[]>>(
      "/dashboard/deviations",
      withCompany(params)
    ),
    []
  )
  return Array.isArray(raw) ? raw : []
}

/** GET /dashboard/deviation-over-time */
export async function getDeviationOverTime(
  params?: Record<string, unknown>
): Promise<DeviationOverTimePoint[]> {
  const raw = await unwrap(
    client.get<StandardResponse<DeviationOverTimePoint[]>>(
      "/dashboard/deviation-over-time",
      withCompany(params)
    ),
    []
  )
  return Array.isArray(raw) ? raw : []
}

/** GET /dashboard/anomalies — real Z-score detection */
export async function getAnomalies(
  params?: Record<string, unknown>
): Promise<AnomalyResponse> {
  const fallback: AnomalyResponse = {
    series: [],
    anomalies: [],
    total_anomalies: 0,
    critical_count: 0,
    high_count: 0,
  }
  return unwrap(
    client.get<StandardResponse<AnomalyResponse>>(
      "/dashboard/anomalies",
      withCompany(params)
    ),
    fallback
  )
}

/** GET /dashboard/forecast — weighted rolling forecast */
export async function getForecast(
  params?: Record<string, unknown>
): Promise<ForecastResponse> {
  const fallback: ForecastResponse = {
    historical: [],
    forecast: [],
    summary: {
      horizon_days: 7,
      total_predicted_kwh: 0,
      total_predicted_cost: 0,
      total_predicted_emissions: 0,
      avg_daily_kwh: 0,
      trend_direction: "stable",
    },
  }
  return unwrap(
    client.get<StandardResponse<ForecastResponse>>(
      "/dashboard/forecast",
      withCompany(params)
    ),
    fallback
  )
}

/** GET /dashboard/location-consumption */
export async function getLocationConsumption(
  params?: Record<string, unknown>
): Promise<LocationConsumptionItem[]> {
  const raw = await unwrap(
    client.get<StandardResponse<LocationConsumptionItem[]>>(
      "/dashboard/location-consumption",
      withCompany(params)
    ),
    []
  )
  return Array.isArray(raw) ? raw : []
}

/** GET /dashboard/ai-insights — rule-based engine */
export async function getAIInsights(
  params?: Record<string, unknown>
): Promise<AIInsightItem[]> {
  const raw = await unwrap(
    client.get<StandardResponse<AIInsightItem[]>>(
      "/dashboard/ai-insights",
      withCompany(params)
    ),
    []
  )
  return Array.isArray(raw) ? raw : []
}