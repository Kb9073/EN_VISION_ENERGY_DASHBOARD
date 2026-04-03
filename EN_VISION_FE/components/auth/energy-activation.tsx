"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface EnergyActivationProps {
  onComplete: () => void
}

// 5 seconds to fully charge, ~3 seconds to drain completely
const CHARGE_RATE = 100 / 5
const DRAIN_RATE = 100 / 3

// Stable particle definitions (generated once, not in render)
const PARTICLES = [
  { id: 0, x: 22, duration: 1.0, delay: 0.0, size: 2.0 },
  { id: 1, x: 35, duration: 1.3, delay: 0.2, size: 2.5 },
  { id: 2, x: 50, duration: 0.9, delay: 0.4, size: 1.5 },
  { id: 3, x: 63, duration: 1.2, delay: 0.1, size: 2.0 },
  { id: 4, x: 76, duration: 1.1, delay: 0.3, size: 2.5 },
  { id: 5, x: 28, duration: 1.4, delay: 0.6, size: 1.5 },
  { id: 6, x: 42, duration: 1.0, delay: 0.8, size: 2.0 },
  { id: 7, x: 57, duration: 0.85, delay: 0.5, size: 2.5 },
  { id: 8, x: 70, duration: 1.3, delay: 0.7, size: 1.5 },
  { id: 9, x: 18, duration: 1.1, delay: 0.9, size: 2.0 },
]

// Circumference of the progress ring (r=142)
const RING_R = 142
const RING_C = 2 * Math.PI * RING_R

