"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useAuth } from "@/components/auth/auth-provider"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login")
    }
  }, [loading, user, router])

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#070707] text-white grid place-items-center">
        <motion.div
          initial={{ opacity: 0.2, scale: 0.95 }}
          animate={{ opacity: [0.25, 1, 0.25], scale: [0.98, 1.02, 0.98] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="w-20 h-20 rounded-2xl border border-blue-400/30 bg-blue-500/10 shadow-[0_0_35px_rgba(59,130,246,0.35)]"
        />
      </div>
    )
  }

  return <>{children}</>
}
