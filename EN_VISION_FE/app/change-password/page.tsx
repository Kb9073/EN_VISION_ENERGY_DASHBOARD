"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { changePassword, getAuthToken } from "@/lib/auth"

function ChangePasswordContent() {
  const router = useRouter()

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setError(null)

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match")
      return
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters")
      return
    }

    setSaving(true)

    try {
      const token = getAuthToken()
      await changePassword(
        {
          current_password: currentPassword,
          new_password: newPassword,
        },
        token
      )
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setMessage("Password changed successfully.")
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "Could not change password"
      setError(String(detail))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#06080f] text-white px-6 py-10">
      <div className="max-w-xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-semibold tracking-tight">Change Password</h1>
          <p className="text-white/40 mt-2 text-sm">Update your credentials securely.</p>
        </motion.div>

        <motion.form
          onSubmit={onSubmit}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="mt-8 rounded-2xl border border-white/10 bg-[#0b1324]/80 backdrop-blur-xl p-6 space-y-4"
        >
          <label className="block">
            <span className="text-xs text-white/45">Current Password</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1.5 w-full h-11 rounded-xl border border-white/10 bg-white/[0.03] px-3 outline-none"
              required
            />
          </label>

          <label className="block">
            <span className="text-xs text-white/45">New Password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1.5 w-full h-11 rounded-xl border border-white/10 bg-white/[0.03] px-3 outline-none"
              required
            />
          </label>

          <label className="block">
            <span className="text-xs text-white/45">Confirm New Password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
              {saving ? "Updating..." : "Change Password"}
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

export default function ChangePasswordPage() {
  return (
    <ProtectedRoute>
      <ChangePasswordContent />
    </ProtectedRoute>
  )
}
