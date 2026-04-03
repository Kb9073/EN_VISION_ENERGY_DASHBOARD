"use client"

import React, { JSX } from "react"
import { useEffect, useMemo, useState } from "react"
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
  TimeRange,
} from "@/components/dashboard/filter-controls"
import {
  BILL_SOURCES_EVENT,
  type BillDashboardSource,
  type ScannedBill,
} from "@/components/dashboard/bill-side-chat"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { EnergyActivation } from "@/components/auth/energy-activation"
import { completeActivation, shouldShowActivation } from "@/lib/auth"
import { useAuth } from "@/components/auth/auth-provider"
import type { UserRole } from "@/types/auth"

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
    component: ({
      filters,
      onFiltersChange,
    }: {
      filters: FilterState
      onFiltersChange?: (next: FilterState) => void
    }) => JSX.Element
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
  const { user, logout } = useAuth()
  const role = (user?.role ?? "Viewer") as UserRole

  const allowedByRole: Record<UserRole, TabId[]> = {
    Admin: ["home", "energy", "anomalies", "forecasting", "carbon", "powerbi"],
    User: ["home", "energy", "anomalies", "forecasting", "carbon"],
    Viewer: ["home", "energy", "anomalies"],
  }

  const allowedTabs = useMemo(() => allowedByRole[role], [role])

  const [activeTab, setActiveTab] = useState<TabId>(allowedTabs[0] ?? "home")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isRecommendationsOpen, setIsRecommendationsOpen] = useState(false)
  const [activationDone, setActivationDone] = useState(true)

  const [filters, setFilters] = useState<FilterState>({
    timeRange: "7d",
    department_id: null,
    device_id: null,
  })
  const [mainFilters, setMainFilters] = useState<FilterState>({
    timeRange: "7d",
    department_id: null,
    device_id: null,
  })
  const [billSources, setBillSources] = useState<BillDashboardSource[]>([])
  const [scannedBills, setScannedBills] = useState<ScannedBill[]>([])
  const [activeDataSourceId, setActiveDataSourceId] = useState<string>("main")

  const [recommendations] = useState<Recommendation[]>([])
  const pendingCount = recommendations.filter(
    (r) => r.severity === "high" || r.severity === "medium"
  ).length

  useEffect(() => {
    if (typeof window === "undefined") return
    setActivationDone(!shouldShowActivation())
  }, [])

  useEffect(() => {
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0] ?? "home")
    }
  }, [allowedTabs, activeTab])

  useEffect(() => {
    const onBillSourcesUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{
        bills?: ScannedBill[]
        sources?: BillDashboardSource[]
        selectedSourceId?: string
      }>
      const nextBills = customEvent.detail?.bills ?? []
      const nextSources = customEvent.detail?.sources ?? []
      const selectedSourceId = customEvent.detail?.selectedSourceId

      setScannedBills(nextBills)
      setBillSources(nextSources)

      if (selectedSourceId) {
        setActiveDataSourceId(selectedSourceId)
        if (selectedSourceId === "main") {
          setFilters(mainFilters)
          return
        }
        const picked = nextSources.find((s) => s.id === selectedSourceId)
        if (picked) {
          setFilters(picked.filter)
        }
      }
    }

    window.addEventListener(BILL_SOURCES_EVENT, onBillSourcesUpdated)
    return () => window.removeEventListener(BILL_SOURCES_EVENT, onBillSourcesUpdated)
  }, [mainFilters])

  const activeBillSource = useMemo(
    () => billSources.find((s) => s.id === activeDataSourceId),
    [billSources, activeDataSourceId]
  )
  const isCustomSource = activeDataSourceId !== "main" && !!activeBillSource

  const sourceDepartmentOptions = useMemo(() => {
    if (!activeBillSource) return []
    const map = new Map<number, string>()
    scannedBills
      .filter((b) => activeBillSource.billIds.includes(b.id))
      .forEach((b) => {
        if (b.assignedDepartmentId && b.assignedDepartmentName) {
          map.set(b.assignedDepartmentId, b.assignedDepartmentName)
        }
      })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [activeBillSource, scannedBills])

  const sourceDeviceOptions = useMemo(() => {
    if (!activeBillSource) return []
    const map = new Map<number, string>()
    scannedBills
      .filter((b) => activeBillSource.billIds.includes(b.id))
      .forEach((b) => {
        if (b.assignedDeviceId && b.assignedDeviceName) {
          map.set(b.assignedDeviceId, b.assignedDeviceName)
        }
      })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [activeBillSource, scannedBills])

  const dataSourceOptions = useMemo(
    () => [{ id: "main", label: "Main Data" }, ...billSources.map((s) => ({ id: s.id, label: s.label }))],
    [billSources]
  )

  const handleFilterChange = (next: FilterState) => {
    if (isCustomSource && activeBillSource) {
      setFilters({ ...activeBillSource.filter })
      return
    }
    setMainFilters(next)
    setFilters(next)
  }

  const handleDataSourceChange = (sourceId: string) => {
    setActiveDataSourceId(sourceId)
    if (sourceId === "main") {
      setFilters(mainFilters)
      return
    }
    const source = billSources.find((s) => s.id === sourceId)
    if (source) {
      setFilters(source.filter)
    }
  }

  const { title, subtitle, component: TabComponent } = tabConfig[activeTab]

  const handleActivationComplete = () => {
    completeActivation()
    setActivationDone(true)
  }

  if (!activationDone) {
    return <EnergyActivation onComplete={handleActivationComplete} />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#070707]">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        role={role}
        userName={user?.username}
      />

      <div className="flex-1 flex flex-col overflow-hidden bg-transparent">
        <Header
          title={title}
          subtitle={subtitle}
          filters={filters}
          onFiltersChange={handleFilterChange}
          dataSources={dataSourceOptions}
          activeDataSourceId={activeDataSourceId}
          onDataSourceChange={handleDataSourceChange}
          lockControls={isCustomSource}
          allowedTimeRanges={isCustomSource ? (activeBillSource?.lockedTimeRanges ?? ["custom" as TimeRange]) : undefined}
          departmentOptionsOverride={isCustomSource ? sourceDepartmentOptions : undefined}
          deviceOptionsOverride={isCustomSource ? sourceDeviceOptions : undefined}
          userName={user?.username}
          role={role}
          onLogout={logout}
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
              {activeTab === "home" ? (
                <HomeTab
                  filters={filters}
                  onFiltersChange={handleFilterChange}
                  activeDataSourceId={activeDataSourceId}
                  billSources={billSources}
                  scannedBills={scannedBills}
                />
              ) : (
                <TabComponent filters={filters} onFiltersChange={handleFilterChange} />
              )}
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
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}