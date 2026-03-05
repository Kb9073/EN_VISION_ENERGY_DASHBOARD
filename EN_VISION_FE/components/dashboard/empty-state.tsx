"use client"

import { motion } from "framer-motion"
import {
  CheckCircle2,
  AlertCircle,
  Wifi,
  Search,
  Database,
} from "lucide-react"
import { cn } from "@/lib/utils"

type EmptyStateType =
  | "no-anomalies"
  | "no-data"
  | "loading-slow"
  | "api-error"
  | "no-results"

interface EmptyStateProps {
  type: EmptyStateType
  title?: string
  description?: string
  className?: string
  onRetry?: () => void
}

/* =========================
   STATE CONFIG
   ========================= */

const stateConfig: Record<
  EmptyStateType,
  {
    icon: typeof CheckCircle2
    title: string
    description: string
    color: string
  }
> = {
  "no-anomalies": {
    icon: CheckCircle2,
    title: "No Anomalies Detected",
    description:
      "All systems are operating normally. Energy usage is within expected thresholds.",
    color: "text-chart-2",
  },
  "no-data": {
    icon: Database,
    title: "No Data Available",
    description:
      "No data was found for the selected time range or filters. Try adjusting your selection.",
    color: "text-muted-foreground",
  },
  "loading-slow": {
    icon: Wifi,
    title: "Taking Longer Than Usual",
    description:
      "The server is responding slowly. Please wait a moment or check your connection.",
    color: "text-chart-3",
  },
  "api-error": {
    icon: AlertCircle,
    title: "Connection Error",
    description:
      "Unable to fetch data from the server. Please try again shortly.",
    color: "text-chart-4",
  },
  "no-results": {
    icon: Search,
    title: "No Results Found",
    description:
      "Your search didn’t match any records. Try different keywords or filters.",
    color: "text-muted-foreground",
  },
}

/* =========================
   COMPONENT
   ========================= */

export function EmptyState({
  type,
  title,
  description,
  className,
  onRetry,
}: EmptyStateProps) {
  const config = stateConfig[type]
  const Icon = config.icon

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex flex-col items-center justify-center py-12 px-6 text-center",
        className
      )}
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.1 }}
        className={cn(
          "p-4 rounded-full bg-secondary mb-4",
          config.color
        )}
      >
        <Icon className="w-8 h-8" />
      </motion.div>

      {/* Text */}
      <h3 className="text-lg font-medium text-foreground mb-2">
        {title ?? config.title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-md">
        {description ?? config.description}
      </p>

      {/* Retry */}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          Try Again
        </button>
      )}
    </motion.div>
  )
}
