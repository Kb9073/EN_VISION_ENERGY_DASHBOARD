"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  TrendingUp, TrendingDown, Minus,
  Calendar, Zap, DollarSign, Leaf, ChevronDown,
} from "lucide-react"
import { useForecast } from "@/hooks/use-dashboard-data"
import { EmptyState } from "@/components/dashboard/empty-state"
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from "recharts"

/* =============================================================================
   TYPES
============================================================================= */

type Metric = "kwh" | "cost" | "emissions"
type Horizon = 7 | 30 | 90

/* =============================================================================
   TOOLTIP
============================================================================= */

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-3 text-xs space-y-1.5">
      <p className="text-white/50 font-medium mb-2">{label}</p>
      {payload.map((entry: any, i: number) => (
        entry.value !== null && (
          <p key={i} style={{ color: entry.color }}>
            {entry.name}:{" "}
            <span className="font-semibold">
              {Number(entry.value).toLocaleString()}
            </span>
          </p>
        )
      ))}
    </div>
  )
}

/* =============================================================================
   MAIN COMPONENT
============================================================================= */

export function ForecastingTab() {
  const [horizon, setHorizon] = useState<Horizon>(7)
  const [metric, setMetric] = useState<Metric>("kwh")

  const { data, isLoading, error, refetch } = useForecast(horizon)

  const historical = data?.historical ?? []
  const forecast = data?.forecast ?? []
  const summary = data?.summary

  // Merge historical + forecast into single chart series
  const chartData = [
    ...historical.map((h) => ({
      date: new Date(h.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      actual:
        metric === "kwh"
          ? h.actual_kwh
          : metric === "cost"
          ? h.actual_cost
          : h.actual_emissions,
      predicted: null,
      lower: null,
      upper: null,
      isForecast: false,
    })),
    ...forecast.map((f) => ({
      date: new Date(f.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      actual: null,
      predicted:
        metric === "kwh"
          ? f.predicted_kwh
          : metric === "cost"
          ? f.predicted_cost
          : f.predicted_emissions,
      lower:
        metric === "kwh"
          ? f.lower_bound
          : f.lower_bound,
      upper:
        metric === "kwh"
          ? f.upper_bound
          : f.upper_bound,
      isForecast: true,
    })),
  ]

  // Divider between historical and forecast
  const dividerDate =
    historical.length > 0
      ? new Date(historical[historical.length - 1].date).toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric" }
        )
      : null

  const metricConfig = {
    kwh: {
      label: "Energy (kWh)",
      unit: "kWh",
      color: "#3B82F6",
      icon: Zap,
      total: summary?.total_predicted_kwh ?? 0,
      avg: summary?.avg_daily_kwh ?? 0,
    },
    cost: {
      label: "Cost (£)",
      unit: "£",
      color: "#F59E0B",
      icon: DollarSign,
      total: summary?.total_predicted_cost ?? 0,
      avg: (summary?.total_predicted_cost ?? 0) / (summary?.horizon_days ?? 1),
    },
    emissions: {
      label: "Emissions (tCO₂e)",
      unit: "tCO₂e",
      color: "#10B981",
      icon: Leaf,
      total: summary?.total_predicted_emissions ?? 0,
      avg:
        (summary?.total_predicted_emissions ?? 0) /
        (summary?.horizon_days ?? 1),
    },
  }

  const active = metricConfig[metric]

  const TrendIcon =
    summary?.trend_direction === "up"
      ? TrendingUp
      : summary?.trend_direction === "down"
      ? TrendingDown
      : Minus

  const trendColor =
    summary?.trend_direction === "up"
      ? "text-red-400"
      : summary?.trend_direction === "down"
      ? "text-emerald-400"
      : "text-white/40"

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
        <div className="h-80 rounded-2xl bg-white/5 animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <EmptyState type="api-error" onRetry={refetch} />
      </div>
    )
  }

  if (!data || (historical.length === 0 && forecast.length === 0)) {
    return (
      <div className="p-6">
        <EmptyState type="no-data" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold tracking-tight">Forecasting</h1>
          <p className="text-white/40 mt-1 text-sm">
            Weighted rolling average with trend adjustment
          </p>
        </motion.div>

        {/* ── Controls ── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Horizon selector */}
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
            {([7, 30, 90] as Horizon[]).map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  horizon === h
                    ? "bg-blue-500 text-white"
                    : "text-white/40 hover:text-white"
                }`}
              >
                {h}d
              </button>
            ))}
          </div>

          {/* Metric selector */}
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
            {(["kwh", "cost", "emissions"] as Metric[]).map((m) => {
              const cfg = metricConfig[m]
              const Icon = cfg.icon
              return (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    metric === m
                      ? "bg-white/10 text-white"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {m === "kwh"
                    ? "Energy"
                    : m === "cost"
                    ? "Cost"
                    : "Carbon"}
                </button>
              )
            })}
          </div>

          {/* Trend indicator */}
          {summary && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-sm ${trendColor}`}
            >
              <TrendIcon className="w-4 h-4" />
              Trend:{" "}
              <span className="font-semibold capitalize">
                {summary.trend_direction}
              </span>
            </div>
          )}
        </div>

        {/* ── Summary KPIs ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: `Total Predicted (${horizon}d)`,
              value: active.total.toLocaleString("en-US", {
                maximumFractionDigits: 1,
              }),
              unit: active.unit,
              color: active.color,
            },
            {
              label: "Daily Average",
              value: active.avg.toLocaleString("en-US", {
                maximumFractionDigits: 1,
              }),
              unit: active.unit,
              color: active.color,
            },
            {
              label: "Forecast Horizon",
              value: `${horizon}`,
              unit: "days",
              color: "#8B5CF6",
            },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="rounded-2xl border border-white/8 bg-white/[0.03] p-5"
            >
              <p className="text-xs text-white/40 mb-2">{kpi.label}</p>
              <p className="text-3xl font-bold text-white">
                {kpi.value}
                <span className="text-sm font-normal text-white/30 ml-1.5">
                  {kpi.unit}
                </span>
              </p>
            </motion.div>
          ))}
        </div>

        {/* ── Forecast Chart ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-white/8 bg-white/[0.03] p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-white">
              Historical + Forecast — {active.label}
            </h3>
            <div className="flex items-center gap-4 text-xs text-white/30">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 inline-block" style={{ backgroundColor: active.color }} />
                Actual
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 inline-block border-dashed border-t" style={{ borderColor: active.color }} />
                Forecast
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="w-4 h-3 inline-block rounded-sm opacity-30"
                  style={{ backgroundColor: active.color }}
                />
                Confidence
              </span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart
              data={chartData}
              margin={{ top: 4, right: 0, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#ffffff0d"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fill: "#ffffff40", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#ffffff40", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  metric === "kwh"
                    ? `${(v / 1000).toFixed(0)}k`
                    : metric === "cost"
                    ? `£${(v / 1000).toFixed(0)}k`
                    : v.toFixed(0)
                }
              />
              <Tooltip content={<ChartTooltip />} />

              {/* Confidence band */}
              <Area
                type="monotone"
                dataKey="upper"
                stroke="none"
                fill={active.color}
                fillOpacity={0.08}
                name="Upper bound"
                legendType="none"
              />
              <Area
                type="monotone"
                dataKey="lower"
                stroke="none"
                fill="#0a0a0a"
                fillOpacity={1}
                name="Lower bound"
                legendType="none"
              />

              {/* Today divider */}
              {dividerDate && (
                <ReferenceLine
                  x={dividerDate}
                  stroke="#ffffff20"
                  strokeDasharray="4 4"
                  label={{
                    value: "Today",
                    position: "top",
                    fill: "#ffffff30",
                    fontSize: 11,
                  }}
                />
              )}

              {/* Actual line */}
              <Line
                type="monotone"
                dataKey="actual"
                stroke={active.color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                connectNulls={false}
                name="Actual"
              />

              {/* Forecast dotted line */}
              <Line
                type="monotone"
                dataKey="predicted"
                stroke={active.color}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }}
                connectNulls={false}
                name="Forecast"
                strokeOpacity={0.7}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>

        {/* ── Forecast Table ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-white/8">
            <h3 className="text-sm font-semibold text-white">
              Daily Forecast Breakdown
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/8">
                  {["Date", "Predicted kWh", "Predicted Cost", "Predicted CO₂", "Lower", "Upper"].map(
                    (col) => (
                      <th
                        key={col}
                        className="px-6 py-3 text-left text-white/30 font-medium"
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {forecast.map((row, i) => (
                  <motion.tr
                    key={row.date}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-3 text-white font-medium">
                      {new Date(row.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-3 text-blue-400 font-semibold">
                      {row.predicted_kwh.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-amber-400">
                      £{row.predicted_cost.toLocaleString("en-GB", {
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-6 py-3 text-emerald-400">
                      {row.predicted_emissions.toFixed(2)} t
                    </td>
                    <td className="px-6 py-3 text-white/30">
                      {row.lower_bound.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-white/30">
                      {row.upper_bound.toLocaleString()}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

      </div>
    </div>
  )
}