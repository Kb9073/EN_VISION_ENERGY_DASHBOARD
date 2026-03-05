"use client"

import { motion } from "framer-motion"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts"

interface EnergyTrendPoint {
  date: string
  actual: number
  baseline: number
}

interface EnergyTrendChartProps {
  data: EnergyTrendPoint[]
  isLoading?: boolean
  showBaseline?: boolean
  title?: string
}

/* =========================
   TOOLTIP
========================= */
function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null

  const date = new Date(label + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })

  const actual = payload.find((p) => p.dataKey === "actual")?.value as number | undefined
  const baseline = payload.find((p) => p.dataKey === "baseline")?.value as number | undefined

  const deviation =
    actual !== undefined && baseline !== undefined
      ? ((actual - baseline) / baseline) * 100
      : null

  return (
    <div className="glass-card p-3 border border-border">
      <p className="text-xs text-muted-foreground mb-2">{date}</p>

      {payload.map((entry, index) => (
        <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: {Number(entry.value).toLocaleString()} kWh
        </p>
      ))}

      {deviation !== null && (
        <p className={`text-xs mt-1 ${deviation > 0 ? "text-chart-4" : "text-chart-2"}`}>
          {deviation > 0 ? "+" : ""}
          {deviation.toFixed(1)}% vs baseline
        </p>
      )}
    </div>
  )
}

/* =========================
   MAIN CHART
========================= */
export function EnergyTrendChart({
  data,
  isLoading,
  showBaseline = true,
  title = "Energy Consumption Trend",
}: EnergyTrendChartProps) {
  if (isLoading) {
    return (
      <div className="glass-card p-5 h-80 animate-pulse">
        <div className="h-5 w-48 bg-muted rounded mb-4" />
        <div className="h-full bg-muted rounded" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-5 h-64 flex items-center justify-center text-sm text-muted-foreground">
        No energy trend data available
      </div>
    )
  }

  // ✅ IMPORTANT: DO NOT re-parse date, backend already sends ISO date
  const chartData = data.map((point) => ({
    ...point,
    date: point.date,
  }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-chart-1 rounded" />
            <span className="text-muted-foreground">Actual</span>
          </div>

          {showBaseline && (
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-0.5 bg-chart-4 opacity-60"
                style={{ borderTop: "2px dashed" }}
              />
              <span className="text-muted-foreground">Baseline</span>
            </div>
          )}
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.75 0.15 195)" stopOpacity={0.5} />
                <stop offset="50%" stopColor="oklch(0.75 0.15 195)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="oklch(0.75 0.15 195)" stopOpacity={0} />
              </linearGradient>

              <linearGradient id="baselineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.65 0.2 25)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="oklch(0.65 0.2 25)" stopOpacity={0} />
              </linearGradient>

              <filter id="glowActual" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.25 0.03 260 / 0.3)"
              vertical={false}
            />

            {/* ✅ FIXED DATE AXIS */}
            <XAxis
              dataKey="date"
              tickFormatter={(v) =>
                new Date(v + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }
              tick={{ fontSize: 11, fill: "oklch(0.6 0.02 260)" }}
              axisLine={{ stroke: "oklch(0.25 0.03 260 / 0.3)" }}
              tickLine={false}
            />

            <YAxis
              tick={{ fontSize: 11, fill: "oklch(0.6 0.02 260)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* ✅ BASELINE */}
            {showBaseline && (
              <Area
                type="monotone"
                dataKey="baseline"
                name="Baseline"
                stroke="oklch(0.65 0.2 25 / 0.6)"
                strokeWidth={1.5}
                strokeDasharray="6 4"
                fill="url(#baselineGradient)"
              />
            )}

            {/* ✅ ACTUAL (FIXED DATA KEY) */}
            <Area
              type="monotone"
              dataKey="actual"
              name="Actual"
              stroke="oklch(0.75 0.15 195)"
              strokeWidth={2.5}
              fill="url(#energyGradient)"
              filter="url(#glowActual)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}
