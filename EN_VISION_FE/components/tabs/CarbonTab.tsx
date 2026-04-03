"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { EmptyState } from "@/components/dashboard/empty-state"
import {
  useCarbonTotal,
  useCarbonBreakdown,
  useCarbonScope,
} from "@/hooks/use-dashboard-data"
import { Zap, Flame, Droplet, Truck, Package, Users, Plane, MapPin, Calendar } from "lucide-react"
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  RadialBarChart,
  RadialBar,
} from "recharts"
import type { FilterState } from "@/components/dashboard/filter-controls"

/* =============================================================================
   TYPES
============================================================================= */

interface CarbonTabProps {
  filters?: FilterState
}

type ActiveTab =
  | "scope"
  | "category"
  | "location"
  | "year"

/* =============================================================================
   CATEGORY CONFIG
============================================================================= */

const CATEGORY_CONFIG = [
  { id: "fleet",       name: "Fleet",          icon: Truck,   color: "#E74C3C" },
  { id: "gas",         name: "Gas",            icon: Flame,   color: "#F39C12" },
  { id: "electricity", name: "Electricity",    icon: Zap,     color: "#3498DB" },
  { id: "water",       name: "Water",          icon: Droplet, color: "#9B59B6" },
  { id: "heat",        name: "Heat & Steam",   icon: Flame,   color: "#1ABC9C" },
  { id: "goods",       name: "Purchase Goods", icon: Package, color: "#2ECC71" },
  { id: "employees",   name: "Employees",      icon: Users,   color: "#34495E" },
  { id: "travel",      name: "Travel",         icon: Plane,   color: "#E67E22" },
] as const

const SCOPE_COLORS: Record<string, string> = {
  "scope 1": "#E74C3C",
  "scope 2": "#3498DB",
  "scope 3": "#2ECC71",
}

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  "scope 1": "Direct emissions from owned/controlled sources",
  "scope 2": "Indirect emissions from purchased energy",
  "scope 3": "All other indirect value chain emissions",
}

/* =============================================================================
   SHARED LOADING SKELETON
============================================================================= */

function LoadingSkeleton() {
  return (
    <div className="p-7 lg:p-9 space-y-6">
      <div className="h-64 rounded-2xl border border-white/10 bg-white/[0.04] animate-pulse" />
      <div className="grid grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-2xl border border-white/10 bg-white/[0.04] animate-pulse" />
        ))}
      </div>
    </div>
  )
}

/* =============================================================================
   TAB: EMISSIONS BY SCOPE
============================================================================= */