export function EnergyActivation({ onComplete }: EnergyActivationProps) {
  const [chargeProgress, setChargeProgress] = useState(0)
  const [isCharging, setIsCharging] = useState(false)
  const [isFullyCharged, setIsFullyCharged] = useState(false)
  const [isFlashing, setIsFlashing] = useState(false)

  // Refs for RAF loop — avoid stale closures
  const progressRef = useRef(0)
  const chargingRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number | null>(null)

  const tick = useCallback(
    (time: number) => {
      // First frame: just record time and schedule next
      if (lastTimeRef.current === null) {
        lastTimeRef.current = time
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const delta = (time - lastTimeRef.current) / 1000
      lastTimeRef.current = time

      if (chargingRef.current) {
        progressRef.current = Math.min(100, progressRef.current + CHARGE_RATE * delta)
      } else {
        progressRef.current = Math.max(0, progressRef.current - DRAIN_RATE * delta)
      }

      setChargeProgress(progressRef.current)

      // Fully charged: stop RAF, set state
      if (progressRef.current >= 100) {
        progressRef.current = 100
        setIsFullyCharged(true)
        rafRef.current = null
        return
      }

      // Fully drained: stop RAF
      if (!chargingRef.current && progressRef.current <= 0) {
        rafRef.current = null
        return
      }

      rafRef.current = requestAnimationFrame(tick)
    },
    [] // stable — only uses refs
  )

  const startCharging = useCallback(() => {
    if (isFullyCharged || chargingRef.current) return
    chargingRef.current = true
    setIsCharging(true)
    // Start RAF loop if not already running
    if (!rafRef.current) {
      lastTimeRef.current = null
      rafRef.current = requestAnimationFrame(tick)
    }
  }, [isFullyCharged, tick])

  const stopCharging = useCallback(() => {
    if (!chargingRef.current) return
    chargingRef.current = false
    setIsCharging(false)
    // Reset lastTime so drain doesn't get a stale large delta
    lastTimeRef.current = null
    // Keep RAF running for drain animation; restart if it stopped (e.g. was at 0)
    if (!rafRef.current && progressRef.current > 0) {
      rafRef.current = requestAnimationFrame(tick)
    }
  }, [tick])

  // Global pointer-up/touch-end so releasing outside the button also stops charging
  useEffect(() => {
    window.addEventListener("mouseup", stopCharging)
    window.addEventListener("touchend", stopCharging)
    return () => {
      window.removeEventListener("mouseup", stopCharging)
      window.removeEventListener("touchend", stopCharging)
    }
  }, [stopCharging])

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const handleBoltClick = useCallback(() => {
    if (!isFullyCharged || isFlashing) return
    setIsFlashing(true)
    setTimeout(onComplete, 650)
  }, [isFullyCharged, isFlashing, onComplete])

  // ─── Derived display values ────────────────────────────────────────────────
  const g = chargeProgress / 100 // 0 → 1

  // SVG bolt spans y=2 to y=22 in a 24×24 viewBox.
  // Fill from bottom: clip rect top moves from y=22 (nothing) → y=2 (full).
  const fillClipY = 22 - 20 * g

  // Spark dot position on ring arc
  const sparkAngle = -Math.PI / 2 + g * 2 * Math.PI
  const sparkCx = 162 + RING_R * Math.cos(sparkAngle)
  const sparkCy = 162 + RING_R * Math.sin(sparkAngle)

  // How many particles to show (scale with charge)
  const particleCount = Math.max(2, Math.floor(g * PARTICLES.length + 2))

  // Pulse ring speed — updates every 5% so rings get progressively faster
  const waveSpeedKey = Math.floor(chargeProgress / 5)
  // Duration drops from 3.4s (at 1%) → 0.28s (at 100%)
  const waveDuration = Math.max(0.28, 3.4 - g * 3.12)
  // Gap between the 3 staggered rings
  const waveGap = waveDuration / 3.2
  // Ring opacity builds with charge
  const waveOpacity = Math.min(0.65, 0.1 + g * 0.55)
  // Rings expand further at higher charge
  const waveMaxScale = 3.0 + g * 2.2

  return (
    <>
      {/* ── Energy flash overlay – shown on bolt click ── */}
      <AnimatePresence>
        {isFlashing && (
          <motion.div
            key="ev-flash"
            className="fixed inset-0 z-[9999] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.7, 0] }}
            transition={{ duration: 0.65, ease: "easeInOut" }}
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(186,230,253,0.95) 0%, rgba(59,130,246,0.7) 40%, rgba(7,8,15,0.9) 100%)",
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Main activation screen ── */}
      <motion.div
        className="min-h-screen relative overflow-hidden bg-[#06080f] text-white flex flex-col items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Slow-moving background gradient */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            background: [
              "radial-gradient(900px circle at 25% 15%, rgba(59,130,246,0.1), transparent 55%), radial-gradient(700px circle at 75% 85%, rgba(56,189,248,0.07), transparent 50%)",
              "radial-gradient(900px circle at 75% 15%, rgba(59,130,246,0.14), transparent 55%), radial-gradient(700px circle at 25% 85%, rgba(56,189,248,0.09), transparent 50%)",
            ],
          }}
          transition={{ duration: 5, repeat: Infinity, repeatType: "reverse" }}
        />

        {/* Charge-reactive center glow — expands and intensifies while pressing */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(${
              isCharging ? Math.round(600 + g * 300) : 600
            }px circle at 50% 54%, rgba(59,130,246,${Math.min(0.78, g * 0.42 + (isCharging ? 0.22 : 0)).toFixed(3)}), transparent 60%)`,
            transition: isCharging ? "none" : "background 0.6s ease",
          }}
        />

        {/* Pulse rings — start at 1%, accelerate continuously to 100% */}
        <AnimatePresence>
          {chargeProgress > 1 &&
            [0, 1, 2].map((i) => (
              <motion.div
                // Key includes speed bucket → remounts with new (faster) duration every 5%
                key={`pulse-${i}-${waveSpeedKey}`}
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: 270,
                  height: 270,
                  top: "calc(50% - 135px)",
                  left: "calc(50% - 135px)",
                  border: `1px solid rgba(${isFullyCharged ? "147,197,253" : "59,130,246"},${(0.15 + g * 0.55).toFixed(3)})`,
                }}
                initial={{ scale: 1, opacity: waveOpacity }}
                animate={{ scale: waveMaxScale + i * 0.25, opacity: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.3 } }}
                transition={{
                  duration: waveDuration,
                  delay: i * waveGap,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
            ))}
        </AnimatePresence>

        {/* ── Content column ── */}
        <div className="relative z-10 flex flex-col items-center select-none" style={{ userSelect: "none" }}>
          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: -22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl tracking-widest font-semibold mb-2"
            style={{ fontFamily: "var(--font-orbitron)" }}
          >
            EN-VISION
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.38 }}
            transition={{ delay: 0.35 }}
            className="text-sm text-white/40 mb-20 tracking-wide"
          >
            Hold the bolt to initiate energy sequence
          </motion.p>

          {/* ── Bolt + ring container ── */}
          <div className="relative flex items-center justify-center" style={{ width: 352, height: 352 }}>
            {/* Radial glow bloom – intensifies while pressing */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 108 + g * 350 + (isCharging ? 80 : 0),
                height: 108 + g * 350 + (isCharging ? 80 : 0),
                background: `radial-gradient(closest-side, rgba(59,130,246,${Math.min(0.82, 0.07 + g * 0.36 + (isCharging ? 0.28 : 0)).toFixed(3)}), transparent)`,
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                transition: isCharging ? "none" : "width 0.5s ease, height 0.5s ease",
              }}
            />

            {/* ── Progress ring SVG ── */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 324 324"
            >
              {/* Track ring */}
              <circle cx="162" cy="162" r={RING_R} fill="none" stroke="rgba(59,130,246,0.07)" strokeWidth="2" />

              {/* Progress arc */}
              <circle
                cx="162"
                cy="162"
                r={RING_R}
                fill="none"
                stroke={
                  isFullyCharged
                    ? "rgba(147,197,253,0.95)"
                    : `rgba(59,130,246,${(0.35 + g * 0.55).toFixed(3)})`
                }
                strokeWidth={isFullyCharged ? 3 : 2}
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - g)}
                strokeLinecap="round"
                transform="rotate(-90 162 162)"
              />

              {/* Spark dot at arc head */}
              {chargeProgress > 1 && chargeProgress < 99.5 && (
                <circle
                  cx={sparkCx}
                  cy={sparkCy}
                  r={isCharging ? 4 : 2.5}
                  fill="white"
                  opacity={isCharging ? 0.9 : 0.45}
                />
              )}

              {/* Full-charge ring sparkle flash */}
              {isFullyCharged && (
                <motion.circle
                  cx="162"
                  cy="162"
                  r={RING_R}
                  fill="none"
                  stroke="rgba(255,255,255,0.6)"
                  strokeWidth="1"
                  initial={{ opacity: 0, strokeDasharray: "10 20" }}
                  animate={{ opacity: [0, 0.8, 0], rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  style={{ transformOrigin: "162px 162px" }}
                />
              )}
            </svg>

            {/* ── Floating particles (outside button, inside container) ── */}
            <AnimatePresence>
              {isCharging &&
                PARTICLES.slice(0, particleCount).map((p) => (
                  <motion.div
                    key={`particle-${p.id}`}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: p.size,
                      height: p.size,
                      left: `${p.x}%`,
                      bottom: "44%",
                      background: `rgba(${147 + p.id * 3},${197 - p.id},253,0.85)`,
                    }}
                    initial={{ opacity: 0, y: 0 }}
                    animate={{ opacity: [0, 0.95, 0], y: -(55 + p.size * 14) }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: p.duration,
                      delay: p.delay,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                  />
                ))}
            </AnimatePresence>

            {/* ── Bolt button ── */}
            <motion.button
              onMouseDown={startCharging}
              onTouchStart={(e) => {
                e.preventDefault()
                startCharging()
              }}
              onClick={handleBoltClick}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              animate={{
                // Vibration: subtle x-shake while charging
                x: isCharging ? [0, -2, 2, -1.5, 1.5, -0.5, 0.5, 0] : 0,
                // Pulse when fully charged
                scale: isFullyCharged ? [1, 1.05, 1] : 1,
              }}
              transition={{
                x: { duration: 0.22, repeat: isCharging ? Infinity : 0, ease: "linear" },
                scale: { duration: 0.9, repeat: isFullyCharged ? Infinity : 0, repeatType: "reverse" },
              }}
              className="relative flex items-center justify-center rounded-3xl overflow-hidden focus-visible:outline-none"
              style={{
                width: 165,
                height: 211,
                background: "#0c1428",
                border: `1.5px solid rgba(59,130,246,${(0.18 + g * 0.72).toFixed(3)})`,
                boxShadow: isFullyCharged
                  ? "0 0 50px rgba(96,165,250,0.9), 0 0 96px rgba(59,130,246,0.55), 0 0 170px rgba(37,99,235,0.28)"
                  : `0 0 ${19 + g * 78}px rgba(59,130,246,${(0.1 + g * 0.58).toFixed(3)})`,
                cursor: isFullyCharged ? "pointer" : "default",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {/* ── Energy fill (bottom to top) ── */}
              <div
                className="absolute inset-x-0 bottom-0"
                style={{
                  height: `${chargeProgress}%`,
                  background: isFullyCharged
                    ? "linear-gradient(0deg, rgba(29,78,216,1) 0%, rgba(96,165,250,0.95) 55%, rgba(186,230,253,0.9) 100%)"
                    : `linear-gradient(0deg, rgba(29,78,216,0.95) 0%, rgba(59,130,246,${(0.7 + g * 0.25).toFixed(3)}) 55%, rgba(125,211,252,${(0.25 + g * 0.55).toFixed(3)}) 100%)`,
                }}
              />

              {/* Shimmer wave at fill boundary */}
              <AnimatePresence>
                {isCharging && chargeProgress > 3 && (
                  <motion.div
                    key="shimmer"
                    className="absolute inset-x-0 pointer-events-none"
                    style={{
                      height: 22,
                      bottom: `${Math.max(0, chargeProgress - 1)}%`,
                      background: "linear-gradient(0deg, transparent, rgba(147,197,253,0.65), transparent)",
                    }}
                    animate={{ opacity: [0.35, 1, 0.35] }}
                    transition={{ duration: 0.45, repeat: Infinity }}
                  />
                )}
              </AnimatePresence>

              {/* ── Bolt SVG with two-layer fill trick ── */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <svg viewBox="0 0 24 24" width="89" height="111">
                  <defs>
                    {/* clip for filled (lower) portion – moves up as charge increases */}
                    <clipPath id="ev-fill-clip">
                      <rect x="0" y={fillClipY} width="24" height="24" />
                    </clipPath>
                    {/* clip for dim (upper) portion */}
                    <clipPath id="ev-dim-clip">
                      <rect x="0" y="0" width="24" height={fillClipY} />
                    </clipPath>
                  </defs>

                  {/* Dim unfilled top portion */}
                  <path
                    d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"
                    clipPath="url(#ev-dim-clip)"
                    fill={`rgba(255,255,255,${(0.22 - g * 0.12).toFixed(3)})`}
                  />

                  {/* Bright filled bottom portion */}
                  <path
                    d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"
                    clipPath="url(#ev-fill-clip)"
                    fill={isFullyCharged ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.93)"}
                  />
                </svg>
              </div>

              {/* Inner radial flash for full-charge state */}
              <AnimatePresence>
                {isFullyCharged && (
                  <motion.div
                    key="inner-flash"
                    className="absolute inset-0 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.4, 0] }}
                    transition={{ duration: 0.75, repeat: Infinity, repeatDelay: 1.1 }}
                    style={{
                      background:
                        "radial-gradient(ellipse at center, rgba(255,255,255,0.55) 0%, transparent 70%)",
                    }}
                  />
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          {/* ── Status label ── */}
          <div className="mt-12 h-7 flex items-center justify-center">
            {isFullyCharged ? (
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-blue-300 text-sm tracking-widest"
                style={{ fontFamily: "var(--font-orbitron)" }}
              >
                <motion.span animate={{ opacity: [0.55, 1, 0.55] }} transition={{ duration: 1.1, repeat: Infinity }}>
                  CHARGED · CLICK TO ENTER
                </motion.span>
              </motion.p>
            ) : isCharging ? (
              <motion.p
                animate={{ opacity: [0.55, 1, 0.55] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="text-blue-400/80 text-xs tracking-widest tabular-nums"
              >
                CHARGING {Math.round(chargeProgress)}%
              </motion.p>
            ) : (
              <p className="text-white/25 text-xs tracking-widest">
                {chargeProgress > 3 ? "HOLD TO CONTINUE" : "HOLD BOLT TO CHARGE"}
              </p>
            )}
          </div>

          {/* Thin progress bar */}
          {!isFullyCharged && (
            <div className="mt-4 w-56 h-px bg-white/8 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${chargeProgress}%`,
                  background:
                    "linear-gradient(90deg, rgba(59,130,246,0.6), rgba(147,197,253,0.9))",
                }}
              />
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}
