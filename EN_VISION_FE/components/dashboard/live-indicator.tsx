"use client"

import { motion } from "framer-motion"
import { Wifi, WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface LiveIndicatorProps {
  lastUpdated?: string | Date | null
}

/**
 * Pure UI indicator.
 * Data freshness is decided by backend timestamps.
 */
export function LiveIndicator({ lastUpdated }: LiveIndicatorProps) {
  if (!lastUpdated) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-secondary text-xs text-muted-foreground">
        <WifiOff className="w-3.5 h-3.5" />
        No data yet
      </div>
    )
  }

  const date =
    typeof lastUpdated === "string"
      ? new Date(lastUpdated)
      : lastUpdated

  const isValid = !isNaN(date.getTime())
  if (!isValid) {
    return null
  }

  const minutesAgo = Math.floor(
    (Date.now() - date.getTime()) / 60000,
  )

  const isLive = minutesAgo <= 2

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "flex items-center gap-2 px-2 py-1 rounded-md text-xs",
        isLive ? "bg-secondary" : "bg-destructive/10",
      )}
    >
      {isLive ? (
        <Wifi className="w-3.5 h-3.5 text-chart-2" />
      ) : (
        <WifiOff className="w-3.5 h-3.5 text-chart-4" />
      )}

      <span
        className={cn(
          isLive ? "text-muted-foreground" : "text-chart-4",
        )}
      >
        {isLive ? "Live" : "Stale"} •{" "}
        {date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </motion.div>
  )
}
