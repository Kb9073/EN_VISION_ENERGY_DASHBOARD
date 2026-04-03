"use client"

import { motion } from "framer-motion"
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from "recharts"
import { Zap, TrendingUp, TrendingDown, DollarSign } from "lucide-react"

import {
  useDashboardKPIs,
  useEnergyTrend,
  useAppliancesUsage,
  type DashboardFilters,
} from "@/hooks/use-dashboard-data"

import { EmptyState }        from "@/components/dashboard/empty-state"
import { ChangeInCostCard }  from "@/components/dashboard/energy/ChangeInCostCard"
import { CostOverviewPanel } from "@/components/dashboard/energy/CostOverviewPanel"
import type { FilterState }  from "@/components/dashboard/filter-controls"

/* =============================================================================
   CONSTANTS
============================================================================= */

const CHART_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B",
  "#EF4444", "#8B5CF6", "#EC4899",
]

/* =============================================================================
   HELPERS
============================================================================= */

function toApiFilters(filters: FilterState): DashboardFilters {
  return {
    timeRange: filters.timeRange,
    department_id: filters.department_id,
    device_id: filters.device_id,
  }
}

function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`premium-card p-6 ${className}`}
    >
      {children}
    </motion.div>
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-3 text-xs space-y-1.5">
      <p className="text-white/50 font-medium mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color ?? entry.fill }}>
          {entry.name}:{" "}
          <span className="font-semibold">
            {Number(entry.value).toLocaleString()}
          </span>
        </p>
      ))}
    </div>
  )
}

/* =============================================================================
   COMPONENT
============================================================================= */

