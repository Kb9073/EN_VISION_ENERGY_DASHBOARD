"use client"

import { motion } from "framer-motion"
import {
  TrendingDown,
  AlertCircle,
  Zap,
  Leaf,
  Gauge,
  Clock,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarItem {
  id: string
  label: string
  icon: React.ReactNode
  value: string | number
  unit?: string
  trend?: number
  color?: string
  onClick?: () => void
}

interface TabSidebarProps {
  title: string
  description?: string
  items: SidebarItem[]
  selectedId?: string
  onSelectItem?: (id: string) => void
}

export function TabSidebar({
  title,
  description,
  items,
  selectedId,
  onSelectItem,
}: TabSidebarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full lg:w-80 glass-card p-6 rounded-lg border border-border h-fit sticky top-6"
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSelectItem?.(item.id)}
            className={cn(
              "w-full p-4 rounded-lg border transition-all group cursor-pointer",
              selectedId === item.id
                ? "bg-primary/10 border-primary/30"
                : "bg-secondary/40 border-border hover:bg-secondary/60"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <div
                  className={cn(
                    "p-2 rounded-lg flex-shrink-0",
                    item.color ? item.color : "bg-primary/10"
                  )}
                >
                  {item.icon}
                </div>

                <div className="text-left flex-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {item.label}
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <p className="text-xl font-bold text-foreground">
                      {item.value}
                    </p>
                    {item.unit && (
                      <span className="text-xs text-muted-foreground">
                        {item.unit}
                      </span>
                    )}
                  </div>

                  {item.trend !== undefined && (
                    <div
                      className={cn(
                        "text-xs font-medium mt-2 flex items-center gap-1",
                        item.trend > 0
                          ? "text-chart-4"
                          : "text-green-500"
                      )}
                    >
                      <TrendingDown
                        className={cn(
                          "w-3 h-3",
                          item.trend > 0 && "rotate-180"
                        )}
                      />
                      {Math.abs(item.trend)}% vs last period
                    </div>
                  )}
                </div>
              </div>

              {selectedId === item.id && (
                <ChevronRight className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              )}
            </div>
          </motion.button>
        ))}
      </div>

      {/* Quick Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 p-4 rounded-lg bg-gradient-to-br from-primary/10 to-transparent border border-primary/20"
      >
        <p className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" />
          Quick Insights
        </p>
        <ul className="space-y-2 text-xs text-foreground/80">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Real-time data sync enabled
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            All systems operational
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-chart-1" />
            {items.length} metrics tracked
          </li>
        </ul>
      </motion.div>
    </motion.div>
  )
}
