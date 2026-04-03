"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { AuthUser, LoginPayload, UserRole } from "@/types/auth"
import {
  clearAuthToken,
  fetchMe,
  getAuthToken,
  login as apiLogin,
  logout as apiLogout,
  markActivationPending,
  setAuthToken,
} from "@/lib/auth"

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (payload: LoginPayload) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  hasRole: (roles: UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    const token = getAuthToken()
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }

    try {
      const me = await fetchMe(token)
      setUser(me)
    } catch {
      clearAuthToken()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = useCallback(async (payload: LoginPayload) => {
    const result = await apiLogin(payload)
    setAuthToken(result.access_token, payload.remember_me, result.expires_in)
    markActivationPending()
    setUser(result.user)
  }, [])

  const logout = useCallback(async () => {
    const token = getAuthToken()
    await apiLogout(token)
    clearAuthToken()
    setUser(null)
  }, [])

  const hasRole = useCallback(
    (roles: UserRole[]) => {
      if (!user) return false
      return roles.includes(user.role)
    },
    [user]
  )

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, logout, refreshUser, hasRole }),
    [user, loading, login, logout, refreshUser, hasRole]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
