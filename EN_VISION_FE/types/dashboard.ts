"use client"

import client from "@/lib/api/client"

export interface KPIBlock {
  value: number
  delta?: number
  unit?: string
  period?: string
}

export interface DashboardKPIs {
  totalEnergyConsumption: KPIBlock
  energySaved: KPIBlock
  overConsumptionPercent: KPIBlock
  co2Emissions: KPIBlock

  avgConsumption: number
  peakConsumption: number
  totalCost: number

  systemStatus: "stable" | "at-risk" | "critical"
  sustainabilityStatus: "on-track" | "deviating" | "exceeding"
}

export interface StandardResponse<T> {
  success: boolean
  data: T
  timestamp: string
}

export interface CarbonScopeItem {
  scope: string
  value: number
}

export async function getCarbonScope(
  params?: Record<string, unknown>
): Promise<CarbonScopeItem[]> {
  try {
    const res = await client.get<StandardResponse<CarbonScopeItem[]>>(
      "/dashboard/carbon/scope",
      params
    )

    return Array.isArray(res.data) ? res.data : []
  } catch {
    return []
  }
}