"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Calendar, Building2, Cpu, Check, Clock, CalendarDays, BarChart3, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDepartments, useDevices } from "@/hooks/use-dashboard-data"

/* =============================================================================
   TYPES
============================================================================= */

export type TimeRange = "24h" | "7d" | "30d" | "90d" | "custom"

export interface CustomDateRange {
  start: string
  end: string
}

export interface FilterState {
  timeRange: TimeRange
  department_id: number | null
  device_id: number | null
  start_date?: string
  end_date?: string
}

interface FilterControlsProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
  allowedTimeRanges?: TimeRange[]
  lockControls?: boolean
  departmentOptionsOverride?: { id: number; name: string }[]
  deviceOptionsOverride?: { id: number; name: string }[]
}

/* =============================================================================
   TIME RANGE PILL GROUP
============================================================================= */

const TIME_OPTIONS: { label: string; value: TimeRange; icon: React.ElementType }[] = [
  { label: "24H",    value: "24h",    icon: Clock        },
  { label: "7D",     value: "7d",     icon: CalendarDays },
  { label: "30D",    value: "30d",    icon: BarChart3    },
  { label: "90D",    value: "90d",    icon: TrendingUp   },
  { label: "Custom", value: "custom", icon: Calendar     },
]

function TimeRangePills({
  value,
  onChange,
  options,
  disabled,
}: {
  value: TimeRange
  onChange: (v: TimeRange) => void
  options: { label: string; value: TimeRange; icon: React.ElementType }[]
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-4 bg-[#0B0F19] border border-white/10 rounded-xl px-3 py-2">
      {options.map((opt) => {
        const active = value === opt.value
        const Icon = opt.icon
        return (
          <motion.button
            key={opt.value}
            onClick={() => !disabled && onChange(opt.value)}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "relative flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 select-none",
              active
                ? "text-blue-400"
                : "text-gray-400 hover:text-white hover:bg-white/5",
              disabled && "opacity-55 cursor-not-allowed"
            )}
          >
            {active && (
              <motion.div
                layoutId="time-pill"
                className="absolute inset-0 rounded-lg border border-blue-500/30"
                style={{
                  background: "rgba(59,130,246,0.2)",
                  boxShadow: "0 0 10px rgba(59,130,246,0.2)",
                }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Icon
              className="relative z-10 shrink-0"
              style={{ width: 14, height: 14, opacity: 0.7 }}
            />
            <span className="relative z-10">{opt.label}</span>
          </motion.button>
        )
      })}
    </div>
  )
}

/* =============================================================================
   DROPDOWN
============================================================================= */

function FilterDropdown({
  icon: Icon,
  label,
  options,
  value,
  onChange,
  loading,
  disabled,
}: {
  icon: React.ElementType
  label: string
  options: { id: number; name: string }[]
  value: number | null
  onChange: (id: number | null) => void
  loading?: boolean
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.id === value)
  const displayLabel = selected?.name ?? label

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <motion.button
        onClick={() => !disabled && setOpen((v) => !v)}
        whileTap={{ scale: 0.97 }}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
          "transition-all duration-200 select-none",
          "bg-[#0B0F19] border border-white/10 text-gray-300",
          open
            ? "border-blue-500/40 bg-[#0E1424] text-white"
            : "hover:border-blue-500/40 hover:bg-[#0E1424] hover:text-white",
          disabled && "opacity-40 cursor-not-allowed"
        )}
      >
        <Icon className="w-3.5 h-3.5 shrink-0 text-white/40" />
        <span className="max-w-[120px] truncate">{displayLabel}</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-white/70 transition-transform duration-200 shrink-0",
            open && "rotate-180"
          )}
        />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50 min-w-[180px] rounded-2xl overflow-hidden"
            style={{
              background: "#0d0d0d",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)",
            }}
          >
            <div className="p-1.5">
              {/* All option */}
              <button
                onClick={() => { onChange(null); setOpen(false) }}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs",
                  "transition-colors duration-100",
                  value === null
                    ? "bg-blue-500/15 text-blue-300"
                    : "text-white/50 hover:bg-white/5 hover:text-white/80"
                )}
              >
                <span>All {label}s</span>
                {value === null && <Check className="w-3 h-3" />}
              </button>

              {loading && (
                <div className="px-3 py-2 text-xs text-white/20">Loading…</div>
              )}

              {!loading && options.length === 0 && (
                <div className="px-3 py-2 text-xs text-white/20">No options</div>
              )}

              {/* Divider */}
              {options.length > 0 && (
                <div className="h-px bg-white/5 mx-2 my-1" />
              )}

              {options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => { onChange(opt.id); setOpen(false) }}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs",
                    "transition-colors duration-100",
                    value === opt.id
                      ? "bg-blue-500/15 text-blue-300"
                      : "text-white/55 hover:bg-white/5 hover:text-white/80"
                  )}
                >
                  <span className="truncate">{opt.name}</span>
                  {value === opt.id && <Check className="w-3 h-3 shrink-0" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* =============================================================================
   CUSTOM DATE PICKER
============================================================================= */

function CustomDatePicker({
  value,
  onChange,
}: {
  value?: CustomDateRange
  onChange?: (r: CustomDateRange) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [start, setStart] = useState(value?.start ?? "")
  const [end,   setEnd]   = useState(value?.end   ?? "")

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  function apply() {
    if (start && end && onChange) {
      onChange({ start, end })
      setOpen(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.97 }}
        className="flex items-center gap-2 pl-3 pr-2.5 h-9 rounded-xl text-xs font-medium text-white/55 hover:text-white/80 transition-all"
        style={{
          background: open ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.04)",
          border: open ? "1px solid rgba(59,130,246,0.4)" : "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Calendar className="w-3.5 h-3.5 text-white/40" />
        <span>
          {value?.start && value?.end
            ? `${value.start} → ${value.end}`
            : "Date Range"}
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50 rounded-2xl p-4 w-72"
            style={{
              background: "#0d0d0d",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
            }}
          >
            <p className="text-xs font-semibold text-white/50 mb-3 uppercase tracking-wider">
              Custom Range
            </p>
            <div className="space-y-2.5">
              <div>
                <label className="text-[10px] text-white/30 mb-1 block">Start Date</label>
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] text-white/30 mb-1 block">End Date</label>
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
              <button
                onClick={apply}
                disabled={!start || !end}
                className="w-full py-2 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-30"
                style={{ background: "rgba(59,130,246,0.85)" }}
              >
                Apply Range
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* =============================================================================
   MAIN FILTER CONTROLS
============================================================================= */

export function FilterControls({
  filters,
  onChange,
  allowedTimeRanges,
  lockControls = false,
  departmentOptionsOverride,
  deviceOptionsOverride,
}: FilterControlsProps) {
  const { data: depts = [],   isLoading: deptsLoading  } = useDepartments()
  const { data: devices = [], isLoading: devicesLoading } = useDevices(filters.department_id)
  const visibleTimeOptions =
    allowedTimeRanges && allowedTimeRanges.length > 0
      ? TIME_OPTIONS.filter((opt) => allowedTimeRanges.includes(opt.value))
      : TIME_OPTIONS

  const deptOptions = departmentOptionsOverride ?? depts
  const devOptions = deviceOptionsOverride ?? devices
  const deptLoading = departmentOptionsOverride ? false : deptsLoading
  const devLoading = deviceOptionsOverride ? false : devicesLoading

  function setTimeRange(timeRange: TimeRange) {
    if (lockControls) return
    onChange({ ...filters, timeRange })
  }

  function setDepartment(department_id: number | null) {
    if (lockControls) return
    onChange({ ...filters, department_id, device_id: null })
  }

  function setDevice(device_id: number | null) {
    if (lockControls) return
    onChange({ ...filters, device_id })
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">

      {/* Time range pills */}
      <TimeRangePills
        value={filters.timeRange}
        onChange={setTimeRange}
        options={visibleTimeOptions}
        disabled={lockControls}
      />

      {/* Custom date picker — only shown when custom selected */}
      {filters.timeRange === "custom" && !lockControls && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
        >
          <CustomDatePicker
            value={
              filters.start_date && filters.end_date
                ? { start: filters.start_date, end: filters.end_date }
                : undefined
            }
            onChange={(range) =>
              onChange({ ...filters, start_date: range.start, end_date: range.end })
            }
          />
        </motion.div>
      )}

      {/* Vertical divider */}
      <div className="h-5 w-px bg-white/8" />

      {/* Department dropdown */}
      <FilterDropdown
        icon={Building2}
        label="Department"
        options={deptOptions}
        value={filters.department_id}
        onChange={setDepartment}
        loading={deptLoading}
        disabled={lockControls}
      />

      {/* Device dropdown */}
      <FilterDropdown
        icon={Cpu}
        label="Device"
        options={devOptions}
        value={filters.device_id}
        onChange={setDevice}
        loading={devLoading}
        disabled={lockControls || (filters.department_id === null && devOptions.length === 0)}
      />
    </div>
  )
}