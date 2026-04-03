"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  TrendingUp, Zap, AlertCircle, Leaf, Activity,
  X, MapPin, Sparkles, AlertTriangle, Info,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react"
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, LineChart, Line,
} from "recharts"

import {
  useDashboardKPIs,
  useEnergyTrend,
  useAppliancesSummary,
  useLocationConsumption,
  useAIInsights,
  type DashboardFilters,
} from "@/hooks/use-dashboard-data"
import {
  BillSideChat,
  type BillDashboardSource,
  type ScannedBill,
} from "@/components/dashboard/bill-side-chat"

import type { FilterState } from "@/components/dashboard/filter-controls"
import type { EnergyTrendPoint } from "@/lib/api/dashboard"

/* =============================================================================
   TYPES + HELPERS
============================================================================= */

interface HomeTabProps {
  filters: FilterState
  onFiltersChange?: (next: FilterState) => void
  activeDataSourceId?: string
  billSources?: BillDashboardSource[]
  scannedBills?: ScannedBill[]
}

function toApiFilters(f: FilterState): DashboardFilters {
  const base: DashboardFilters = {
    timeRange: f.timeRange,
    department_id: f.department_id,
    device_id: f.device_id,
  }
  if (f.timeRange === "custom" && f.start_date && f.end_date) {
    base.start_date = f.start_date
    base.end_date = f.end_date
  }
  return base
}

function buildCustomTrend(bills: ScannedBill[]): EnergyTrendPoint[] {
  const rows = new Map<string, number>()

  bills.forEach((bill) => {
    if (bill.parsed.day_wise_consumption.length > 0) {
      bill.parsed.day_wise_consumption.forEach((row) => {
        const key = row.date
        rows.set(key, (rows.get(key) ?? 0) + (row.kwh ?? 0))
      })
      return
    }

    const start = bill.period.startISO
    const end = bill.period.endISO
    const total = bill.parsed.total_energy_consumption_kwh ?? 0
    if (!start || !end || total <= 0) return

    const startTs = new Date(`${start}T00:00:00`).getTime()
    const endTs = new Date(`${end}T00:00:00`).getTime()
    const days = Math.floor((endTs - startTs) / 86400000) + 1
    if (days <= 0) return

    const perDay = total / days
    for (let i = 0; i < days; i += 1) {
      const d = new Date(startTs + i * 86400000)
      const key = d.toISOString().slice(0, 10)
      rows.set(key, (rows.get(key) ?? 0) + perDay)
    }
  })

  return Array.from(rows.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, kwh]) => ({
      timestamp: `${date}T00:00:00Z`,
      total_kwh: kwh,
      total_cost: 0,
      total_emissions: 0,
      peak_power: 0,
      baseline_kwh: kwh,
    }))
}

