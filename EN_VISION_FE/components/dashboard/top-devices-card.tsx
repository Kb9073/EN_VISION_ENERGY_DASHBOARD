"use client"

import { motion } from "framer-motion"

interface Device {
  name: string
  power: number
}

interface Props {
  devices: Device[]
}

export function TopDevicesCard({ devices }: Props) {
  if (!devices || devices.length === 0) return null

  const maxPower = Math.max(...devices.map(d => d.power))

  return (
    <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/30 shadow-lg">
      <h3 className="text-sm font-semibold mb-3">
        Top 5 Devices
      </h3>

      <div className="space-y-2">
        {devices.map((device, index) => {
          const percentage =
            (device.power / maxPower) * 100

          return (
            <motion.div
              key={device.name}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex flex-col gap-1"
            >
              {/* Header Row */}
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="font-medium truncate">
                  {device.name}
                </span>
                <span className="text-slate-300 font-semibold">
                  {device.power >= 1000
                    ? `${(device.power / 1000).toFixed(2)} kW`
                    : `${device.power} W`}
                </span>
              </div>

              {/* Power Bar */}
              <div className="w-full h-2 bg-slate-700/40 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    background:
                      percentage > 75
                        ? "#EF4444"
                        : percentage > 50
                        ? "#F59E0B"
                        : "#10B981",
                  }}
                />
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}