export function EnergyTab({ filters }: { filters: FilterState }) {
  const apiFilters = toApiFilters(filters)

  const { data: kpis, isLoading, error } = useDashboardKPIs(apiFilters)
  const { data: trendData = [] }         = useEnergyTrend(apiFilters)
  const { data: appliancesUsage = [] }   = useAppliancesUsage(apiFilters)

  if (isLoading) {
    return (
      <div className="p-7 lg:p-9 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
        <div className="h-80 rounded-2xl bg-white/5 animate-pulse" />
      </div>
    )
  }
  if (error)  return <EmptyState type="api-error" />
  if (!kpis)  return <EmptyState type="no-data" />

  /* ── Derived values ── */
  const totalCost   = kpis.totalCost ?? 0
  const totalEnergy = kpis.totalEnergyConsumption?.value ?? 0
  const avgLoad     = trendData.length > 0
    ? trendData.reduce((s: number, d: any) => s + Number(d.total_kwh ?? 0), 0) / trendData.length
    : 0
  const peakLoad    = trendData.length > 0
    ? Math.max(...trendData.map((d: any) => Number(d.peak_power ?? 0)))
    : 0

  /* ── Top 5 devices ── */
  const topDevices = appliancesUsage
    .slice(0, 5)
    .map((a: any) => ({
      name:  a.device_name ?? a.name ?? "Device",
      value: Number(a.total_kwh ?? a.usage ?? 0),
    }))
    .sort((a: any, b: any) => b.value - a.value)

  /* ── Cost delta indicator ── */
  const costDelta = kpis.totalEnergyConsumption?.delta ?? 0
  const CostTrendIcon = costDelta > 0 ? TrendingUp : TrendingDown
  const costTrendColor = costDelta > 0 ? "text-red-400" : "text-emerald-400"
  const costTrendBg    = costDelta > 0 ? "bg-red-500/10" : "bg-emerald-500/10"

  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <div className="min-h-screen bg-[#070707] text-white px-6 py-10">
      <div className="max-w-[1400px] mx-auto space-y-8">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-2">
          <h1 className="text-display-md font-bold tracking-tight">
            Energy & Cost Dashboard
          </h1>
          <p className="text-white/40 mt-2.5 text-sm">
            Consumption analytics and cost breakdown
          </p>
        </motion.div>

        {/* ── KPI Row ── */}
        <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-7">
          {[
            {
              label: "Total Cost",
              value: `₹${totalCost.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
              sub: costDelta !== 0
                ? `${costDelta > 0 ? "+" : ""}${costDelta.toFixed(1)}% vs last period | ₹8.2/kWh avg`
                : "Current period | ₹8.2/kWh avg",
              icon: DollarSign,
              color: "#F59E0B",
              trend: costDelta,
            },
            {
              label: "Total Energy",
              value: `${(totalEnergy / 1000).toFixed(1)} MWh`,
              sub: `${totalEnergy.toLocaleString()} kWh`,
              icon: Zap,
              color: "#3B82F6",
              trend: null,
            },
            {
              label: "Avg Daily Load",
              value: `${(avgLoad / 1000).toFixed(1)} MWh`,
              sub: `${avgLoad.toFixed(0)} kWh / day`,
              icon: TrendingUp,
              color: "#10B981",
              trend: null,
            },
            {
              label: "Peak Load",
              value: `${peakLoad.toFixed(0)} kW`,
              sub: "Highest recorded",
              icon: TrendingUp,
              color: "#EF4444",
              trend: null,
            },
          ].map((kpi, i) => {
            const Icon = kpi.icon
            return (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="premium-card p-6"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-white/40">{kpi.label}</p>
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${kpi.color}20` }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white">{kpi.value}</p>
                {kpi.trend !== null ? (
                  <div
                    className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${costTrendBg} ${costTrendColor}`}
                  >
                    <CostTrendIcon className="w-3 h-3" />
                    {kpi.sub}
                  </div>
                ) : (
                  <p className="text-xs text-white/30 mt-2">{kpi.sub}</p>
                )}
              </motion.div>
            )
          })}
        </div>
        </section>

        {/* ── Change in Cost + Top Devices ── */}
        <section>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Change in Cost card */}
            <div>
              <ChangeInCostCard filters={apiFilters} />
            </div>

            {/* Top Devices Bar — spans remaining 2 columns */}
            <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <SectionCard>
              <h3 className="text-heading-sm font-semibold text-white mb-6">
                Top 5 Devices by Consumption
              </h3>

              {topDevices.length === 0 ? (
                <div className="h-56 flex items-center justify-center">
                  <EmptyState type="no-data" />
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={topDevices}
                      layout="vertical"
                      margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                      barSize={18}
                    >
                      <defs>
                        {CHART_COLORS.map((color, i) => (
                          <linearGradient
                            key={`grad-${i}`}
                            id={`devGrad${i}`}
                            x1="0" y1="0" x2="1" y2="0"
                          >
                            <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.4} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#ffffff0d"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tick={{ fill: "#ffffff40", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fill: "#ffffff60", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={80}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0a0a0a",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: "10px",
                          color: "white",
                        }}
                        formatter={(v: any) => [
                          `${Number(v).toLocaleString()} kWh`,
                          "Consumption",
                        ]}
                      />
                      <Bar dataKey="value" name="kWh" radius={[0, 5, 5, 0]}>
                        {topDevices.map((_: any, idx: number) => (
                          <Cell
                            key={`cell-${idx}`}
                            fill={`url(#devGrad${idx % CHART_COLORS.length})`}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Device list */}
                  <div className="mt-4 space-y-2">
                    {topDevices.map((device: any, i: number) => {
                      const max = topDevices[0]?.value ?? 1
                      const pct = (device.value / max) * 100
                      return (
                        <div key={device.name} className="flex items-center gap-3">
                          <span className="text-xs text-white/30 w-4">
                            {i + 1}
                          </span>
                          <span className="text-xs text-white/60 flex-1 truncate">
                            {device.name}
                          </span>
                          <div className="w-20 h-1.5 rounded-full bg-white/8 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                backgroundColor:
                                  CHART_COLORS[i % CHART_COLORS.length],
                              }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-white w-20 text-right">
                            {device.value.toLocaleString()} kWh
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </SectionCard>
          </motion.div>
            </div>
          </div>
        </section>

        {/* ── Cost Overview Panel ── */}
        <section>
          <CostOverviewPanel filters={apiFilters} />
        </section>

      </div>
    </div>
  )
}