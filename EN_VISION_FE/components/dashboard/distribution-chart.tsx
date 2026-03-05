"use client"

import { motion } from "framer-motion"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
} from "recharts"
import type { CarbonBreakdown } from "@/lib/api"

interface DistributionChartProps {
  data: CarbonBreakdown[]
  isLoading?: boolean
  title?: string
  centerLabel?: string
  centerValue?: string
}

/* =========================
   COLOR PALETTE
   ========================= */

const COLORS = [
  "oklch(0.75 0.15 195)",
  "oklch(0.7 0.18 160)",
  "oklch(0.75 0.15 85)",
  "oklch(0.65 0.2 25)",
]

/* =========================
   TOOLTIP
   ========================= */

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null

  const data = payload[0]

  return (
    <div className="glass-card p-3 border border-border">
      <p className="text-sm font-medium text-foreground">
        {data.name}
      </p>
      <p className="text-xs text-muted-foreground">
        {Number(data.value).toLocaleString()} tCO₂e
        {data.payload?.percentage !== undefined && (
          <> ({data.payload.percentage}%)</>
        )}
      </p>
    </div>
  )
}

/* =========================
   COMPONENT
   ========================= */

export function DistributionChart({
  data,
  isLoading,
  title = "Distribution",
  centerLabel,
  centerValue,
}: DistributionChartProps) {
  /* ---------- Loading ---------- */
  if (isLoading) {
    return (
      <div className="glass-card p-5 h-72 animate-pulse">
        <div className="h-5 w-32 bg-muted rounded mb-4" />
        <div className="h-48 w-48 mx-auto bg-muted rounded-full" />
      </div>
    )
  }

  /* ---------- Empty State ---------- */
  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-5 h-72 flex flex-col items-center justify-center text-sm text-muted-foreground">
        No distribution data available
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card p-5"
    >
      {/* Title */}
      <h3 className="text-sm font-medium text-foreground mb-4">
        {title}
      </h3>

      {/* Chart */}
      <div className="h-56 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              nameKey="category"
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Label */}
        {centerLabel && centerValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-semibold text-foreground">
              {centerValue}
            </span>
            <span className="text-xs text-muted-foreground">
              {centerLabel}
            </span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {data.map((item, index) => (
          <div
            key={item.category}
            className="flex items-center gap-2"
          >
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor:
                  COLORS[index % COLORS.length],
              }}
            />
            <span className="text-xs text-muted-foreground">
              {item.category}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
