"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Lightbulb,
  Zap,
  Leaf,
  AlertTriangle,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"

/* =============================================================================
   TYPE — matches backend contract: { title, description, severity }
============================================================================= */

export interface Recommendation {
  title: string
  description: string
  severity: "low" | "medium" | "high"
}

interface EnrichedRecommendation extends Recommendation {
  id: string
  reviewed: boolean
}

/* =============================================================================
   CONFIG
============================================================================= */

const severityConfig: Record<
  "low" | "medium" | "high",
  { label: string; borderClass: string; textClass: string }
> = {
  low: {
    label: "Low Priority",
    borderClass: "border-l-chart-1",
    textClass: "text-chart-1",
  },
  medium: {
    label: "Medium Priority",
    borderClass: "border-l-chart-3",
    textClass: "text-chart-3",
  },
  high: {
    label: "High Priority",
    borderClass: "border-l-chart-4",
    textClass: "text-chart-4",
  },
}

function inferIcon(rec: Recommendation): typeof Zap {
  const text = `${rec.title} ${rec.description}`.toLowerCase()
  if (text.includes("carbon") || text.includes("emission") || text.includes("green"))
    return Leaf
  if (text.includes("alert") || text.includes("critical") || text.includes("risk"))
    return AlertTriangle
  return Zap
}

/* =============================================================================
   RECOMMENDATION CARD
============================================================================= */

function RecommendationCard({
  recommendation,
  onMarkReviewed,
}: {
  recommendation: EnrichedRecommendation
  onMarkReviewed: (id: string) => void
}) {
  const severity = severityConfig[recommendation.severity]
  const Icon = inferIcon(recommendation)
  const isReviewed = recommendation.reviewed

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: isReviewed ? 0.6 : 1, x: 0 }}
      className={cn(
        "glass-card p-4 border-l-4 hover:bg-secondary/30 transition-all",
        severity.borderClass,
        recommendation.severity === "high" &&
          !isReviewed &&
          "animate-border-pulse"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg shrink-0 bg-secondary">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm font-medium text-foreground leading-snug",
              isReviewed && "line-through opacity-70"
            )}
          >
            {recommendation.title}
          </p>

          <p className="text-xs text-muted-foreground mt-1">
            {recommendation.description}
          </p>

          <div className="flex items-center gap-3 mt-2">
            <span className={cn("text-xs font-medium", severity.textClass)}>
              {severity.label}
            </span>
          </div>

          {!isReviewed ? (
            <button
              type="button"
              onClick={() => onMarkReviewed(recommendation.id)}
              className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Mark as reviewed
            </button>
          ) : (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-chart-2">
              <Check className="w-3.5 h-3.5" />
              Reviewed
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* =============================================================================
   PANEL
============================================================================= */

interface RecommendationsPanelProps {
  isOpen: boolean
  onClose: () => void
  recommendations?: Recommendation[]
}

export function RecommendationsPanel({
  isOpen,
  onClose,
  recommendations = [],
}: RecommendationsPanelProps) {
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set())

  const handleMarkReviewed = (id: string) => {
    setReviewedIds((prev) => new Set(prev).add(id))
  }

  // Derive stable IDs from index since backend sends no id field
  const enriched: EnrichedRecommendation[] = recommendations.map((r, i) => ({
    ...r,
    id: `rec-${i}`,
    reviewed: reviewedIds.has(`rec-${i}`),
  }))

  const sorted = [...enriched].sort((a, b) => {
    if (a.reviewed !== b.reviewed) return a.reviewed ? 1 : -1
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 }
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3)
  })

  const highPriority = sorted.filter(
    (r) => r.severity === "high" && !r.reviewed
  )
  const others = sorted.filter(
    (r) => r.severity !== "high" || r.reviewed
  )
  const pendingCount = sorted.filter((r) => !r.reviewed).length

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
            className="fixed right-0 top-0 h-full w-full max-w-lg bg-background border-l border-border z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Lightbulb className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      Recommendations
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {sorted.length} total • {pendingCount} pending
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {highPriority.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-chart-4 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Requires Attention ({highPriority.length})
                  </h3>
                  <div className="space-y-3">
                    {highPriority.map((rec) => (
                      <RecommendationCard
                        key={rec.id}
                        recommendation={rec}
                        onMarkReviewed={handleMarkReviewed}
                      />
                    ))}
                  </div>
                </div>
              )}

              {others.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    {highPriority.length > 0
                      ? "Other Recommendations"
                      : "All Recommendations"}
                  </h3>
                  <div className="space-y-3">
                    {others.map((rec) => (
                      <RecommendationCard
                        key={rec.id}
                        recommendation={rec}
                        onMarkReviewed={handleMarkReviewed}
                      />
                    ))}
                  </div>
                </div>
              )}

              {sorted.length === 0 && (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No recommendations at this time.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                Generated from historical patterns and live analytics
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* =============================================================================
   FLOATING BUTTON
============================================================================= */

export function RecommendationsButton({
  onClick,
  count,
}: {
  onClick: () => void
  count: number
}) {
  if (count <= 0) return null

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 z-30 flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors glow-cyan"
    >
      <Lightbulb className="w-5 h-5" />
      <span className="font-medium text-sm">Recommendations</span>
      <span className="ml-1 px-2 py-0.5 rounded-full bg-primary-foreground/20 text-xs font-semibold">
        {count}
      </span>
    </motion.button>
  )
}