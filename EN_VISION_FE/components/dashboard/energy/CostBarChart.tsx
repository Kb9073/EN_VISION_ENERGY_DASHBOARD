"use client"

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from "recharts"

export interface CostDay {
  label: string
  cost:  number
}

interface CostBarChartProps {
  data:           CostDay[]
  loading?:       boolean
  selectedLabel?: string
  onSelect?:      (label: string) => void
}

function CostTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0c0c0c] border border-white/10 rounded-xl px-3 py-2.5 text-xs shadow-xl">
      <p className="text-white/40 mb-1 font-medium">{label}</p>
      <p className="text-violet-300 font-semibold">
        ₹{Number(payload[0]?.value ?? 0).toLocaleString("en-IN", {
          minimumFractionDigits: 2, maximumFractionDigits: 2,
        })}
      </p>
    </div>
  )
}

export function CostBarChart({ data, loading, selectedLabel, onSelect }: CostBarChartProps) {
  if (loading) return <div className="h-40 rounded-xl shimmer" />

  if (!data.length || !data.some((d) => d.cost > 0)) {
    return (
      <div className="h-40 flex items-center justify-center text-[12px] text-white/25">
        No cost data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart
        data={data}
        barCategoryGap="28%"
        margin={{ top: 8, right: 4, left: -26, bottom: 0 }}
      >
        <defs>
          <linearGradient id="cbNormal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#818CF8" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#4338CA" stopOpacity={0.75} />
          </linearGradient>
          <linearGradient id="cbSelected" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#A3E635" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#65A30D" stopOpacity={0.80} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="4 4"
          stroke="rgba(255,255,255,0.045)"
          vertical={false}
        />
        <XAxis
          dataKey="label"
          tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `₹${v}`}
        />
        <Tooltip content={<CostTip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar
          dataKey="cost"
          radius={[5, 5, 0, 0]}
          onClick={(d: any) => onSelect?.(d.label)}
          cursor="pointer"
        >
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.label === selectedLabel ? "url(#cbSelected)" : "url(#cbNormal)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
