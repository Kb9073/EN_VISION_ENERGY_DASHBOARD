"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
  Home, Zap, AlertTriangle, TrendingUp,
  Leaf, BarChart2, Settings, ChevronLeft, ChevronRight,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { UserRole } from "@/types/auth"

const NAV_ITEMS = [
  { id: "home",        label: "Home",             icon: Home,          section: "main" },
  { id: "energy",      label: "Energy Dashboard", icon: Zap,           section: "main" },
  { id: "anomalies",   label: "Anomalies",        icon: AlertTriangle, section: "main" },
  { id: "forecasting", label: "Forecasting",      icon: TrendingUp,    section: "main" },
  { id: "carbon",      label: "Carbon Analytics", icon: Leaf,          section: "analytics" },
  { id: "powerbi",     label: "BI Explorer",      icon: BarChart2,     section: "analytics" },
] as const

type TabId = typeof NAV_ITEMS[number]["id"]

interface SidebarProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  collapsed: boolean
  onToggleCollapse: () => void
  role: UserRole
  userName?: string
}

/* =============================================================================
   COMPONENT
============================================================================= */

export function Sidebar({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  role,
  userName,
}: SidebarProps) {
  const allowedByRole: Record<UserRole, TabId[]> = {
    Admin: ["home", "energy", "anomalies", "forecasting", "carbon", "powerbi"],
    User: ["home", "energy", "anomalies", "forecasting", "carbon"],
    Viewer: ["home", "energy", "anomalies"],
  }

  const visibleItems = NAV_ITEMS.filter((n) => allowedByRole[role].includes(n.id))
  const mainItems = visibleItems.filter((n) => n.section === "main")
  const analyticsItems = visibleItems.filter((n) => n.section === "analytics")

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 260 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col h-screen shrink-0 overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #09090B 0%, #060608 100%)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "2px 0 20px rgba(0,0,0,0.5)",
      }}
    >
      {/* ── Logo ── */}
      <div className={cn("flex items-center gap-3 px-5 py-6 mb-2", collapsed && "justify-center px-3")}>
        <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0"
          style={{ boxShadow: "0 0 20px rgba(59,130,246,0.3)" }}>
          <Zap style={{ width: 18, height: 18 }} className="text-blue-400" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
            >
              <p className="text-sm font-bold tracking-tight text-white whitespace-nowrap leading-tight">EN-VISION</p>
              <p className="text-[10px] text-white/30 whitespace-nowrap mt-0.5">Energy Intelligence</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 overflow-y-auto overflow-x-hidden pt-2">
        {/* Main section */}
        {!collapsed && (
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/20">
            Main
          </p>
        )}
        {collapsed && <div className="h-4" />}

        <div className="space-y-1">
          {mainItems.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              active={activeTab === item.id}
              collapsed={collapsed}
              onClick={() => onTabChange(item.id)}
            />
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-white/[0.05] mx-1 my-4" />

        {/* Analytics section */}
        <div>
          {!collapsed && (
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/20">
              Analytics
            </p>
          )}
          <div className="space-y-1">
            {analyticsItems.map((item) => (
              <NavItem
                key={item.id}
                item={item}
                active={activeTab === item.id}
                collapsed={collapsed}
                onClick={() => onTabChange(item.id)}
              />
            ))}
          </div>
        </div>
      </nav>

      {/* ── Bottom ── */}
      <div className="px-3 pb-5 space-y-1">
        <div className="h-px bg-white/[0.05] mx-0 mb-3" />

        {/* Settings label */}
        {!collapsed && (
          <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/20">
            Settings
          </p>
        )}

        {/* Settings */}
        <button
          className={cn(
            "sidebar-item w-full",
            collapsed && "justify-center px-0"
          )}
        >
          <Settings
            className={cn("shrink-0 sidebar-icon", collapsed && "mx-auto")}
            style={{ width: 18, height: 18, opacity: 0.6 }}
          />
          {!collapsed && <span>Settings</span>}
        </button>

        {/* User avatar */}
        <div
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/5",
            "bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-200 cursor-pointer",
            collapsed && "justify-center px-0 py-2"
          )}
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 text-xs font-bold text-white">
            JD
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{userName ?? "User"}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="pulse-dot" />
                <p className="text-[10px] text-white/35">{role}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Collapse Toggle ── */}
      <button
        onClick={onToggleCollapse}
        className={cn(
          "absolute -right-3 top-6 z-10",
          "w-6 h-6 rounded-full flex items-center justify-center",
          "bg-[#09090B] border border-white/10",
          "text-white/40 hover:text-white/80 hover:border-white/20",
          "transition-all duration-150 shadow-lg"
        )}
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3" />
          : <ChevronLeft  className="w-3 h-3" />
        }
      </button>
    </motion.aside>
  )
}

/* =============================================================================
   NAV ITEM
============================================================================= */

function NavItem({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: typeof NAV_ITEMS[number]
  active: boolean
  collapsed: boolean
  onClick: () => void
}) {
  const Icon = item.icon

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "sidebar-item w-full",
        active && "active",
        collapsed && "justify-center px-0 py-2.5"
      )}
      title={collapsed ? item.label : undefined}
    >
      <Icon
        className={cn("shrink-0 sidebar-icon transition-opacity duration-200", collapsed && "mx-auto")}
        style={{ width: 18, height: 18, opacity: active ? 1 : 0.6 }}
      />

      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.15 }}
            className="text-[13px] font-medium whitespace-nowrap"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Active indicator — left bar */}
      {active && (
        <motion.span
          layoutId="active-bar"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full"
          style={{
            height: "60%",
            background: "#3b82f6",
            boxShadow: "0 0 8px rgba(59,130,246,0.8)",
          }}
        />
      )}
    </motion.button>
  )
}