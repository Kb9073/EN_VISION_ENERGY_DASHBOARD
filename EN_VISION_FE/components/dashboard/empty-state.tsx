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

const stateConfig: Record<
  EmptyStateType,
  {
    icon: typeof CheckCircle2
    title: string
    description: string
    accent: string
    iconBg: string
    iconBorder: string
    iconColor: string
    pulse?: boolean
  }
> = {
  "no-anomalies": {
    icon: CheckCircle2,
    title: "All Systems Normal",
    description:
      "No anomalies detected. Energy usage is operating within expected thresholds.",
    accent: "#10b981",
    iconBg: "rgba(16,185,129,0.1)",
    iconBorder: "rgba(16,185,129,0.25)",
    iconColor: "#34d399",
    pulse: true,
  },
  "no-data": {
    icon: Database,
    title: "No Data Available",
    description:
      "No data found for the selected time range or filters. Try adjusting your selection.",
    accent: "#3b82f6",
    iconBg: "rgba(59,130,246,0.1)",
    iconBorder: "rgba(59,130,246,0.2)",
    iconColor: "#60a5fa",
  },
  "loading-slow": {
    icon: Wifi,
    title: "Taking Longer Than Usual",
    description:
      "The server is responding slowly. Please wait a moment or check your connection.",
    accent: "#f59e0b",
    iconBg: "rgba(245,158,11,0.1)",
    iconBorder: "rgba(245,158,11,0.2)",
    iconColor: "#fbbf24",
  },
  "api-error": {
    icon: AlertCircle,
    title: "Connection Error",
    description:
      "Unable to fetch data from the server. Please try again shortly.",
    accent: "#ef4444",
    iconBg: "rgba(239,68,68,0.1)",
    iconBorder: "rgba(239,68,68,0.2)",
    iconColor: "#f87171",
  },
  "no-results": {
    icon: Search,
    title: "No Results Found",
    description:
      "Your search didn't match any records. Try different keywords or filters.",
    accent: "#8b5cf6",
    iconBg: "rgba(139,92,246,0.1)",
    iconBorder: "rgba(139,92,246,0.2)",
    iconColor: "#a78bfa",
  },
}

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
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "flex flex-col items-center justify-center py-14 px-6 text-center",
        className
      )}
    >
      {/* Glow ring behind icon */}
      <div className="relative mb-6">
        {config.pulse && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ background: `radial-gradient(circle, ${config.accent}22 0%, transparent 70%)` }}
              animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ background: `radial-gradient(circle, ${config.accent}15 0%, transparent 70%)` }}
              animate={{ scale: [1, 2, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            />
          </>
        )}

        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", delay: 0.1, stiffness: 260, damping: 18 }}
          className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: config.iconBg,
            border: `1px solid ${config.iconBorder}`,
            backdropFilter: "blur(12px)",
            boxShadow: `0 0 32px ${config.accent}20, 0 8px 24px rgba(0,0,0,0.4)`,
          }}
        >
          <Icon className="w-7 h-7" style={{ color: config.iconColor }} />
        </motion.div>
      </div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h3 className="text-base font-semibold text-white mb-2">
          {title ?? config.title}
        </h3>
        <p className="text-sm text-white/35 max-w-xs leading-relaxed">
          {description ?? config.description}
        </p>
      </motion.div>

      {/* Retry */}
      {onRetry && (
        <motion.button
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          onClick={onRetry}
          className="mt-5 px-5 py-2 text-sm font-medium text-white rounded-xl transition-all"
          style={{
            background: config.iconBg,
            border: `1px solid ${config.iconBorder}`,
            backdropFilter: "blur(8px)",
          }}
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
        >
          Try Again
        </motion.button>
      )}
    </motion.div>
  )
}