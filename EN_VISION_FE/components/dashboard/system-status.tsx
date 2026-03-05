"use client"

import { motion } from "framer-motion"
import { ShieldCheck, AlertTriangle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface SystemStatusProps {
  systemStatus?: "stable" | "at-risk" | "critical"
  sustainabilityStatus?: "on-track" | "deviating" | "exceeding"
  lastUpdated?: string
}

const systemConfig = {
  stable: {
    label: "System Stable",
    icon: ShieldCheck,
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  "at-risk": {
    label: "At Risk",
    icon: AlertTriangle,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  critical: {
    label: "Critical",
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
} as const

export function SystemStatus({
  systemStatus,
  sustainabilityStatus,
  lastUpdated,
}: SystemStatusProps) {
  // safety guard
  if (!systemStatus || !systemConfig[systemStatus]) {
    return null
  }

  const { icon: Icon, label, color, bg } = systemConfig[systemStatus]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("glass-card p-5 space-y-3", bg)}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn("w-6 h-6", color)} />
        <div>
          <p className="font-medium">{label}</p>
          {sustainabilityStatus && (
            <p className="text-xs text-muted-foreground">
              Sustainability: {sustainabilityStatus.replace("-", " ")}
            </p>
          )}
        </div>
      </div>

      {lastUpdated && (
        <p className="text-xs text-muted-foreground">
          Updated {new Date(lastUpdated).toLocaleTimeString()}
        </p>
      )}
    </motion.div>
  )
}
