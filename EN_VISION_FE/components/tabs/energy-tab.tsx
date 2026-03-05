"use client"

import { motion } from "framer-motion"
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  ComposedChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Legend, ReferenceDot, BarChart,
} from "recharts"
import { Zap, TrendingUp, TrendingDown, DollarSign } from "lucide-react"

import {
  useDashboardKPIs,
  useEnergyTrend,
  useCarbonBreakdown,
  useAppliancesUsage,
  type DashboardFilters,
} from "@/hooks/use-dashboard-data"

import { EmptyState } from "@/components/dashboard/empty-state"
import type { FilterState } from "@/components/dashboard/filter-controls"

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
    <div
      className={`rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-sm p-6 ${className}`}
    >
      {children}
    </div>
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
  const { data: carbonBreakdown = [] }   = useCarbonBreakdown()
  const { data: appliancesUsage = [] }   = useAppliancesUsage(apiFilters)

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

  /* ── Chart shapes ── */
  const consumptionData = trendData.map((item: any) => ({
    date: new Date(item.timestamp).toLocaleDateString("en-US", {
      month: "short", day: "numeric",
    }),
    total:    Number(item.total_kwh    ?? 0),
    baseline: Number(item.baseline_kwh ?? 0),
  }))

  const peakPoint = consumptionData.length > 0
    ? consumptionData.reduce((max: any, d: any) =>
        d.total > max.total ? d : max
      )
    : null

  const isShortRange = filters.timeRange === "7d" || filters.timeRange === "24h"

  /* ── Energy mix from carbon breakdown ── */
  const totalCarbonValue = carbonBreakdown.reduce(
    (s: number, item: any) => s + Number(item.value ?? 0), 0
  )
  const consumptionMix = carbonBreakdown.map((item: any, idx: number) => ({
    name:  item.source,
    value: totalCarbonValue > 0
      ? Math.round((Number(item.value ?? 0) / totalCarbonValue) * 100)
      : 0,
    color: CHART_COLORS[idx % CHART_COLORS.length],
  }))

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
    <div className="min-h-screen bg-black text-white p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold tracking-tight">
            Energy & Cost Dashboard
          </h1>
          <p className="text-white/40 mt-1 text-sm">
            Consumption analytics and cost breakdown
          </p>
        </motion.div>

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total Cost",
              value: `£${totalCost.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`,
              sub: costDelta !== 0
                ? `${costDelta > 0 ? "+" : ""}${costDelta.toFixed(1)}% vs last period`
                : "Current period",
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
                className="rounded-2xl border border-white/8 bg-white/[0.03] p-5"
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

        {/* ── Trend Chart ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <SectionCard>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-white">
                Daily Consumption vs Baseline
              </h3>
              <div className="flex items-center gap-3 text-xs text-white/30">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block opacity-80" />
                  Actual
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block opacity-60" />
                  Baseline
                </span>
              </div>
            </div>

            {consumptionData.length === 0 ? (
              <EmptyState type="no-data" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                {isShortRange ? (
                  <ComposedChart
                    data={consumptionData}
                    margin={{ top: 4, right: 0, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "#ffffff50", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#ffffff50", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="total"    name="Actual"   fill="#3B82F6" fillOpacity={0.85} radius={[5, 5, 0, 0]} />
                    <Bar dataKey="baseline" name="Baseline" fill="#F59E0B" fillOpacity={0.5}  radius={[5, 5, 0, 0]} />
                  </ComposedChart>
                ) : (
                  <LineChart
                    data={consumptionData}
                    margin={{ top: 4, right: 0, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "#ffffff50", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#ffffff50", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#3B82F6"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                      name="Actual"
                    />
                    <Line
                      type="monotone"
                      dataKey="baseline"
                      stroke="#F59E0B"
                      strokeWidth={1.5}
                      dot={false}
                      strokeDasharray="5 5"
                      name="Baseline"
                    />
                    {peakPoint && (
                      <ReferenceDot
                        x={peakPoint.date}
                        y={peakPoint.total}
                        r={6}
                        fill="#EF4444"
                        stroke="white"
                        strokeWidth={2}
                      />
                    )}
                  </LineChart>
                )}
              </ResponsiveContainer>
            )}
          </SectionCard>
        </motion.div>

        {/* ── Energy Mix + Top Devices ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Energy Mix Pie */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <SectionCard>
              <h3 className="text-sm font-semibold text-white mb-5">
                Energy Source Mix
              </h3>

              {consumptionMix.length === 0 ? (
                <div className="h-56 flex items-center justify-center">
                  <EmptyState type="no-data" />
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={consumptionMix}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {consumptionMix.map((entry: any, idx: number) => (
                          <Cell
                            key={`cell-${idx}`}
                            fill={entry.color}
                            fillOpacity={0.85}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0a0a0a",
                          border: "1px solid #ffffff15",
                          borderRadius: "10px",
                          color: "white",
                        }}
                        formatter={(v: any, n: any) => [`${v}%`, n]}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Legend */}
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                    {consumptionMix.map((item: any) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs text-white/50 truncate">
                          {item.name}
                        </span>
                        <span className="text-xs font-semibold text-white ml-auto">
                          {item.value}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </SectionCard>
          </motion.div>

          {/* Top Devices Bar */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <SectionCard>
              <h3 className="text-sm font-semibold text-white mb-5">
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
                          border: "1px solid #ffffff15",
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
                            fill={CHART_COLORS[idx % CHART_COLORS.length]}
                            fillOpacity={0.85}
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
    </div>
  )
}