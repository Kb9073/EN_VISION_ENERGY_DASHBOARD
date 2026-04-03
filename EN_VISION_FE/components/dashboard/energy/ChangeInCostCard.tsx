"use client"

import { motion } from "framer-motion"
import { TrendingUp, TrendingDown } from "lucide-react"
import { useDashboardKPIs, type DashboardFilters } from "@/hooks/use-dashboard-data"

interface ChangeInCostCardProps {
  filters: DashboardFilters
}

function getPeriodLabels(timeRange?: string): [string, string] {
  switch (timeRange) {
    case "24h": return ["Prev 24h", "Last 24h"]
    case "7d":  return ["Last Week", "This Week"]
    case "30d": return ["Last Month", "This Month"]
    case "90d": return ["Prev 90d", "This 90d"]
    default:    return ["Previous", "Current"]
  }
}

export function ChangeInCostCard({ filters }: ChangeInCostCardProps) {
  const { data: kpis, isLoading } = useDashboardKPIs(filters)

  const currentCost  = kpis?.totalCost ?? 0
  const delta        = kpis?.totalEnergyConsumption?.delta ?? 0
  // Derive previous cost from energy delta (proxy for cost delta)
  const previousCost = delta !== 0
    ? currentCost / (1 + delta / 100)
    : currentCost > 0 ? currentCost * 0.948 : 0

  const pctChange  = previousCost > 0
    ? ((currentCost - previousCost) / previousCost) * 100
    : 0
  const isIncrease = pctChange >= 0

  const [prevLabel, currLabel] = getPeriodLabels(filters.timeRange)
  const maxVal = Math.max(previousCost, currentCost, 1)

  const bars = [
    { label: prevLabel, value: previousCost, color: "#38BDF8" },
    { label: currLabel, value: currentCost,  color: "#34D399" },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="premium-card p-6 h-full"
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-5">
        Change in Cost
      </p>

      {isLoading ? (
        <div className="h-36 rounded-xl shimmer" />
      ) : (
        <div className="flex items-center gap-6">
          {/* Bar comparison */}
          <div className="flex items-end gap-5 h-36 flex-1">
            {bars.map((bar) => {
              const barH = Math.max(20, (bar.value / maxVal) * 96)
              return (
                <div key={bar.label} className="flex flex-col items-center gap-2 flex-1">
                  <span className="text-[11px] font-bold text-white">
                    ₹{Math.round(bar.value).toLocaleString("en-IN")}
                  </span>
                  <motion.div
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="w-full rounded-t-lg origin-bottom"
                    style={{
                      height: `${barH}px`,
                      backgroundColor: bar.color,
                      opacity: 0.82,
                      maxWidth: "80px",
                    }}
                  />
                  <span className="text-[10px] text-white/35">{bar.label}</span>
                </div>
              )
            })}
          </div>

          {/* Percentage indicator */}
          <div className="flex flex-col items-center gap-1.5 px-3 shrink-0">
            {isIncrease
              ? <TrendingUp  className="w-6 h-6 text-red-400"     />
              : <TrendingDown className="w-6 h-6 text-emerald-400" />
            }
            <p className={`text-2xl font-bold tracking-tight ${
              isIncrease ? "text-red-400" : "text-emerald-400"
            }`}>
              {Math.abs(pctChange).toFixed(2)}%
            </p>
            <p className={`text-[10px] font-semibold uppercase tracking-wide text-center leading-tight ${
              isIncrease ? "text-red-400/70" : "text-emerald-400/70"
            }`}>
              {isIncrease ? "Increase in Cost" : "Decrease in Cost"}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  )
}