function buildCustomDashboard(source: BillDashboardSource | undefined, scannedBills: ScannedBill[]) {
  if (!source) return null
  const bills = scannedBills.filter((b) => source.billIds.includes(b.id))
  if (bills.length === 0) return null

  const totalKwh = bills.reduce((sum, b) => sum + (b.parsed.total_energy_consumption_kwh ?? 0), 0)
  const totalCost = bills.reduce((sum, b) => sum + (b.parsed.total_amount_inr ?? 0), 0)
  const totalCo2Kg = bills.reduce((sum, b) => sum + (b.parsed.carbon_emissions_kg_co2 ?? 0), 0)
  const peakKw = bills.reduce((max, b) => Math.max(max, b.parsed.max_demand_kw ?? 0), 0)

  const trend = buildCustomTrend(bills)
  const avgKwh = trend.length > 0 ? totalKwh / trend.length : totalKwh

  const zoneMap = new Map<string, { total_kwh: number; baseline_kwh: number; deviation: number }>()
  bills.forEach((b) => {
    const zone = b.assignedDepartmentName ?? "Unassigned Department"
    const kwh = b.parsed.total_energy_consumption_kwh ?? 0
    const prev = zoneMap.get(zone) ?? { total_kwh: 0, baseline_kwh: 0, deviation: 0 }
    zoneMap.set(zone, {
      total_kwh: prev.total_kwh + kwh,
      baseline_kwh: prev.baseline_kwh + kwh,
      deviation: 0,
    })
  })

  const zones = Array.from(zoneMap.entries()).map(([zone, values]) => ({ zone, ...values }))
  const uniqueDevices = new Set(bills.map((b) => b.assignedDeviceId).filter((v): v is number => !!v))

  return {
    kpis: {
      totalEnergyConsumption: { value: totalKwh, delta: 0 },
      energySaved: { value: 0, delta: 0 },
      overConsumptionPercent: { value: 0, delta: 0 },
      co2Emissions: { value: totalCo2Kg / 1000, delta: 0, period: "from bill" },
      avgConsumption: avgKwh,
      peakConsumption: peakKw,
      totalCost,
    },
    trend,
    appliances: {
      active_devices: uniqueDevices.size,
      total_devices: uniqueDevices.size,
    },
    zones,
    insights: [
      {
        id: "custom-1",
        title: "Custom bill dashboard active",
        description: "You are viewing uploaded bill data. Main system data remains unchanged.",
        severity: "low",
      },
    ],
  }
}

const insightCfg = {
  low:    { icon: Info,          bg: "bg-emerald-500/8",  border: "border-emerald-500/20", text: "text-emerald-400", dot: "#10b981" },
  medium: { icon: AlertCircle,   bg: "bg-amber-500/8",    border: "border-amber-500/20",   text: "text-amber-400",   dot: "#f59e0b" },
  high:   { icon: AlertTriangle, bg: "bg-red-500/8",      border: "border-red-500/20",     text: "text-red-400",     dot: "#ef4444" },
} as const

const ZONE_COLORS = ["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#06B6D4"]

/* =============================================================================
   COUNT-UP ANIMATION
============================================================================= */

function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(0)
  const frame = useRef<number | null>(null)

  useEffect(() => {
    let start: number | null = null
    const duration = 1100
    const animate = (ts: number) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(value * eased)
      if (progress < 1) frame.current = requestAnimationFrame(animate)
    }
    frame.current = requestAnimationFrame(animate)
    return () => { if (frame.current !== null) cancelAnimationFrame(frame.current) }
  }, [value])

  return (
    <>
      {decimals > 0
        ? display.toFixed(decimals)
        : Math.floor(display).toLocaleString("en-US")}
    </>
  )
}

/* =============================================================================
   SKELETON
============================================================================= */

function CardSkeleton() {
  return <div className="h-40 rounded-2xl shimmer border border-white/10 bg-white/[0.03]" />
}

/* =============================================================================
   CUSTOM TOOLTIP
============================================================================= */

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card px-3 py-2.5 text-xs shadow-xl">
      <p className="text-white/40 mb-1.5 font-medium">{label}</p>
      {payload.map((e: any, i: number) => (
        <p key={i} className="mb-0.5" style={{ color: e.color ?? e.fill }}>
          {e.name}:{" "}
          <span className="font-semibold text-white">
            {Number(e.value).toLocaleString()} kWh
          </span>
        </p>
      ))}
    </div>
  )
}

/* =============================================================================
   KPI CARD
============================================================================= */

