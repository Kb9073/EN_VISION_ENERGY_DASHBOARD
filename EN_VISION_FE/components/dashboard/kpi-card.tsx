"use client"

import type React from "react"
import { motion, useSpring, useTransform } from "framer-motion"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { KPIDetailPanel } from "./kpi-detail-panel"
import type { KPIDetailData } from "@/lib/api/dashboard"

/* =========================
   TYPES
   ========================= */

interface KPICardProps {
  title: string
  value: number
  unit: string
  delta?: number
  deltaLabel?: string
  glowColor?: "cyan" | "green" | "amber" | "red"
  icon?: React.ReactNode
  isLoading?: boolean
  formatValue?: (value: number) => string
  severity?: "normal" | "warning" | "critical"
  clickable?: boolean
  detailData?: KPIDetailData
}

/* =========================
   ANIMATED NUMBER
   ========================= */

function AnimatedNumber({
  value,
  formatValue,
}: {
  value: number
  formatValue?: (value: number) => string
}) {
  const spring = useSpring(0, { stiffness: 50, damping: 20 })
  const display = useTransform(spring, (v) =>
    formatValue
      ? formatValue(v)
      : v.toLocaleString("en-US", { maximumFractionDigits: 1 }),
  )

  const [displayValue, setDisplayValue] = useState("0")

  useEffect(() => {
    spring.set(value)
  }, [spring, value])

  useEffect(() => {
    return display.on("change", (v) => setDisplayValue(v))
  }, [display])

  return <span>{displayValue}</span>
}

/* =========================
   COMPONENT
   ========================= */

export function KPICard({
  title,
  value,
  unit,
  delta,
  deltaLabel,
  glowColor = "cyan",
  icon,
  isLoading,
  formatValue,
  severity = "normal",
  clickable = true,
  detailData,
}: KPICardProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  // ✅ FINAL CLICK GUARD
  const canOpenPanel = clickable && !!detailData

  const glowClasses = {
    cyan:
      severity === "critical"
        ? "glow-cyan-intense"
        : severity === "warning"
        ? "glow-cyan"
        : "hover:glow-cyan",
    green:
      severity === "critical"
        ? "glow-green-intense"
        : severity === "warning"
        ? "glow-green"
        : "hover:glow-green",
    amber:
      severity === "critical"
        ? "glow-amber-intense"
        : severity === "warning"
        ? "glow-amber"
        : "hover:glow-amber",
    red:
      severity === "critical"
        ? "glow-red-intense animate-pulse-slow"
        : severity === "warning"
        ? "glow-red"
        : "hover:glow-red",
  }

  const accentClasses = {
    cyan: "text-chart-1",
    green: "text-chart-2",
    amber: "text-chart-3",
    red: "text-chart-4",
  }

  const bgAccentClasses = {
    cyan: "bg-chart-1/10",
    green: "bg-chart-2/10",
    amber: "bg-chart-3/10",
    red: "bg-chart-4/10",
  }

  if (isLoading) {
    return (
      <div className="glass-card p-5 animate-pulse">
        <div className="h-4 w-24 bg-muted rounded mb-3" />
        <div className="h-8 w-32 bg-muted rounded mb-2" />
        <div className="h-3 w-20 bg-muted rounded" />
      </div>
    )
  }

  return (
    <>
      <motion.div
        title={!canOpenPanel ? "Detailed view coming soon" : undefined}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: canOpenPanel ? 1.02 : 1 }}
        whileTap={canOpenPanel ? { scale: 0.98 } : undefined}
        transition={{ duration: 0.3 }}
        onClick={() => canOpenPanel && setIsPanelOpen(true)}
        className={cn(
          "glass-card p-5 transition-shadow duration-300",
          glowClasses[glowColor],
          canOpenPanel && "cursor-pointer",
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <span className="text-sm text-muted-foreground">{title}</span>
          {icon && (
            <div className={cn("p-2 rounded-lg", bgAccentClasses[glowColor])}>
              <div className={accentClasses[glowColor]}>{icon}</div>
            </div>
          )}
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className={cn("text-3xl font-semibold", accentClasses[glowColor])}>
            <AnimatedNumber value={value} formatValue={formatValue} />
          </span>
          <span className="text-sm text-muted-foreground">{unit}</span>
        </div>

        {delta !== undefined && (
          <div className="flex items-center gap-1.5">
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
                delta > 0 ? "text-chart-2" : delta < 0 ? "text-chart-4" : "text-muted-foreground",
              )}
            >
              {typeof delta === "number" && (
                <span
                  className={cn(
                    "text-sm font-medium",
                    delta > 0 ? "text-emerald-400" : "text-red-400"
                  )}    
                >
                  {delta > 0 ? "+" : ""}
                  {delta.toFixed(1)}%
                </span>
              )}
            </span>
            {deltaLabel && <span className="text-xs text-muted-foreground">{deltaLabel}</span>}
          </div>
        )}
      </motion.div>

      <KPIDetailPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        title={title}
        value={value}
        unit={unit}
        delta={delta}
        glowColor={glowColor}
        formatValue={formatValue}
        detailData={detailData}
      />
    </>
  )
}
