"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Gauge, Zap, Leaf } from "lucide-react"
import type { LucideIcon } from "lucide-react"

/* =========================
   TYPES
   ========================= */

export type ScenarioMode = "normal" | "high-load" | "energy-saving"

interface ScenarioToggleProps {
  activeMode: ScenarioMode
  onModeChange: (mode: ScenarioMode) => void
}

interface ScenarioConfig {
  id: ScenarioMode
  label: string
  icon: LucideIcon
  description: string
}

/* =========================
   CONFIG
   ========================= */

const scenarios: ScenarioConfig[] = [
  {
    id: "normal",
    label: "Normal",
    icon: Gauge,
    description: "Standard operations",
  },
  {
    id: "high-load",
    label: "High Load",
    icon: Zap,
    description: "Peak demand simulation",
  },
  {
    id: "energy-saving",
    label: "Eco Mode",
    icon: Leaf,
    description: "Optimized efficiency",
  },
]

/* =========================
   COMPONENT
   ========================= */

export function ScenarioToggle({
  activeMode,
  onModeChange,
}: ScenarioToggleProps) {
  return (
    <div
      className="glass-card p-1 inline-flex gap-1"
      role="group"
      aria-label="Scenario selection"
    >
      {scenarios.map((scenario) => {
        const Icon = scenario.icon
        const isActive = activeMode === scenario.id

        return (
          <button
            key={scenario.id}
            type="button"
            onClick={() => onModeChange(scenario.id)}
            aria-pressed={isActive}
            title={scenario.description}
            className={cn(
              "relative px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2",
              isActive
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {isActive && (
              <motion.div
                layoutId="scenario-bg"
                className="absolute inset-0 bg-primary rounded-lg"
                transition={{
                  type: "spring",
                  bounce: 0.2,
                  duration: 0.4,
                }}
              />
            )}

            <span className="relative z-10 flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5" />
              {scenario.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
