"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  AlertTriangle, AlertCircle, Info, XCircle,
  ChevronDown, TrendingUp, TrendingDown, Minus,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAnomalies } from "@/hooks/use-dashboard-data"
import { EmptyState } from "@/components/dashboard/empty-state"
import type { FilterState } from "@/components/dashboard/filter-controls"
import type { DashboardFilters } from "@/hooks/use-dashboard-data"
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
  Scatter,
  Cell,
} from "recharts"

/* =============================================================================
   SEVERITY CONFIG
============================================================================= */

const severityConfig = {
  normal:   { icon: Info,          color: "text-white/30",    bg: "bg-white/5",      dot: "#ffffff30", label: "Normal"   },
  low:      { icon: Info,          color: "text-blue-400",    bg: "bg-blue-500/10",  dot: "#3B82F6",   label: "Low"      },
  medium:   { icon: AlertCircle,   color: "text-amber-400",   bg: "bg-amber-500/10", dot: "#F59E0B",   label: "Medium"   },
  high:     { icon: AlertTriangle, color: "text-orange-400",  bg: "bg-orange-500/10",dot: "#F97316",   label: "High"     },
  critical: { icon: XCircle,       color: "text-red-400",     bg: "bg-red-500/10",   dot: "#EF4444",   label: "Critical" },
} as const

type Severity = keyof typeof severityConfig

/* =============================================================================
   CUSTOM TOOLTIP
============================================================================= */

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-3 text-xs">
      <p className="text-white/50 mb-2 font-medium">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="mb-0.5">
          {entry.name}: {Number(entry.value).toLocaleString()} kWh
        </p>
      ))}
    </div>
  )
}

/* =============================================================================
   ANOMALY ROW
============================================================================= */

