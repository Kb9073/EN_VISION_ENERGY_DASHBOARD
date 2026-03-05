"use client"

import { Bell, Search, Command } from "lucide-react"
import { motion } from "framer-motion"
import { useState } from "react"
import {
  FilterControls,
  type FilterState,
  type CustomDateRange,
} from "./filter-controls"

interface HeaderProps {
  title: string
  subtitle?: string
  filters: FilterState
  customDateRange?: CustomDateRange
  onFiltersChange: (filters: FilterState) => void
  onCustomDateRangeChange?: (range: CustomDateRange) => void
  notificationCount?: number
}

export function Header({
  title,
  subtitle,
  filters,
  customDateRange,
  onFiltersChange,
  onCustomDateRangeChange,
  notificationCount = 3,
}: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <header
      className="shrink-0 flex items-center justify-between px-7 gap-6"
      style={{
        height: 64,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
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

        {/* Live dot */}
        <div className="flex items-center gap-1.5 pl-3 border-l border-white/8 shrink-0">
          <div className="pulse-dot" />
          <span className="text-white/25" style={{ fontSize: 10 }}>Live</span>
        </div>
      </motion.div>

      {/* ── Center: Filters ── */}
      <div className="flex-1 flex items-center justify-center">
        <FilterControls
          filters={filters}
          onChange={onFiltersChange}
          customDateRange={customDateRange}
          onCustomDateRangeChange={onCustomDateRangeChange}
        />
      </div>

      {/* ── Right: Actions ── */}
      <div className="flex items-center gap-1.5 shrink-0">

        {/* Search pill */}
        <motion.button
          onClick={() => setSearchOpen((v) => !v)}
          className="flex items-center gap-2 px-3 h-8 rounded-xl text-white/30 hover:text-white/60 transition-all"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            fontSize: 11,
          }}
          whileTap={{ scale: 0.96 }}
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Search</span>
          <div
            className="hidden sm:flex items-center gap-0.5 ml-1 px-1.5 py-0.5 rounded-md"
            style={{ background: "rgba(255,255,255,0.06)", fontSize: 10 }}
          >
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </div>
        </motion.button>

        {/* Notifications */}
        <motion.button
          whileTap={{ scale: 0.94 }}
          className="relative w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white/65 transition-all"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <Bell className="w-3.5 h-3.5" />
          {notificationCount > 0 && (
            <>
              <span
                className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500"
                style={{ boxShadow: "0 0 6px rgba(59,130,246,0.9)" }}
              />
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center"
                style={{ fontSize: 8 }}
              >
                {notificationCount}
              </span>
            </>
          )}
        </motion.button>

        {/* Divider */}
        <div className="h-5 w-px bg-white/8 mx-0.5" />

        {/* Avatar + name */}
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
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold shrink-0"
            style={{
              background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
              fontSize: 11,
              boxShadow: "0 0 12px rgba(59,130,246,0.35)",
            }}
          >
            JD
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-white font-semibold leading-none" style={{ fontSize: 12 }}>
              John Doe
            </p>
            <p className="text-white/30 mt-0.5 leading-none" style={{ fontSize: 10 }}>
              Admin
            </p>
          </div>
        </motion.button>
      </div>
    </header>
  )
}