"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/components/auth/auth-provider"
import { getAuthToken, updateProfile } from "@/lib/auth"

function ProfileContent() {
  const router = useRouter()
  const { user, refreshUser } = useAuth()

  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setUsername(user.username)
    setEmail(user.email)
  }, [user])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    setError(null)

    try {
      const token = getAuthToken()
      await updateProfile({ username, email }, token)
      await refreshUser()
      setMessage("Profile updated successfully.")
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "Could not update profile"
      setError(String(detail))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#06080f] text-white px-6 py-10">
      <div className="max-w-xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
          <p className="text-white/40 mt-2 text-sm">Manage your account identity details.</p>
        </motion.div>

        <motion.form
          onSubmit={onSubmit}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="mt-8 rounded-2xl border border-white/10 bg-[#0b1324]/80 backdrop-blur-xl p-6 space-y-4"
        >
          <label className="block">
            <span className="text-xs text-white/45">Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1.5 w-full h-11 rounded-xl border border-white/10 bg-white/[0.03] px-3 outline-none"
              required
            />
          </label>

          <label className="block">
            <span className="text-xs text-white/45">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full h-11 rounded-xl border border-white/10 bg-white/[0.03] px-3 outline-none"
              required
            />
          </label>

          {message && <p className="text-sm text-emerald-300">{message}</p>}
          {error && <p className="text-sm text-red-300">{error}</p>}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-4 rounded-xl bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 text-black font-medium disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="h-10 px-4 rounded-xl border border-white/12 text-white/80 hover:bg-white/5"
            >
              Back to Dashboard
            </button>
          </div>
        </motion.form>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  )
}
