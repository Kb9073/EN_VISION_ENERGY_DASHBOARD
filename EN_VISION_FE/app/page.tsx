"use client"

import React, { JSX } from "react"
import { useState } from "react"
import { Providers } from "@/components/providers"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { HomeTab } from "@/components/tabs/home-tab"
import { EnergyTab } from "@/components/tabs/energy-tab"
import { AnomaliesTab } from "@/components/tabs/anomalies-tab"
import { ForecastingTab } from "@/components/tabs/forecasting-tab"
import { CarbonTab } from "@/components/tabs/CarbonTab"
import { PowerBITab } from "@/components/tabs/power-bi-tab"
import {
  RecommendationsPanel,
  RecommendationsButton,
  type Recommendation,
} from "@/components/dashboard/recommendations-panel"
import { AnimatePresence, motion } from "framer-motion"
import type {
  FilterState,
  CustomDateRange,
} from "@/components/dashboard/filter-controls"

/* =============================================================================
   TYPES
============================================================================= */

type TabId =
  | "home"
  | "energy"
  | "anomalies"
  | "forecasting"
  | "carbon"
  | "powerbi"

const tabConfig: Record<
  TabId,
  {
    title: string
    subtitle: string
    component: ({ filters }: { filters: FilterState }) => JSX.Element
  }
> = {
  home: {
    title: "",
    subtitle: "",
    component: HomeTab,
  },
  energy: {
    title: "",
    subtitle: "",
    component: EnergyTab,
  },
  anomalies: {
    title: "",
    subtitle: "",
    component: AnomaliesTab,
  },
  forecasting: {
    title: "",
    subtitle: "",
    component: ForecastingTab,
  },
  carbon: {
    title: "Carbon Analytics",
    subtitle: "Emissions tracking",
    component: CarbonTab,
  },
  powerbi: {
    title: "BI Explorer",
    subtitle: "Advanced analytics",
    component: PowerBITab,
  },
}

/* =============================================================================
   DASHBOARD CONTENT
============================================================================= */

function DashboardContent() {
  const [activeTab, setActiveTab] = useState<TabId>("home")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isRecommendationsOpen, setIsRecommendationsOpen] = useState(false)

  const [filters, setFilters] = useState<FilterState>({
    timeRange: "7d",
    department_id: null,
    device_id: null,
  })

  const [customDateRange, setCustomDateRange] = useState<
    CustomDateRange | undefined
  >()

  const [recommendations] = useState<Recommendation[]>([])
  const pendingCount = recommendations.filter(
    (r) => r.severity === "high" || r.severity === "medium"
  ).length

  const { title, subtitle, component: TabComponent } = tabConfig[activeTab]

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title={title}
          subtitle={subtitle}
          filters={filters}
          customDateRange={customDateRange}
          onFiltersChange={setFilters}
          onCustomDateRangeChange={setCustomDateRange}
        />

        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <TabComponent filters={filters} />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <RecommendationsButton
        onClick={() => setIsRecommendationsOpen(true)}
        count={pendingCount}
      />

      <RecommendationsPanel
        isOpen={isRecommendationsOpen}
        onClose={() => setIsRecommendationsOpen(false)}
        recommendations={recommendations}
      />
    </div>
  )
}

/* =============================================================================
   PAGE EXPORT
============================================================================= */

export default function Page() {
  return (
    <Providers>
      <DashboardContent />
    </Providers>
  )
}