function AnomalyRow({
  item,
  index,
}: {
  item: any
  index: number
}) {
  const [open, setOpen] = useState(false)
  const cfg = severityConfig[item.severity as Severity] ?? severityConfig.medium
  const Icon = cfg.icon

  const TrendIcon =
    item.deviation > 0 ? TrendingUp
    : item.deviation < 0 ? TrendingDown
    : Minus

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-xl border border-white/8 overflow-hidden"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        {/* Severity icon */}
        <div className={cn("p-1.5 rounded-lg shrink-0", cfg.bg)}>
          <Icon className={cn("w-4 h-4", cfg.color)} />
        </div>

        {/* Date */}
        <div className="w-24 shrink-0">
          <p className="text-xs font-semibold text-white">
            {new Date(item.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </p>
          <p className="text-xs text-white/30">
            {new Date(item.date).toLocaleDateString("en-US", {
              weekday: "short",
            })}
          </p>
        </div>

        {/* Actual vs expected */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">
              {item.actual.toLocaleString()} kWh
            </span>
            <span className="text-xs text-white/30">actual</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">
              Expected: {item.expected.toLocaleString()} kWh
            </span>
          </div>
        </div>

        {/* Deviation */}
        <div className="text-right shrink-0 w-20">
          <div className={cn("flex items-center justify-end gap-1", cfg.color)}>
            <TrendIcon className="w-3.5 h-3.5" />
            <span className="text-sm font-bold">
              {item.deviation_percent > 0 ? "+" : ""}
              {item.deviation_percent}%
            </span>
          </div>
          <p className="text-xs text-white/30">
            {item.deviation > 0 ? "+" : ""}
            {item.deviation.toFixed(0)} kWh
          </p>
        </div>

        {/* Severity badge */}
        <div
          className={cn(
            "text-xs px-2 py-0.5 rounded-full font-medium shrink-0",
            cfg.bg, cfg.color
          )}
        >
          {cfg.label}
        </div>

        {/* Z-score */}
        <div className="text-xs text-white/30 shrink-0 w-14 text-right">
          z={item.z_score}
        </div>

        <ChevronDown
          className={cn(
            "w-4 h-4 text-white/30 shrink-0 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/8"
          >
            <div className="p-4 grid grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-white/30 mb-1">Actual</p>
                <p className="text-white font-semibold">
                  {item.actual.toLocaleString()} kWh
                </p>
              </div>
              <div>
                <p className="text-white/30 mb-1">Baseline</p>
                <p className="text-white font-semibold">
                  {item.baseline.toLocaleString()} kWh
                </p>
              </div>
              <div>
                <p className="text-white/30 mb-1">Z-Score</p>
                <p className={cn("font-semibold", cfg.color)}>
                  {item.z_score}σ
                </p>
              </div>
              <div>
                <p className="text-white/30 mb-1">Expected (mean)</p>
                <p className="text-white font-semibold">
                  {item.expected.toLocaleString()} kWh
                </p>
              </div>
              <div>
                <p className="text-white/30 mb-1">Deviation</p>
                <p className={cn("font-semibold", cfg.color)}>
                  {item.deviation > 0 ? "+" : ""}
                  {item.deviation.toFixed(0)} kWh
                </p>
              </div>
              <div>
                <p className="text-white/30 mb-1">Deviation %</p>
                <p className={cn("font-semibold", cfg.color)}>
                  {item.deviation_percent > 0 ? "+" : ""}
                  {item.deviation_percent}%
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* =============================================================================
   MAIN COMPONENT
============================================================================= */

export function AnomaliesTab({ filters }: { filters?: FilterState }) {
  const apiFilters: DashboardFilters = {
    timeRange: filters?.timeRange ?? "30d",
    department_id: filters?.department_id,
    device_id: filters?.device_id,
  }

  const { data, isLoading, error, refetch } = useAnomalies(apiFilters)

  const series = data?.series ?? []
  const anomalies = data?.anomalies ?? []

  // Build chart data — annotate anomaly points
  const chartData = series.map((point) => ({
    date: new Date(point.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    actual: point.actual,
    baseline: point.baseline,
    expected: point.expected,
    isAnomaly: point.is_anomaly,
    severity: point.severity,
  }))

  // Anomaly scatter points for overlay
  const anomalyPoints = chartData.filter((d) => d.isAnomaly)

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-72 rounded-2xl bg-white/5 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <EmptyState type="api-error" onRetry={() => refetch()} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold tracking-tight">Anomaly Detection</h1>
          <p className="text-white/40 mt-1 text-sm">
            Z-score based statistical deviation analysis
          </p>
        </motion.div>

        {/* ── Summary KPIs ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total Anomalies",
              value: data?.total_anomalies ?? 0,
              color: "text-amber-400",
              bg: "bg-amber-500/10",
            },
            {
              label: "Critical",
              value: data?.critical_count ?? 0,
              color: "text-red-400",
              bg: "bg-red-500/10",
            },
            {
              label: "High Severity",
              value: data?.high_count ?? 0,
              color: "text-orange-400",
              bg: "bg-orange-500/10",
            },
            {
              label: "Days Analyzed",
              value: series.length,
              color: "text-blue-400",
              bg: "bg-blue-500/10",
            },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className={`rounded-2xl border border-white/8 ${kpi.bg} p-5`}
            >
              <p className="text-xs text-white/40 mb-2">{kpi.label}</p>
              <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Main Chart ── */}
        {chartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-white/8 bg-white/[0.03] p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-white">
                Actual vs Expected — Anomalies Highlighted
              </h3>
              <div className="flex items-center gap-4 text-xs text-white/40">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5 bg-blue-400 inline-block" />
                  Actual
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5 bg-white/20 inline-block border-dashed border-t border-white/30" />
                  Expected
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                  Anomaly
                </span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
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
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<ChartTooltip />} />

                {/* Confidence band */}
                <Area
                  type="monotone"
                  dataKey="baseline"
                  stroke="none"
                  fill="#3B82F6"
                  fillOpacity={0.06}
                  name="Baseline band"
                />

                {/* Expected line */}
                <Line
                  type="monotone"
                  dataKey="expected"
                  stroke="#ffffff20"
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="4 4"
                  name="Expected"
                />

                {/* Actual line */}
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                  name="Actual"
                />

                {/* Anomaly scatter overlay */}
                <Scatter
                  data={anomalyPoints}
                  dataKey="actual"
                  name="Anomaly"
                >
                  {anomalyPoints.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.severity === "critical"
                          ? "#EF4444"
                          : entry.severity === "high"
                          ? "#F97316"
                          : "#F59E0B"
                      }
                    />
                  ))}
                </Scatter>
              </ComposedChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* ── Anomaly List ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">
              Flagged Anomalies ({anomalies.length})
            </h3>
            <p className="text-xs text-white/30">
              Threshold: Z-score &gt; 1.5σ
            </p>
          </div>

          {anomalies.length === 0 ? (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-12 text-center">
              <p className="text-white/30 text-sm">
                No anomalies detected in this period.
              </p>
              <p className="text-white/20 text-xs mt-1">
                All consumption within normal statistical range.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {anomalies.map((item, i) => (
                <AnomalyRow key={item.date} item={item} index={i} />
              ))}
            </div>
          )}
        </motion.div>

      </div>
    </div>
  )
}