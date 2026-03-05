"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { BarChart3, ExternalLink, Loader2, Info } from "lucide-react"

/*
  NOTE:
  Power BI is used ONLY for advanced analytical exploration.
  Core metrics, KPIs, forecasting, and anomaly detection
  are computed and served by the EN-VISION backend.
*/

const POWER_BI_EMBED_URL =
  "https://app.powerbi.com/reportEmbed?reportId=your-report-id"

export function PowerBITab() {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  /* -------------------------
     Simulated embed load state
     ------------------------- */
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1200)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="p-6 space-y-6 h-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-chart-5/10">
              <BarChart3 className="w-5 h-5 text-chart-5" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Advanced BI Exploration
              </h2>
              <p className="text-muted-foreground text-sm">
                Enterprise analytics & deep business insights
              </p>
            </div>
          </div>

          {/* Role clarification */}
          <div className="mt-4 p-3 rounded-lg bg-secondary/50 border border-border flex items-start gap-2 max-w-xl">
            <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                Architectural Clarity:{" "}
              </span>
              EN-VISION computes all core analytics, baselines, anomalies,
              forecasts, and carbon metrics in its backend. Power BI is used
              strictly for advanced reporting, slicing, and ad-hoc exploration
              by analysts and decision-makers.
            </p>
          </div>
        </div>

        {/* External open */}
        <a
          href={POWER_BI_EMBED_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-sm font-medium text-foreground transition-colors shrink-0"
        >
          <ExternalLink className="w-4 h-4" />
          Open in Power BI
        </a>
      </motion.div>

      {/* Power BI Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card overflow-hidden relative"
        style={{ height: "calc(100vh - 280px)", minHeight: "500px" }}
      >
        {/* Loading */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-card z-10">
            <Loader2 className="w-8 h-8 text-chart-5 animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">
              Initializing Power BI dashboard…
            </p>
          </div>
        )}

        {/* Error */}
        {hasError && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-card">
            <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-foreground font-medium mb-2">
              Unable to load Power BI
            </p>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Access may be restricted or the embed configuration may be
              incomplete.
            </p>
            <button
              onClick={() => {
                setIsLoading(true)
                setHasError(false)
                setTimeout(() => setIsLoading(false), 1200)
              }}
              className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Placeholder (intentional) */}
        {!hasError && !isLoading && (
          <div className="w-full h-full bg-secondary/30 flex flex-col items-center justify-center">
            <div className="text-center max-w-lg px-6">
              <BarChart3 className="w-16 h-16 text-chart-5/50 mx-auto mb-6" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Power BI Analytics Workspace
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                This section embeds advanced Power BI dashboards for deeper
                analysis beyond the core EN-VISION UI.
              </p>
              <p className="text-xs text-muted-foreground/70">
                Replace <code>POWER_BI_EMBED_URL</code> with your secure Power BI
                embed link to enable live integration.
              </p>
            </div>

            {/* Mock grid */}
            <div className="mt-8 grid grid-cols-3 gap-4 px-6 w-full max-w-2xl">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-24 rounded-lg bg-secondary/50 animate-pulse"
                />
              ))}
            </div>
          </div>
        )}

        {/* 
          REAL EMBED (SECURE MODE)
          Uncomment when using actual Power BI embed URL + permissions

        <iframe
          title="Power BI Report"
          src={POWER_BI_EMBED_URL}
          className="w-full h-full border-0"
          allowFullScreen
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false)
            setHasError(true)
          }}
        />
        */}
      </motion.div>
    </div>
  )
}
