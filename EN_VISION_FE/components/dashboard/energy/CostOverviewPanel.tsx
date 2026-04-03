"use client"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"

import {
  useDashboardKPIs,
  useEnergyTrend,
  useCarbonBreakdown,
  type DashboardFilters,
} from "@/hooks/use-dashboard-data"
import type { EnergyTrendPoint, CarbonBreakdownItem } from "@/lib/api/dashboard"

import { CostBarChart, type CostDay } from "./CostBarChart"
import { CostBreakdownCard, type CostBreakdownItem } from "./CostBreakdownCard"

/* =============================================================================
   GAUGE SVG — semi-circle arc from 9 o'clock to 3 o'clock over the top
============================================================================= */

function GaugeArc({ pct }: { pct: number }) {
  const CX = 100
  const CY = 110
  const R  = 72
  const C    = 2 * Math.PI * R
  const SEMI = Math.PI * R          // 180° arc length
  const p    = Math.min(100, Math.max(0, pct))
  const fill = (p / 100) * SEMI
  const off  = C * 0.5             // offset to start arc at 9 o'clock

  return (
    <svg width={200} height={128} viewBox="0 0 200 128">
      <defs>
        <linearGradient id="gaugeFill" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>

      {/* Gray background track */}
      <circle
        cx={CX} cy={CY} r={R}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={12}
        strokeLinecap="round"
        strokeDasharray={`${SEMI} ${C - SEMI}`}
        strokeDashoffset={off}
      />

      {/* Colored fill arc */}
      <circle
        cx={CX} cy={CY} r={R}
        fill="none"
        stroke="url(#gaugeFill)"
        strokeWidth={12}
        strokeLinecap="round"
        strokeDasharray={`${fill} ${C - fill}`}
        strokeDashoffset={off}
      />

      {/* Budget tick at 12 o'clock (top of arc) */}
      <line
        x1={CX} y1={CY - R - 3}
        x2={CX} y2={CY - R - 11}
        stroke="rgba(255,255,255,0.30)"
        strokeWidth={1.5}
      />
      <text
        x={CX} y={CY - R - 15}
        textAnchor="middle"
        fill="rgba(255,255,255,0.30)"
        fontSize={9}
        fontFamily="system-ui, sans-serif"
      >
        Budget
      </text>
    </svg>
  )
}

/* =============================================================================
   CONSTANTS
============================================================================= */

const SOURCE_COLORS = ["#818CF8", "#A3E635", "#F59E0B", "#EC4899", "#10B981"]

/* =============================================================================
   PANEL
============================================================================= */

export interface CostOverviewPanelProps {
  filters: DashboardFilters
}

export function CostOverviewPanel({ filters }: CostOverviewPanelProps) {
  const { data: kpis,       isLoading: kpisL  } = useDashboardKPIs(filters)
  const { data: trend = [], isLoading: trendL } = useEnergyTrend(filters)
  const { data: carbonBk = [] }                  = useCarbonBreakdown()

  /* Daily cost series — last 8 data points */
  const dailyCosts = useMemo<CostDay[]>(() => {
    return (trend as EnergyTrendPoint[]).slice(-8).map((d) => ({
      label: new Date(d.timestamp)
        .toLocaleDateString("en-US", { weekday: "short" })
        .toUpperCase(),
      cost: d.total_cost,
    }))
  }, [trend])

  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const activeLabel = selectedDay ?? dailyCosts[dailyCosts.length - 1]?.label ?? null

  /* Summary values */
  const totalCost   = kpis?.totalCost ?? 0
  const totalEnergy = kpis?.totalEnergyConsumption?.value ?? 0
  const estBudget   = totalCost > 0 ? totalCost * 1.3 : 0
  const gaugePct    = estBudget > 0 ? Math.min(95, (totalCost / estBudget) * 100) : 0

  /* Active day cost */
  const activeCost = dailyCosts.find((d) => d.label === activeLabel)?.cost ?? 0

  /* Cost breakdown — derived from carbon source proportions */
  const breakdown = useMemo<CostBreakdownItem[]>(() => {
    if (!(carbonBk as CarbonBreakdownItem[]).length || activeCost === 0) return []
    const total = (carbonBk as CarbonBreakdownItem[]).reduce(
      (s, c) => s + c.value, 0
    )
    if (total === 0) return []
    return (carbonBk as CarbonBreakdownItem[]).slice(0, 4).map((c, i) => ({
      source: c.source,
      value:  (c.value / total) * activeCost,
      color:  SOURCE_COLORS[i % SOURCE_COLORS.length],
    }))
  }, [carbonBk, activeCost])

  const hasCostData = dailyCosts.some((d) => d.cost > 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="premium-card p-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Left: Gauge + Summary ── */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative" style={{ width: 200, height: 128 }}>
            <GaugeArc pct={gaugePct} />
            {/* Overlay text centred in the gauge bowl */}
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 pointer-events-none">
              <p className="text-[10px] text-white/40">Total</p>
              <p className="text-xl font-bold text-white tracking-tight">
                ₹{totalCost.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          {kpisL ? (
            <div className="w-full space-y-2">
              <div className="h-4 rounded shimmer" />
              <div className="h-4 rounded shimmer" />
            </div>
          ) : (
            <div className="w-full space-y-2 px-2">
              <div className="flex justify-between text-[12px]">
                <span className="text-white/40">Budget est.</span>
                <span className="font-semibold text-white">
                  ₹{estBudget.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-white/40">Usage</span>
                <span className="font-semibold text-white">
                  {Math.round(totalEnergy).toLocaleString()} kWh
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Center: Daily bar chart ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-white/30 uppercase tracking-widest">
              Daily Cost
            </p>
            <p className="text-[10px] text-white/20">INR</p>
          </div>
          <p className="text-[10px] text-white/25 mb-2">Tariff basis: ₹8.2 per kWh (India avg)</p>
          <CostBarChart
            data={dailyCosts}
            loading={trendL}
            selectedLabel={activeLabel ?? undefined}
            onSelect={setSelectedDay}
          />
        </div>

        {/* ── Right: Breakdown ── */}
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">
            {activeLabel ? `${activeLabel} · Breakdown` : "Breakdown"}
          </p>

          {hasCostData && breakdown.length > 0 ? (
            <CostBreakdownCard
              items={breakdown}
              loading={trendL || kpisL}
            />
          ) : (
            <div className="premium-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: "#818CF8", boxShadow: "0 0 6px #818CF880" }}
                />
                <span className="text-[12px] text-white/60 flex-1">Total Cost</span>
                <span className="text-[13px] font-bold text-white font-mono">
                  ₹{(activeCost || totalCost).toLocaleString("en-IN", {
                    minimumFractionDigits: 2, maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <p className="text-[10px] text-white/20">
                Source breakdown requires multi-meter setup.
              </p>
            </div>
          )}
        </div>

      </div>
    </motion.div>
  )
}