function KPICard({
  label, icon: Icon, value, unit, delta, detail,
  glowClass, iconBg, iconColor, borderColor, accentColor,
  onClick,
}: any) {
  const isUp = delta > 0
  const isSaved = label === "Energy Saved"
  const isGood = isSaved ? !isUp : !isUp

  return (
      <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, scale: 1.015, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.97 }}
      className={`premium-card ${glowClass} text-left p-card-lg w-full group`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-9">
        <motion.div 
          whileHover={{ scale: 1.1 }}
      className={`icon-box w-11 h-11 ${iconBg} -mt-1`}
          style={{ border: `1px solid ${borderColor}` }}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </motion.div>
        <motion.div className={`badge ${isGood ? "badge-down" : "badge-up"}`} whileHover={{ scale: 1.05 }}>
          {isGood
            ? <ArrowDownRight className="w-3.5 h-3.5" />
            : <ArrowUpRight   className="w-3.5 h-3.5" />
          }
          {Math.abs(delta).toFixed(1)}%
        </motion.div>
      </div>

      {/* Value */}
      <p className="text-label-xs text-white/40 mb-3">
        {label}
      </p>
      <p className="text-value-lg">
        {typeof value === "number"
          ? <AnimatedNumber value={value} decimals={value % 1 !== 0 ? 1 : 0} />
          : value}
        <span className="text-xs font-medium text-white/35 ml-2">{unit}</span>
      </p>

      {/* Bottom detail */}
      <p className="text-xs text-white/25 mt-4 truncate">{detail}</p>

      {/* Hover accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
      />
    </motion.button>
  )
}

/* =============================================================================
   AI INSIGHTS
============================================================================= */

function AIInsightsPanel({
  filters,
  insightsOverride,
}: {
  filters: DashboardFilters
  insightsOverride?: Array<{ id: string; title: string; description: string; severity: string }>
}) {
  const { data: insightsData = [], isLoading } = useAIInsights(filters)
  const insights = insightsOverride ?? insightsData
  const resolvedLoading = insightsOverride ? false : isLoading

  return (
    <div className="premium-card h-full p-card-lg flex flex-col">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center"
          style={{ boxShadow: "0 0 12px rgba(139,92,246,0.2)" }}>
          <Sparkles className="w-4 h-4 text-violet-400" />
        </div>
        <div>
          <h3 className="text-[13px] font-semibold text-white">AI Insights</h3>
          <p className="text-[10px] text-white/30">
            {resolvedLoading ? "Analyzing data…" : `${insights.length} active insight${insights.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {!resolvedLoading && insights.length > 0 && (
          <div className="ml-auto flex items-center gap-1.5">
            <div className="pulse-dot" />
            <span className="text-[10px] text-white/30">Live</span>
          </div>
        )}
      </div>

      {resolvedLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl shimmer" />
          ))}
        </div>
      )}

      {!resolvedLoading && insights.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[12px] text-white/20 text-center">
            No insights yet — add more energy data to enable analysis.
          </p>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        <div className="space-y-2.5">
          {insights.map((ins, i) => {
            const cfg = insightCfg[ins.severity as keyof typeof insightCfg] ?? insightCfg.low
            const Icon = cfg.icon
            return (
              <motion.div
                key={ins.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ delay: i * 0.06 }}
                className={`relative flex items-start gap-3 p-3.5 rounded-xl border ${cfg.bg} ${cfg.border} overflow-hidden group/ins`}
              >
                <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${cfg.text}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-white leading-tight">
                    {ins.title}
                  </p>
                  <p className="text-[11px] text-white/40 mt-1 leading-relaxed">
                    {ins.description}
                  </p>
                </div>
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0 mt-1"
                  style={{ backgroundColor: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}` }}
                />
              </motion.div>
            )
          })}
        </div>
      </AnimatePresence>
    </div>
  )
}

/* =============================================================================
   ZONE CONSUMPTION CHART
============================================================================= */

