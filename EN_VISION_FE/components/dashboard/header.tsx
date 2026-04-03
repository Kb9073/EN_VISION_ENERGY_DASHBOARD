"use client"

import { Bell, AlertTriangle, CalendarDays, ChevronDown, Clock, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  FilterControls,
  type FilterState,
  type TimeRange,
} from "./filter-controls"
import type { BillRangeOption } from "./bill-side-chat"
import type { UserRole } from "@/types/auth"

type DataSourceOption = {
  id: string
  label: string
}

interface HeaderProps {
  title: string
  subtitle?: string
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  dataSources?: DataSourceOption[]
  activeDataSourceId?: string
  onDataSourceChange?: (sourceId: string) => void
  lockControls?: boolean
  allowedTimeRanges?: TimeRange[]
  departmentOptionsOverride?: { id: number; name: string }[]
  deviceOptionsOverride?: { id: number; name: string }[]
  notificationCount?: number
  userName?: string
  role: UserRole
  onLogout: () => Promise<void>
}

export function Header({
  title,
  subtitle,
  filters,
  onFiltersChange,
  dataSources = [{ id: "main", label: "Main Data" }],
  activeDataSourceId = "main",
  onDataSourceChange,
  lockControls = false,
  allowedTimeRanges,
  departmentOptionsOverride,
  deviceOptionsOverride,
  notificationCount = 3,
  userName,
  role,
  onLogout,
}: HeaderProps) {
  const BILL_RANGES_EVENT = "bill-ranges-updated"

  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifTab, setNotifTab] = useState<"alerts" | "updates" | "mentions">("alerts")
  const notifRef = useRef<HTMLDivElement | null>(null)
  const [billRanges, setBillRanges] = useState<BillRangeOption[]>([])
  const [selectedBillRangeId, setSelectedBillRangeId] = useState("")

  const NOTIFS = {
    alerts: [
      { id: 1, title: "Zone B Overconsumption", desc: "10.4% above baseline. Review peak-hours scheduling.", time: "2m ago", severity: "high" as const },
      { id: 2, title: "HVAC Anomaly Detected", desc: "Unusual energy spike in Zone A HVAC at 14:30.", time: "18m ago", severity: "medium" as const },
      { id: 3, title: "Peak Demand Alert", desc: "Contracted demand limit reached (95%) at 22:15.", time: "8h ago", severity: "medium" as const },
    ],
    updates: [
      { id: 4, title: "Weekly Report Ready", desc: "7-day energy summary (Feb 27–Mar 6) is available to download.", time: "1h ago" },
      { id: 5, title: "Baseline Recalculated", desc: "30-day rolling baseline updated with latest consumption data.", time: "6h ago" },
    ],
    mentions: [
      { id: 6, title: "@admin", desc: "Please review the forecasting deviation for Zone D — off by ~12% vs last week.", time: "3h ago" },
    ],
  }

  const notifBadgeCount = NOTIFS.alerts.length

  // Live clock — updates every minute
  const [dateStr, setDateStr] = useState("")
  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    setDateStr(fmt())
    const t = setInterval(() => setDateStr(fmt()), 60_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const onBillRangesUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ ranges?: BillRangeOption[]; selectedId?: string }>
      const ranges = customEvent.detail?.ranges ?? []
      const selectedId = customEvent.detail?.selectedId ?? ""
      setBillRanges(ranges)
      setSelectedBillRangeId(selectedId)
    }

    window.addEventListener(BILL_RANGES_EVENT, onBillRangesUpdated)
    return () => window.removeEventListener(BILL_RANGES_EVENT, onBillRangesUpdated)
  }, [])

  const applyBillRange = (range: BillRangeOption) => {
    const common = {
      department_id: filters.department_id,
      device_id: filters.device_id,
    }

    let next: FilterState

    if (range.suggestedRange === "90d") {
      next = { ...common, timeRange: "90d" }
    } else if (range.suggestedRange === "30d") {
      next = { ...common, timeRange: "30d" }
    } else if (range.suggestedRange === "7d") {
      next = { ...common, timeRange: "7d" }
    } else if (range.start_date && range.end_date) {
      next = {
        ...common,
        timeRange: "custom",
        start_date: range.start_date,
        end_date: range.end_date,
      }
    } else {
      const fallbackRange: TimeRange = filters.timeRange === "24h" ? "24h" : "7d"
      next = { ...common, timeRange: fallbackRange }
    }

    onFiltersChange(next)
  }

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(event.target as Node)) setMenuOpen(false)
      if (!notifRef.current) return
      if (!notifRef.current.contains(event.target as Node)) setNotifOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  const initials = (userName ?? "User").slice(0, 2).toUpperCase()

  return (
    <header
      className="shrink-0 flex items-center justify-between px-6 lg:px-8 gap-6"
      style={{
        height: 64,
        background: "rgba(6,9,15,0.85)",
        backdropFilter: "blur(32px) saturate(160%)",
        WebkitBackdropFilter: "blur(32px) saturate(160%)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      {/* ── Left: Title ── */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3 min-w-0 shrink-0"
      >
        {/* Title block */}
        <div className="min-w-0">
          <h2
            className="font-bold text-white leading-none tracking-tight truncate"
            style={{ fontSize: 15 }}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-white/30 mt-1 leading-none" style={{ fontSize: 11 }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Live dot + current date */}
        <div className="flex items-center gap-1.5 pl-3 border-l border-white/8 shrink-0">
          <div className="pulse-dot" />
          <span className="text-white/25" style={{ fontSize: 10 }}>Live</span>
          {dateStr && (
            <span className="hidden md:inline text-white/20 ml-2" style={{ fontSize: 10 }}>
              {dateStr}
            </span>
          )}
        </div>
      </motion.div>

      {/* ── Center: Filters ── */}
      <div className="flex-1 flex items-center justify-center gap-2">
        {dataSources.length > 1 ? (
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-2.5 top-2.5 w-3.5 h-3.5 text-cyan-300/80" />
            <select
              value={activeDataSourceId}
              onChange={(e) => onDataSourceChange?.(e.target.value)}
              className="appearance-none rounded-lg border border-cyan-400/25 bg-[#0d162b] pl-8 pr-8 py-2 text-[11px] text-cyan-100 max-w-[240px]"
              title="Dashboard data source"
            >
              {dataSources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 w-3.5 h-3.5 text-cyan-200/70" />
          </div>
        ) : null}

        <FilterControls
          filters={filters}
          onChange={onFiltersChange}
          allowedTimeRanges={allowedTimeRanges}
          lockControls={lockControls}
          departmentOptionsOverride={departmentOptionsOverride}
          deviceOptionsOverride={deviceOptionsOverride}
        />

        {billRanges.length > 0 ? (
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-2.5 top-2.5 w-3.5 h-3.5 text-blue-300/80" />
            <select
              value={selectedBillRangeId}
              onChange={(e) => {
                const selectedId = e.target.value
                setSelectedBillRangeId(selectedId)
                const found = billRanges.find((r) => r.id === selectedId)
                if (found) {
                  applyBillRange(found)
                }
              }}
              className="appearance-none rounded-lg border border-blue-400/25 bg-[#0d162b] pl-8 pr-8 py-2 text-[11px] text-blue-100 max-w-[260px]"
              title="Bill date range"
            >
              {billRanges.map((range) => (
                <option key={range.id} value={range.id}>
                  {range.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 w-3.5 h-3.5 text-blue-200/70" />
          </div>
        ) : null}
      </div>

      {/* ── Right: Actions ── */}
      <div className="flex items-center gap-1.5 shrink-0">

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => setNotifOpen((v) => !v)}
            className="relative w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: notifOpen ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.04)",
              border: notifOpen ? "1px solid rgba(59,130,246,0.35)" : "1px solid rgba(255,255,255,0.07)",
              color: notifOpen ? "rgba(147,197,253,1)" : "rgba(255,255,255,0.3)",
            }}
          >
            <Bell className="w-3.5 h-3.5" />
            {notifBadgeCount > 0 && (
              <>
                <span
                  className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500"
                  style={{ boxShadow: "0 0 6px rgba(59,130,246,0.9)" }}
                />
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center"
                  style={{ fontSize: 8 }}
                >
                  {notifBadgeCount}
                </span>
              </>
            )}
          </motion.button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                className="absolute right-0 mt-2 w-80 rounded-2xl border border-white/10 overflow-hidden"
                style={{
                  background: "rgba(8,14,28,0.97)",
                  backdropFilter: "blur(32px)",
                  boxShadow: "0 24px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(59,130,246,0.08)",
                  zIndex: 60,
                }}
              >
                {/* Panel header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[13px] font-semibold text-white">Notifications</span>
                  </div>
                  <button
                    onClick={() => setNotifOpen(false)}
                    className="p-1 rounded-lg hover:bg-white/8 transition-colors text-white/35 hover:text-white/70"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/[0.06]">
                  {(["alerts", "updates", "mentions"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setNotifTab(tab)}
                      className="flex-1 py-2 text-[11px] font-semibold capitalize transition-colors relative"
                      style={{ color: notifTab === tab ? "white" : "rgba(255,255,255,0.35)" }}
                    >
                      {tab}
                      {tab === "alerts" && NOTIFS.alerts.length > 0 && (
                        <span className="ml-1 px-1 py-0.5 rounded-full bg-blue-600 text-white" style={{ fontSize: 9 }}>
                          {NOTIFS.alerts.length}
                        </span>
                      )}
                      {notifTab === tab && (
                        <motion.div
                          layoutId="notif-tab-bar"
                          className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-blue-500"
                        />
                      )}
                    </button>
                  ))}
                </div>

                {/* Content */}
                <div className="max-h-72 overflow-y-auto py-1.5">
                  {notifTab === "alerts" && NOTIFS.alerts.map((n) => (
                    <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors">
                      <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                        n.severity === "high" ? "bg-red-500" : "bg-amber-400"
                      }`} style={{ boxShadow: n.severity === "high" ? "0 0 6px rgba(239,68,68,0.8)" : "0 0 6px rgba(251,191,36,0.8)" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-white leading-tight">{n.title}</p>
                        <p className="text-[11px] text-white/40 mt-0.5 leading-snug">{n.desc}</p>
                        <p className="text-[10px] text-white/20 mt-1.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />{n.time}
                        </p>
                      </div>
                    </div>
                  ))}

                  {notifTab === "updates" && NOTIFS.updates.map((n) => (
                    <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors">
                      <div className="mt-0.5 w-2 h-2 rounded-full shrink-0 bg-blue-400" style={{ boxShadow: "0 0 6px rgba(96,165,250,0.8)" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-white leading-tight">{n.title}</p>
                        <p className="text-[11px] text-white/40 mt-0.5 leading-snug">{n.desc}</p>
                        <p className="text-[10px] text-white/20 mt-1.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />{n.time}
                        </p>
                      </div>
                    </div>
                  ))}

                  {notifTab === "mentions" && NOTIFS.mentions.map((n) => (
                    <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors">
                      <div className="mt-0.5 w-2 h-2 rounded-full shrink-0 bg-violet-400" style={{ boxShadow: "0 0 6px rgba(167,139,250,0.8)" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-blue-300 leading-tight">{n.title}</p>
                        <p className="text-[11px] text-white/40 mt-0.5 leading-snug">{n.desc}</p>
                        <p className="text-[10px] text-white/20 mt-1.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />{n.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-white/[0.06]">
                  <button className="w-full text-center text-[11px] text-blue-400 hover:text-blue-300 transition-colors font-medium">
                    View all notifications
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-white/8 mx-0.5" />

        {/* Avatar + name */}
        <div ref={menuRef} className="relative">
          <motion.button
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl hover:bg-white/5 transition-all"
            style={{ border: "1px solid transparent" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "transparent")
            }
            onClick={() => setMenuOpen((v) => !v)}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold shrink-0"
              style={{
                background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
                fontSize: 11,
                boxShadow: "0 0 12px rgba(59,130,246,0.35)",
              }}
            >
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-white font-semibold leading-none" style={{ fontSize: 12 }}>
                {userName ?? "User"}
              </p>
              <p className="text-white/30 mt-0.5 leading-none" style={{ fontSize: 10 }}>
                {role}
              </p>
            </div>
          </motion.button>

          {menuOpen && (
            <div
              className="absolute right-0 mt-2 w-52 rounded-xl border border-white/10 bg-[#0b1324]/95 backdrop-blur-xl p-1.5"
              style={{ boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}
            >
              <button
                onClick={() => {
                  setMenuOpen(false)
                  router.push("/profile")
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-white/80 hover:bg-white/8 transition-colors"
              >
                Profile
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false)
                  router.push("/change-password")
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-white/80 hover:bg-white/8 transition-colors"
              >
                Change Password
              </button>
              <div className="h-px bg-white/10 my-1" />
              <button
                onClick={() => {
                  setMenuOpen(false)
                  void onLogout()
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-300 hover:bg-red-400/10 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}