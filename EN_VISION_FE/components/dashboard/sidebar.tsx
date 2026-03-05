"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
  Home, Zap, AlertTriangle, TrendingUp,
  Leaf, BarChart2, Settings, ChevronLeft, ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

/* =============================================================================
   CONFIG
============================================================================= */

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
}

/* =============================================================================
   COMPONENT
============================================================================= */

export function Sidebar({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const mainItems      = NAV_ITEMS.filter((n) => n.section === "main")
  const analyticsItems = NAV_ITEMS.filter((n) => n.section === "analytics")

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 216 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col h-screen shrink-0 overflow-hidden"
      style={{ background: "#030303", borderRight: "1px solid rgba(255,255,255,0.05)" }}
    >
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-4 py-5 mb-2">
        <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0"
          style={{ boxShadow: "0 0 16px rgba(59,130,246,0.25)" }}>
          <Zap className="w-4 h-4 text-blue-400" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="text-sm font-bold tracking-tight text-white whitespace-nowrap"
            >
              EN-VISION
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {/* Main section */}
        {!collapsed && (
          <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/20">
            Main
          </p>
        )}
        {collapsed && <div className="h-5" />}

        {mainItems.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            active={activeTab === item.id}
            collapsed={collapsed}
            onClick={() => onTabChange(item.id)}
          />
        ))}

        {/* Analytics section */}
        <div className="pt-4">
          {!collapsed && (
            <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/20">
              Analytics
            </p>
          )}
          {collapsed && (
            <div className="mx-auto w-6 h-px bg-white/8 mb-3" />
          )}

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
      </nav>

      {/* ── Bottom ── */}
      <div className="px-2 pb-4 space-y-0.5">
        <div className="h-px bg-white/5 mx-2 mb-3" />

        {/* Settings */}
        <button
          className={cn(
            "sidebar-item w-full",
            collapsed && "justify-center px-0"
          )}
        >
          <Settings className={cn("w-4 h-4 shrink-0 sidebar-icon", collapsed && "mx-auto")} />
          {!collapsed && <span>Settings</span>}
        </button>

        {/* User avatar */}
        <div
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 mt-1 rounded-xl border border-white/5",
            "bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-pointer",
            collapsed && "justify-center px-0 py-2"
          )}
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 text-xs font-bold text-white">
            JD
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">John Doe</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="pulse-dot" />
                <p className="text-[10px] text-white/35">Online</p>
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
          "bg-[#0a0a0a] border border-white/10",
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
      <Icon className={cn("w-4 h-4 shrink-0 sidebar-icon", collapsed && "mx-auto")} />

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

      {/* Active indicator dot */}
      {active && !collapsed && (
        <motion.div
          layoutId="active-dot"
          className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400"
          style={{ boxShadow: "0 0 8px rgba(96,165,250,0.8)" }}
        />
      )}
    </motion.button>
  )
}