function ZoneChart({
  filters,
  dataOverride,
}: {
  filters: DashboardFilters
  dataOverride?: Array<{ zone: string; total_kwh: number; baseline_kwh: number; deviation: number }>
}) {
  const { data: zonesData = [], isLoading } = useLocationConsumption(filters)
  const zones = dataOverride ?? zonesData
  const resolvedLoading = dataOverride ? false : isLoading

  return (
    <div className="premium-card p-card-lg h-full">
        <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center"
          style={{ boxShadow: "0 0 12px rgba(59,130,246,0.2)" }}>
          <MapPin className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <h3 className="text-[13px] font-semibold text-white">Zone Consumption</h3>
          <p className="text-[10px] text-white/30">{zones.length} zones tracked</p>
        </div>
      </div>

      {resolvedLoading && <div className="h-48 rounded-xl shimmer" />}

      {!resolvedLoading && zones.length === 0 && (
        <div className="h-48 flex items-center justify-center text-[12px] text-white/25">
          No zone data available
        </div>
      )}

      {!resolvedLoading && zones.length > 0 && (
        <>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={zones} barCategoryGap="35%"
              margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="zone" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                axisLine={false} tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="total_kwh" name="Actual" radius={[5, 5, 0, 0]}>
                {zones.map((_: any, i: number) => (
                  <Cell key={i} fill={ZONE_COLORS[i % ZONE_COLORS.length]} fillOpacity={0.8} />
                ))}
              </Bar>
              <Bar dataKey="baseline_kwh" name="Baseline" fill="rgba(255,255,255,0.08)" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          {/* Zone rows */}
          <div className="mt-4 space-y-2">
            {zones.slice(0, 4).map((z: any, i: number) => (
              <div key={z.zone} className="flex items-center gap-2.5 group/zone">
                <div className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: ZONE_COLORS[i % ZONE_COLORS.length] }} />
                <span className="text-[11px] text-white/50 flex-1 truncate group-hover/zone:text-white/70 transition-colors">
                  {z.zone}
                </span>
                <span className="text-[11px] font-semibold text-white font-mono">
                  {z.total_kwh.toLocaleString()} kWh
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  z.deviation > 0
                    ? "bg-red-500/10 text-red-400"
                    : "bg-emerald-500/10 text-emerald-400"
                }`}>
                  {z.deviation > 0 ? "+" : ""}{z.deviation.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* =============================================================================
   TREND CHART
============================================================================= */

function TrendChart({ data, loading }: { data: EnergyTrendPoint[], loading: boolean }) {
  const chartData = data.map((d) => ({
    date: new Date(d.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    actual: d.total_kwh,
    baseline: d.baseline_kwh,
  }))

  return (
    <div className="premium-card p-card-lg">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[13px] font-semibold text-white">Energy Consumption Trend</h3>
          <p className="text-[10px] text-white/30 mt-0.5">Actual vs baseline</p>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-white/30">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-400 rounded-full inline-block" />
            Actual
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 inline-block border-t border-dashed border-amber-400/60" />
            Baseline
          </span>
        </div>
      </div>

      {loading && <div className="h-52 rounded-xl shimmer" />}

      {!loading && chartData.length === 0 && (
        <div className="h-52 flex items-center justify-center text-[12px] text-white/25">
          No trend data
        </div>
      )}

      {!loading && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={270}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
              axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
              axisLine={false} tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTip />} cursor={{ stroke: "rgba(255,255,255,0.06)", strokeWidth: 1 }} />
            <Line type="monotone" dataKey="actual" stroke="#3B82F6" strokeWidth={2.5}
              dot={false} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
              name="actual" />
            <Line type="monotone" dataKey="baseline" stroke="#F59E0B" strokeWidth={1.5}
              dot={false} strokeDasharray="5 4" name="baseline" strokeOpacity={0.6} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

/* =============================================================================
   SECONDARY METRIC CARD
============================================================================= */

function MetricCard({ label, value, detail, icon: Icon, color }: any) {
  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="premium-card p-5 flex items-center gap-4 group"
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 icon-box"
        style={{ backgroundColor: `${color}15`, border: `1px solid ${color}25` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">{label}</p>
        <p className="text-xl font-bold text-white mt-0.5 font-mono tracking-tight">{value}</p>
        <p className="text-[10px] text-white/25 truncate mt-0.5">{detail}</p>
      </div>
      <ArrowUpRight className="w-3.5 h-3.5 text-white/10 group-hover:text-white/30 transition-colors" />
    </motion.div>
  )
}

/* =============================================================================
   MAIN
============================================================================= */

export function HomeTab({
  filters,
  onFiltersChange,
  activeDataSourceId = "main",
  billSources = [],
  scannedBills = [],
}: HomeTabProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const api = toApiFilters(filters)
  const activeBillSource = billSources.find((s) => s.id === activeDataSourceId)
  const customDashboard = useMemo(
    () => buildCustomDashboard(activeBillSource, scannedBills),
    [activeBillSource, scannedBills]
  )
  const isCustomDashboard = activeDataSourceId !== "main" && !!customDashboard

  const { data: kpis, isLoading: kpisLoading }       = useDashboardKPIs(api)
  const { data: trend = [], isLoading: trendLoading } = useEnergyTrend(api)
  const { data: appliances }                          = useAppliancesSummary(api)

  const effectiveKpis = isCustomDashboard ? customDashboard.kpis : kpis
  const effectiveTrend = isCustomDashboard ? customDashboard.trend : trend
  const effectiveAppliances = isCustomDashboard ? customDashboard.appliances : appliances
  const effectiveKpisLoading = isCustomDashboard ? false : kpisLoading
  const effectiveTrendLoading = isCustomDashboard ? false : trendLoading

  const kpiCards = [
    {
      id: "consumption", label: "Total Consumption",
      icon: Zap,
      glowClass: "card-glow-blue", iconBg: "bg-blue-500/15",
      iconColor: "text-blue-400", borderColor: "rgba(59,130,246,0.2)",
      accentColor: "#3B82F6",
      value: effectiveKpis?.totalEnergyConsumption?.value ?? 0,
      unit: "kWh", delta: effectiveKpis?.totalEnergyConsumption?.delta ?? 0,
      detail: `Avg: ${((effectiveKpis?.avgConsumption ?? 0) / 1000).toFixed(1)} MWh`,
    },
    {
      id: "saved", label: "Energy Saved",
      icon: TrendingUp,
      glowClass: "card-glow-emerald", iconBg: "bg-emerald-500/15",
      iconColor: "text-emerald-400", borderColor: "rgba(16,185,129,0.2)",
      accentColor: "#10B981",
      value: effectiveKpis?.energySaved?.value ?? 0,
      unit: "kWh", delta: effectiveKpis?.energySaved?.delta ?? 0,
      detail: "vs. previous period",
    },
    {
      id: "over", label: "Overconsumption",
      icon: AlertCircle,
      glowClass: "card-glow-amber", iconBg: "bg-amber-500/15",
      iconColor: "text-amber-400", borderColor: "rgba(245,158,11,0.2)",
      accentColor: "#F59E0B",
      value: effectiveKpis?.overConsumptionPercent?.value ?? 0,
      unit: "%", delta: effectiveKpis?.overConsumptionPercent?.delta ?? 0,
      detail: "above baseline",
    },
    {
      id: "co2", label: "CO₂ Emissions",
      icon: Leaf,
      glowClass: "card-glow-violet", iconBg: "bg-violet-500/15",
      iconColor: "text-violet-400", borderColor: "rgba(139,92,246,0.2)",
      accentColor: "#8B5CF6",
      value: effectiveKpis?.co2Emissions?.value ?? 0,
      unit: "tCO₂e", delta: effectiveKpis?.co2Emissions?.delta ?? 0,
      detail: effectiveKpis?.co2Emissions?.period ?? "",
    },
  ]

  const secondary = [
    {
      id: "cost", label: "Total Cost", icon: TrendingUp, color: "#F59E0B",
      value: effectiveKpis?.totalCost
        ? `₹${effectiveKpis.totalCost.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
        : "—",
      detail: "for selected period",
    },
    {
      id: "avg", label: "Avg Consumption", icon: Zap, color: "#3B82F6",
      value: effectiveKpis?.avgConsumption
        ? `${(effectiveKpis.avgConsumption / 1000).toFixed(1)} MWh`
        : "—",
      detail: `Peak: ${(effectiveKpis?.peakConsumption ?? 0).toLocaleString()} kWh`,
    },
    {
      id: "devices", label: "Active Devices", icon: Activity, color: "#10B981",
      value: effectiveAppliances?.active_devices ?? "—",
      detail: `${effectiveAppliances?.total_devices ?? 0} total devices`,
    },
  ]

  return (
    <div className="min-h-screen bg-[#070707] px-8 py-12 text-white">
      <BillSideChat
        preferredDeviceId={api.device_id}
        filters={filters}
        onFiltersChange={onFiltersChange}
        kpiSnapshot={{
          totalKwh: effectiveKpis?.totalEnergyConsumption?.value ?? 0,
          totalCost: effectiveKpis?.totalCost ?? 0,
          overPct: effectiveKpis?.overConsumptionPercent?.value ?? 0,
        }}
      />

      <div className="max-w-[1400px] mx-auto">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            System Overview
          </h1>
          <p className="text-white/35 mt-1.5 text-[13px]">
            Live energy intelligence & sustainability metrics
          </p>
        </motion.div>

        {/* ── KPI Cards ── */}
        <section className="pb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {effectiveKpisLoading
              ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
              : kpiCards.map((c, i) => (
                <motion.div key={c.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}>
                  <KPICard {...c} onClick={() => setSelected(c.id)} />
                </motion.div>
              ))
            }
          </div>
        </section>

        {/* ── Section Divider ── */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent my-4" />

        {/* ── Trend + Zone ── */}
        <section className="py-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <TrendChart data={effectiveTrend} loading={effectiveTrendLoading} />
            </div>
            <ZoneChart filters={api} dataOverride={isCustomDashboard ? customDashboard.zones : undefined} />
          </div>
        </section>

        {/* ── Section Divider ── */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent my-4" />

        {/* ── Insights + Secondaries ── */}
        <section className="pt-10 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <AIInsightsPanel
                filters={api}
                insightsOverride={isCustomDashboard ? customDashboard.insights : undefined}
              />
            </div>
            <div className="space-y-6">
              {secondary.map((s, i) => (
                <motion.div key={s.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.08 }}>
                  <MetricCard {...s} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

      </div>

      {/* ── Detail Modal ── */}
      <AnimatePresence>
        {selected && (() => {
          const card = kpiCards.find((c) => c.id === selected)
          if (!card) return null
          const Icon = card.icon
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 12 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                onClick={(e) => e.stopPropagation()}
                className="premium-card p-8 max-w-sm w-full shadow-2xl"
              >
                <div className="flex items-center justify-between mb-7">
                  <div className="flex items-center gap-3">
                    <div className={`icon-box w-11 h-11 ${card.iconBg}`}
                      style={{ border: `1px solid ${card.borderColor}` }}>
                      <Icon className={`w-5 h-5 ${card.iconColor}`} />
                    </div>
                    <p className="font-semibold text-white">{card.label}</p>
                  </div>
                  <button onClick={() => setSelected(null)}
                    className="p-1.5 rounded-lg hover:bg-white/8 transition-colors">
                    <X className="w-4 h-4 text-white/40" />
                  </button>
                </div>

                <p className="stat-number-lg">
                  {(card.value as number).toLocaleString("en-US", { maximumFractionDigits: 1 })}
                  <span className="text-base font-normal text-white/30 ml-2">{card.unit}</span>
                </p>

                <div className={`badge mt-4 ${card.delta > 0 ? "badge-up" : "badge-down"}`}>
                  {card.delta > 0
                    ? <ArrowUpRight className="w-3 h-3" />
                    : <ArrowDownRight className="w-3 h-3" />
                  }
                  {Math.abs(card.delta).toFixed(1)}% vs last period
                </div>

                <p className="text-[12px] text-white/35 mt-3">{card.detail}</p>

                <button onClick={() => setSelected(null)}
                  className="mt-6 w-full py-2.5 rounded-xl bg-white/6 hover:bg-white/10 border border-white/8 text-white text-[13px] font-medium transition-all">
                  Close
                </button>
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}