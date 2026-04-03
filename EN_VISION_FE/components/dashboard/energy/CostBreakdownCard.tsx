"use client"

import { motion } from "framer-motion"

export interface CostBreakdownItem {
  source: string
  value:  number   // in INR
  color:  string
}

interface CostBreakdownCardProps {
  items:    CostBreakdownItem[]
  loading?: boolean
}

export function CostBreakdownCard({ items, loading }: CostBreakdownCardProps) {
  return (
    <div className="premium-card h-full p-4 flex flex-col gap-3">
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 rounded-lg shimmer" />
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <p className="text-[11px] text-white/25 text-center mt-4">
          No breakdown available
        </p>
      )}

      {!loading && items.map((item, i) => (
        <motion.div
          key={item.source}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          className="flex items-center gap-3"
        >
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{
              backgroundColor: item.color,
              boxShadow: `0 0 6px ${item.color}80`,
            }}
          />
          <span className="text-[12px] text-white/60 flex-1 capitalize">
            {item.source}
          </span>
          <span className="text-[13px] font-bold text-white font-mono">
            ₹{item.value.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </motion.div>
      ))}
    </div>
  )
}
