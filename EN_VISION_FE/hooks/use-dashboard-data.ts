"use client"

import { useQuery } from "@tanstack/react-query"
import {
  getKPIs,
  getEnergyTrend,
  getCarbonTotal,
  getCarbonBreakdown,
  getCarbonScope,
  getAppliancesSummary,
  getAppliancesUsage,
  getDeviations,
  getDeviationOverTime,
  getAnomalies,
  getForecast,
  getLocationConsumption,
  getAIInsights,
  type ApplianceSummary,
  type AnomalyResponse,
  type ForecastResponse,
} from "@/lib/api/dashboard"
import { getDepartments, getDevices } from "@/lib/api/filters"
import type { TimeRange } from "@/components/dashboard/filter-controls"

/* =============================================================================
   CONSTANTS
============================================================================= */

const REFETCH_INTERVAL = 20_000
const STALE_TIME = 10_000
const FILTER_STALE_TIME = 5 * 60_000  // departments/devices change rarely

/* =============================================================================
   FILTER TYPES
============================================================================= */

export interface DashboardFilters {
  timeRange?: TimeRange
  start_date?: string
  end_date?: string
  department_id?: number | null
  device_id?: number | null
}

function toApiParams(filters: DashboardFilters): Record<string, unknown> {
  return {
    ...(filters.timeRange ? { range: filters.timeRange } : {}),
    ...(filters.start_date ? { start_date: filters.start_date } : {}),
    ...(filters.end_date ? { end_date: filters.end_date } : {}),
    ...(filters.department_id ? { department_id: filters.department_id } : {}),
    ...(filters.device_id ? { device_id: filters.device_id } : {}),
  }
}

/* =============================================================================
   FILTER OPTIONS
============================================================================= */

export function useDepartments() {
  return useQuery({
    queryKey: ["filters", "departments"],
    queryFn: () => getDepartments(),
    staleTime: FILTER_STALE_TIME,
    refetchOnWindowFocus: false,
  })
}

export function useDevices(departmentId?: number | null) {
  return useQuery({
    queryKey: ["filters", "devices", departmentId ?? "all"],
    queryFn: () => getDevices(departmentId),
    staleTime: FILTER_STALE_TIME,
    refetchOnWindowFocus: false,
  })
}

/* =============================================================================
   KPIs
============================================================================= */

export function useDashboardKPIs(filters: DashboardFilters) {
  const params = toApiParams(filters)
  return useQuery({
    queryKey: ["dashboard", "kpis", params],
    queryFn: () => getKPIs(params),
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
  })
}

/* =============================================================================
   ENERGY TREND
============================================================================= */

export function useEnergyTrend(filters: DashboardFilters) {
  const params = toApiParams(filters)
  return useQuery({
    queryKey: ["dashboard", "energy-trend", params],
    queryFn: () => getEnergyTrend(params),
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
  })
}

/* =============================================================================
   CARBON
============================================================================= */

export function useCarbonTotal() {
  return useQuery({
    queryKey: ["dashboard", "carbon", "total"],
    queryFn: () => getCarbonTotal(),
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
  })
}

export function useCarbonBreakdown() {
  return useQuery({
    queryKey: ["dashboard", "carbon", "breakdown"],
    queryFn: () => getCarbonBreakdown(),
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
  })
}

export function useCarbonScope() {
  return useQuery({
    queryKey: ["dashboard", "carbon", "scope"],
    queryFn: () => getCarbonScope(),
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
  })
}

/* =============================================================================
   APPLIANCES
============================================================================= */

export function useAppliancesSummary(filters?: DashboardFilters) {
  const params = filters ? toApiParams(filters) : {}
  return useQuery<ApplianceSummary>({
    queryKey: ["dashboard", "appliances", "summary", params],
    queryFn: () => getAppliancesSummary(params),
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
  })
}

export function useAppliancesUsage(filters?: DashboardFilters) {
  const params = filters ? toApiParams(filters) : {}
  return useQuery({
    queryKey: ["dashboard", "appliances", "usage", params],
    queryFn: () => getAppliancesUsage(params),
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
  })
}

/* =============================================================================
   DEVIATIONS
============================================================================= */

export function useDeviations() {
  return useQuery({
    queryKey: ["dashboard", "deviations"],
    queryFn: () => getDeviations(),
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
  })
}

export function useDeviationOverTime() {
  return useQuery({
    queryKey: ["dashboard", "deviation-over-time"],
    queryFn: () => getDeviationOverTime(),
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
  })
}

/* =============================================================================
   ANOMALIES — real Z-score detection
============================================================================= */

export function useAnomalies(filters?: DashboardFilters) {
  const params = filters ? toApiParams(filters) : {}
  return useQuery<AnomalyResponse>({
    queryKey: ["dashboard", "anomalies", params],
    queryFn: () => getAnomalies({ ...params, range: params.range ?? "30d" }),
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
    retry: 1,
  })
}

/* =============================================================================
   FORECAST — weighted rolling average
============================================================================= */

export function useForecast(horizon: number = 7) {
  return useQuery<ForecastResponse>({
    queryKey: ["dashboard", "forecast", horizon],
    queryFn: () => getForecast({ horizon }),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  })
}

/* =============================================================================
   LOCATION CONSUMPTION
============================================================================= */

export function useLocationConsumption(filters: DashboardFilters) {
  const params = toApiParams(filters)
  return useQuery({
    queryKey: ["dashboard", "location-consumption", params],
    queryFn: () => getLocationConsumption(params),
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
  })
}

/* =============================================================================
   AI INSIGHTS — rule-based engine
============================================================================= */

export function useAIInsights(filters: DashboardFilters) {
  const params = toApiParams(filters)
  return useQuery({
    queryKey: ["dashboard", "ai-insights", params],
    queryFn: () => getAIInsights(params),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  })
}