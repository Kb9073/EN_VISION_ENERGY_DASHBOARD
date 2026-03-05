"use client"

import { useQuery } from "@tanstack/react-query"
import client from "@/lib/api/client"
import config from "@/lib/config"
import type {
  StandardResponse,
  EnergyTrendPoint,
  CarbonBreakdownItem,
  DeviationItem,
} from "@/lib/api/dashboard"

/* =============================================================================
   TYPES
============================================================================= */

export interface KPIBreakdownItem {
  name: string
  value: number
  percentage: number
}

export interface KPIDetailData {
  trend: Array<{ date: string; value: number }>
  breakdown: KPIBreakdownItem[]
  context: {
    affectedDepartments: string[]
    peakHour: string
    comparedToBaseline: number
    lastUpdated: string
  }
}

/* =============================================================================
   HOOK
============================================================================= */

export function useKPIDetail(metric: "total" | "average" | "peak") {
  return useQuery({
    queryKey: ["kpi-detail", metric],
    queryFn: async (): Promise<KPIDetailData> => {
      const baseParams = { company_id: config.companyId }

      const [trendRes, breakdownRes, deviationsRes] = await Promise.all([
        client.get<StandardResponse<EnergyTrendPoint[]>>(
          "/dashboard/energy-trend",
          baseParams
        ),
        client.get<StandardResponse<CarbonBreakdownItem[]>>(
          "/dashboard/carbon/breakdown",
          baseParams
        ),
        client.get<StandardResponse<DeviationItem[]>>(
          "/dashboard/deviations",
          baseParams
        ),
      ])

      /* ---- TREND: { timestamp, total_kwh } ---- */
      const trendPoints = Array.isArray(trendRes?.data) ? trendRes.data : []
      const trend = trendPoints.map((d: EnergyTrendPoint) => ({
        date: d.timestamp,
        value: d.total_kwh,
      }))

      /* ---- BREAKDOWN: { source, value } ---- */
      const breakdownItems = Array.isArray(breakdownRes?.data)
        ? breakdownRes.data
        : []
      const total = breakdownItems.reduce(
        (sum: number, b: CarbonBreakdownItem) => sum + b.value,
        0
      )
      const breakdown: KPIBreakdownItem[] = breakdownItems.map(
        (b: CarbonBreakdownItem) => ({
          name: b.source,
          value: b.value,
          percentage: total > 0 ? (b.value / total) * 100 : 0,
        })
      )

      /* ---- PEAK POINT ---- */
      const peakPoint = trend.reduce<{ date: string; value: number }>(
        (max, t) => (t.value > max.value ? t : max),
        { date: "—", value: 0 }
      )

      /* ---- AVG DEVIATION from deviations list ---- */
      const deviations = Array.isArray(deviationsRes?.data)
        ? deviationsRes.data
        : []
      const avgDeviation =
        deviations.length > 0
          ? deviations.reduce(
              (sum: number, d: DeviationItem) => sum + d.deviation,
              0
            ) / deviations.length
          : 0

      return {
        trend,
        breakdown,
        context: {
          affectedDepartments: ["Manufacturing", "Operations"],
          peakHour: peakPoint.date,
          comparedToBaseline: avgDeviation,
          lastUpdated: new Date().toISOString(),
        },
      }
    },
    staleTime: 10_000,
  })
}