"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Eye, EyeOff, Zap, Lock, UserRound } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login({ username, password, remember_me: rememberMe })
      router.replace("/")
    } catch {
      setError("Invalid credentials. Try admin / Admin@123 for first login.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#06080f] text-white grid place-items-center px-6">
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "radial-gradient(1200px circle at 15% 20%, rgba(59,130,246,0.2), transparent 52%), radial-gradient(1000px circle at 85% 85%, rgba(16,185,129,0.16), transparent 45%)",
            "radial-gradient(1200px circle at 80% 20%, rgba(59,130,246,0.24), transparent 55%), radial-gradient(1000px circle at 20% 85%, rgba(16,185,129,0.18), transparent 48%)",
          ],
        }}
        transition={{ duration: 4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-[#0b1324]/80 backdrop-blur-xl p-8 shadow-[0_20px_80px_rgba(0,0,0,0.55)]"
      >
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 rounded-2xl grid place-items-center bg-blue-500/15 border border-blue-400/30 shadow-[0_0_30px_rgba(59,130,246,0.35)]">
            <Zap className="w-6 h-6 text-blue-300" />
          </div>
          <h1 className="mt-4 text-3xl tracking-widest" style={{ fontFamily: "var(--font-orbitron)" }}>
            EN-VISION
          </h1>
          <p className="text-sm text-white/45 mt-2">Industrial Energy Intelligence Platform</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-xs text-white/45">Username</span>
            <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 h-11">
              <UserRound className="w-4 h-4 text-white/35" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-transparent outline-none text-sm"
                placeholder="Enter username"
                required
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs text-white/45">Password</span>
            <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 h-11">
              <Lock className="w-4 h-4 text-white/35" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent outline-none text-sm"
                placeholder="Enter password"
                required
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-white/45 hover:text-white">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>

          <div className="flex items-center justify-between text-xs">
            <label className="inline-flex items-center gap-2 text-white/55">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
              Remember Me
            </label>
            <button type="button" className="text-blue-300/80 hover:text-blue-200">Forgot Password</button>
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full h-11 rounded-xl font-medium bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 text-black shadow-[0_0_40px_rgba(56,189,248,0.35)] disabled:opacity-60"
          >
            {loading ? "Authenticating..." : "Login"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}
