"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Building2,
  Clock,
  BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts"

/* =========================
   TYPES
   ========================= */

export interface KPIDetailData {
  trend: { date: string; value: number }[]
  breakdown: { name: string; value: number; percentage: number }[]
  context: {
    affectedDepartments: string[]
    peakHour: string
    comparedToBaseline: number
    lastUpdated: string
  }
}

interface KPIDetailPanelProps {
  isOpen: boolean
  onClose: () => void
  title: string
  value: number
  unit: string
  delta?: number
  glowColor: "cyan" | "green" | "amber" | "red"
  formatValue?: (value: number) => string
  detailData?: KPIDetailData
}

/* =========================
   STYLES
   ========================= */

const glowColorMap = {
  cyan: "oklch(0.75 0.15 195)",
  green: "oklch(0.7 0.18 160)",
  amber: "oklch(0.75 0.15 85)",
  red: "oklch(0.65 0.2 25)",
}

const accentClasses = {
  cyan: "text-chart-1",
  green: "text-chart-2",
  amber: "text-chart-3",
  red: "text-chart-4",
}

/* =========================
   COMPONENT
   ========================= */

export function KPIDetailPanel({
  isOpen,
  onClose,
  title,
  value,
  unit,
  delta,
  glowColor,
  formatValue,
  detailData,
}: KPIDetailPanelProps) {
  const displayValue = formatValue
    ? formatValue(value)
    : value.toLocaleString()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-background border-l border-border z-50 overflow-y-auto"
          >
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {title}
                  </h2>

                  <div className="flex items-baseline gap-2 mt-1">
                    <span
                      className={cn(
                        "text-3xl font-bold",
                        accentClasses[glowColor],
                      )}
                    >
                      {displayValue}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {unit}
                    </span>
                  </div>

                  {delta !== undefined && (
                    <div className="flex items-center gap-1.5 mt-2">
                      {delta > 0 ? (
                        <TrendingUp className="w-4 h-4 text-chart-2" />
                      ) : delta < 0 ? (
                        <TrendingDown className="w-4 h-4 text-chart-4" />
                      ) : (
                        <Minus className="w-4 h-4 text-muted-foreground" />
                      )}

                      <span
                        className={cn(
                          "text-sm font-medium",
                          delta > 0
                            ? "text-chart-2"
                            : delta < 0
                            ? "text-chart-4"
                            : "text-muted-foreground",
                        )}
                      >
                        {delta > 0 ? "+" : ""}
                        {delta.toFixed(1)}% vs last period
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* If no backend detail */}
              {!detailData && (
                <div className="glass-card p-6 text-center text-sm text-muted-foreground">
                  Detailed analytics not available for this KPI yet.
                </div>
              )}

              {detailData && (
                <>
                  {/* Trend */}
                  <div className="glass-card p-4">
                    <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-muted-foreground" />
                      Recent Trend
                    </h3>

                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={detailData.trend}>
                          <defs>
                            <linearGradient
                              id={`gradient-${glowColor}`}
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor={glowColorMap[glowColor]}
                                stopOpacity={0.4}
                              />
                              <stop
                                offset="95%"
                                stopColor={glowColorMap[glowColor]}
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>

                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="oklch(0.25 0.03 260 / 0.3)"
                            vertical={false}
                          />
                          <XAxis dataKey="date" tickLine={false} />
                          <YAxis tickLine={false} axisLine={false} />
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke={glowColorMap[glowColor]}
                            strokeWidth={2}
                            fill={`url(#gradient-${glowColor})`}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div className="glass-card p-4">
                    <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      Breakdown
                    </h3>

                    <div className="space-y-3">
                      {detailData.breakdown.map((item) => (
                        <div key={item.name}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{item.name}</span>
                            <span className="text-muted-foreground">
                              {item.percentage}%
                            </span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${item.percentage}%` }}
                              className="h-full rounded-full"
                              style={{
                                backgroundColor:
                                  glowColorMap[glowColor],
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Context */}
                  <div className="glass-card p-4">
                    <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      Context
                    </h3>

                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Affected Departments
                        </span>
                        <span>
                          {detailData.context.affectedDepartments.join(", ")}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Peak Hour
                        </span>
                        <span>{detailData.context.peakHour}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          vs Baseline
                        </span>
                        <span
                          className={
                            detailData.context.comparedToBaseline < 0
                              ? "text-chart-2"
                              : "text-chart-4"
                          }
                        >
                          {detailData.context.comparedToBaseline > 0
                            ? "+"
                            : ""}
                          {detailData.context.comparedToBaseline}%
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Last Updated
                        </span>
                        <span>
                          {detailData.context.lastUpdated}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