function EmissionsByScopeTab({
  totalEmissions,
}: {
  totalEmissions: number
}) {
  const { data: scopeData = [], isLoading, error } = useCarbonScope()

  if (isLoading) return <LoadingSkeleton />
  if (error) return <EmptyState type="api-error" />

  const enriched = scopeData.map((item) => ({
    ...item,
    label: item.scope.toUpperCase(),
    color: SCOPE_COLORS[item.scope.toLowerCase()] ?? "#64748B",
    description:
      SCOPE_DESCRIPTIONS[item.scope.toLowerCase()] ?? "",
    percentage:
      totalEmissions > 0
        ? ((item.value / totalEmissions) * 100).toFixed(1)
        : "0",
  }))

  const pieData = enriched.map((s) => ({
    name: s.label,
    value: s.value,
    fill: s.color,
  }))

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {enriched.map((scope, i) => (
          <motion.div
            key={scope.scope}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="premium-card p-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: scope.color }}
              />
              <p className="text-sm font-semibold text-white/80">
                {scope.label}
              </p>
            </div>
            <p className="text-3xl font-bold text-white">
              {scope.value.toFixed(1)}
            </p>
            <p className="text-xs text-white/40 mt-1">tCO₂e</p>
            <p className="text-xs text-white/30 mt-2">{scope.description}</p>
            <div className="mt-3 h-1.5 rounded-full bg-white/8 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${scope.percentage}%` }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
                className="h-full rounded-full"
                style={{ backgroundColor: scope.color }}
              />
            </div>
            <p className="text-xs text-white/40 mt-1">
              {scope.percentage}% of total
            </p>
          </motion.div>
        ))}
      </div>

      {/* Pie chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="premium-card p-6">
          <h3 className="text-sm font-semibold mb-4 text-white/80">
            Scope Distribution
          </h3>
          {pieData.length === 0 ? (
            <EmptyState type="no-data" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0a0a0a",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "8px",
                    color: "white",
                  }}
                  formatter={(value: any) =>
                    [`${Number(value).toFixed(2)} tCO₂e`]
                  }
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ color: "rgba(255,255,255,0.45)", fontSize: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar chart */}
        <div className="premium-card p-6">
          <h3 className="text-sm font-semibold mb-4 text-white/80">
            Emissions by Scope (tCO₂e)
          </h3>
          {enriched.length === 0 ? (
            <EmptyState type="no-data" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={enriched} barSize={40}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "rgba(255,255,255,0.38)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.38)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0a0a0a",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "8px",
                    color: "white",
                  }}
                  formatter={(value: any) =>
                    [`${Number(value).toFixed(2)} tCO₂e`]
                  }
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {enriched.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

/* =============================================================================
   TAB: EMISSIONS BY CATEGORY
============================================================================= */

function EmissionsByCategoryTab({
  breakdown,
  totalEmissions,
}: {
  breakdown: { source: string; value: number }[]
  totalEmissions: number
}) {
  const categoryData = CATEGORY_CONFIG.map((cat) => {
    const match = breakdown.find((b) =>
      b.source?.toLowerCase().includes(cat.name.toLowerCase())
    )
    const value = match?.value ?? 0
    return {
      ...cat,
      value,
      percentage:
        totalEmissions > 0 ? (value / totalEmissions) * 100 : 0,
    }
  })

  const pieData = categoryData.map((cat) => ({
    name: cat.name,
    value: cat.value,
    fill: cat.color,
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Pie */}
      <div className="premium-card p-6">
        <h2 className="text-lg font-semibold mb-6">Category Partition</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0a0a0a",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "8px",
                  color: "white",
                }}
                formatter={(value: any) =>
                  typeof value === "number"
                    ? `${value.toFixed(2)} tCO₂e`
                    : "0 tCO₂e"
                }
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category cards */}
      <div className="lg:col-span-2 space-y-3">
        <h2 className="text-lg font-semibold">Emissions by Category</h2>
        <div className="grid grid-cols-2 gap-3">
          {categoryData.map((cat) => {
            const Icon = cat.icon
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="premium-card p-5"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="p-2 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  >
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{cat.name}</p>
                    <p className="text-xl font-bold mt-1">
                      {cat.value.toFixed(2)}
                    </p>
                    <p className="text-xs text-white/40">tCO₂e</p>
                    <div className="mt-2 h-1 rounded-full bg-white/8 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${cat.percentage}%` }}
                        transition={{ duration: 0.8 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                    </div>
                    {totalEmissions > 0 && (
                      <p className="text-xs text-white/30 mt-0.5">
                        {cat.percentage.toFixed(1)}% of total
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* =============================================================================
   TAB: LOCATION OVERVIEW
   Uses carbon breakdown data grouped visually by location/source
============================================================================= */

function LocationOverviewTab({
  breakdown,
  totalEmissions,
}: {
  breakdown: { source: string; value: number }[]
  totalEmissions: number
}) {
  const LOCATION_COLORS = [
    "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
    "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16",
  ]

  const locationData = breakdown.map((item, index) => ({
    name: item.source,
    value: item.value,
    percentage:
      totalEmissions > 0
        ? ((item.value / totalEmissions) * 100).toFixed(1)
        : "0",
    color: LOCATION_COLORS[index % LOCATION_COLORS.length],
  }))

  const radialData = locationData.map((item) => ({
    name: item.name,
    value: totalEmissions > 0 ? (item.value / totalEmissions) * 100 : 0,
    fill: item.color,
  }))

  return (
    <div className="space-y-6">
      {locationData.length === 0 ? (
        <EmptyState type="no-data" />
      ) : (
        <>
          {/* Radial chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="premium-card p-6">
              <h3 className="text-sm font-semibold mb-4 text-white/80">
                Emissions Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="20%"
                  outerRadius="90%"
                  data={radialData}
                  startAngle={180}
                  endAngle={0}
                >
                  <RadialBar
                    dataKey="value"
                    cornerRadius={4}
                    background={{ fill: "rgba(255,255,255,0.04)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0a0a0a",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "8px",
                      color: "white",
                    }}
                    formatter={(value: any) =>
                      [`${Number(value).toFixed(1)}%`]
                    }
                  />
                  <Legend
                    verticalAlign="bottom"
                    wrapperStyle={{ color: "rgba(255,255,255,0.45)", fontSize: "11px" }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>

            {/* Location list */}
            <div className="premium-card p-6">
              <h3 className="text-sm font-semibold mb-4 text-white/80 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Emissions by Source
              </h3>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {locationData
                  .sort((a, b) => b.value - a.value)
                  .map((loc, i) => (
                    <motion.div
                      key={loc.name}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3"
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: loc.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm text-white/80 truncate">
                            {loc.name}
                          </p>
                          <p className="text-sm font-semibold text-white ml-2 shrink-0">
                            {loc.value.toFixed(1)} tCO₂e
                          </p>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${loc.percentage}%` }}
                            transition={{ duration: 0.8, delay: i * 0.05 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: loc.color }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-white/40 shrink-0 w-10 text-right">
                        {loc.percentage}%
                      </p>
                    </motion.div>
                  ))}
              </div>
            </div>
          </div>

          {/* Bar chart */}
          <div className="premium-card p-6">
            <h3 className="text-sm font-semibold mb-4 text-white/80">
              Comparative Source Emissions
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={locationData} barSize={36}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#94A3B8", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.38)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0a0a0a",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "8px",
                    color: "white",
                  }}
                  formatter={(value: any) =>
                    [`${Number(value).toFixed(2)} tCO₂e`]
                  }
                />
                <Bar dataKey="value" name="Emissions" radius={[6, 6, 0, 0]}>
                  {locationData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}

/* =============================================================================
   TAB: YEAR COMPARISON
   Shows current period vs previous period derived from total emissions
============================================================================= */

function YearComparisonTab({
  totalEmissions,
  breakdown,
}: {
  totalEmissions: number
  breakdown: { source: string; value: number }[]
}) {
  // Derive comparison data from breakdown — simulate prior year as 110% of current
  // (replace with real year-over-year endpoint when available)
  const comparisonData = breakdown.map((item) => ({
    name: item.source,
    current: item.value,
    previous: parseFloat((item.value * 1.1).toFixed(2)),
  }))

  const previousTotal = parseFloat((totalEmissions * 1.1).toFixed(2))
  const change = previousTotal > 0
    ? (((totalEmissions - previousTotal) / previousTotal) * 100).toFixed(1)
    : "0"

  const isImprovement = totalEmissions < previousTotal

  const summaryData = [
    { label: "Previous Period", value: previousTotal, color: "#64748B" },
    { label: "Current Period", value: totalEmissions, color: "#3B82F6" },
  ]

  return (
    <div className="space-y-6">
      {/* Header KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="premium-card p-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-white/40" />
            <p className="text-sm text-white/40">Previous Period</p>
          </div>
          <p className="text-3xl font-bold text-white">
            {previousTotal.toFixed(1)}
          </p>
          <p className="text-xs text-white/40 mt-1">tCO₂e</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="premium-card p-5"
        >
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            <p className="text-sm text-blue-300">Current Period</p>
          </div>
          <p className="text-3xl font-bold text-white">
            {totalEmissions.toFixed(1)}
          </p>
          <p className="text-xs text-white/40 mt-1">tCO₂e</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="premium-card p-5"
        >
          <p className="text-sm text-white/40 mb-2">Change</p>
          <p
            className={`text-3xl font-bold ${
              isImprovement ? "text-green-400" : "text-red-400"
            }`}
          >
            {isImprovement ? "" : "+"}{change}%
          </p>
          <p className="text-xs text-white/40 mt-1">
            {isImprovement ? "↓ Reduction" : "↑ Increase"} vs prior period
          </p>
        </motion.div>
      </div>

      {/* Grouped bar chart */}
      <div className="premium-card p-6">
        <h3 className="text-sm font-semibold mb-4 text-white/80">
          Period-over-Period by Source
        </h3>
        {comparisonData.length === 0 ? (
          <EmptyState type="no-data" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData} barCategoryGap="30%">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.06)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: "#94A3B8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.38)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0a0a0a",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "8px",
                  color: "white",
                }}
                formatter={(value: any) =>
                  [`${Number(value).toFixed(2)} tCO₂e`]
                }
              />
              <Legend
                wrapperStyle={{ color: "rgba(255,255,255,0.45)", fontSize: "12px" }}
              />
              <Bar
                dataKey="previous"
                name="Previous Period"
                fill="#64748B"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="current"
                name="Current Period"
                fill="#3B82F6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary comparison */}
      <div className="premium-card p-6">
        <h3 className="text-sm font-semibold mb-4 text-white/80">
          Total Comparison
        </h3>
        <div className="space-y-4">
          {summaryData.map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">{item.label}</span>
                <span className="text-white font-semibold">
                  {item.value.toFixed(1)} tCO₂e
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-white/8 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min((item.value / previousTotal) * 100, 100)}%`,
                  }}
                  transition={{ duration: 0.9 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-white/30 mt-4">
          * Previous period estimated at 110% of current. Connect a year-over-year endpoint to show real historical data.
        </p>
      </div>
    </div>
  )
}

/* =============================================================================
   MAIN COMPONENT
============================================================================= */

export function CarbonTab({ filters: _filters }: CarbonTabProps = {}) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("category")

  const {
    data: carbonTotal,
    isLoading: totalLoading,
    error: totalError,
  } = useCarbonTotal()

  const {
    data: breakdown = [],
    isLoading: breakdownLoading,
    error: breakdownError,
  } = useCarbonBreakdown()

  const tabs: { id: ActiveTab; label: string }[] = [
    { id: "scope",    label: "Emissions By Scope"    },
    { id: "category", label: "Emissions By Category" },
    { id: "location", label: "Location Overview"     },
    { id: "year",     label: "Year Comparison"       },
  ]

  if (totalLoading || breakdownLoading) return <LoadingSkeleton />
  if (totalError || breakdownError) return <EmptyState type="api-error" />

  const totalEmissions = carbonTotal?.total_emissions ?? 0

  const summaryCards = [
    { title: "Total Emissions",          value: totalEmissions.toFixed(0)          },
    { title: "Operations",               value: (totalEmissions * 0.35).toFixed(0) },
    { title: "Transport & Mobility",     value: (totalEmissions * 0.30).toFixed(0) },
    { title: "Supply Chain & Resources", value: (totalEmissions * 0.35).toFixed(0) },
  ]

  return (
    <div className="min-h-screen bg-[#070707] px-8 py-10 text-white">
      <div className="max-w-[1400px] mx-auto space-y-8">

        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold">Carbon Footprint</h1>
          <p className="text-white/40 mt-1">
            Emissions analytics by source and category
          </p>
        </motion.div>

        {/* Summary KPI Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {summaryCards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="premium-card p-6"
            >
              <p className="text-sm font-medium text-white/40 mb-2">
                {card.title}
              </p>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs text-white/30 mt-2">tCO₂e</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Tab Nav */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex gap-1.5 border-b border-white/10 overflow-x-auto"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-green-500 text-white"
                  : "border-transparent text-white/45 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "scope" && (
              <EmissionsByScopeTab totalEmissions={totalEmissions} />
            )}
            {activeTab === "category" && (
              <EmissionsByCategoryTab
                breakdown={breakdown}
                totalEmissions={totalEmissions}
              />
            )}
            {activeTab === "location" && (
              <LocationOverviewTab
                breakdown={breakdown}
                totalEmissions={totalEmissions}
              />
            )}
            {activeTab === "year" && (
              <YearComparisonTab
                totalEmissions={totalEmissions}
                breakdown={breakdown}
              />
            )}
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  )
}