import axios from "axios"
import config from "@/lib/config"
import type {
  AuthUser,
  ChangePasswordPayload,
  LoginPayload,
  LoginResult,
  StandardResponse,
  UpdateProfilePayload,
} from "@/types/auth"

const TOKEN_COOKIE = "envision_token"
const TOKEN_STORAGE_KEY = "envision_token"
const ACTIVATE_PENDING_KEY = "envision_activation_pending"
const ACTIVATE_DONE_KEY = "envision_activation_done"

const authApi = axios.create({
  baseURL: config.api.baseUrl,
  timeout: config.api.timeout,
  headers: {
    "Content-Type": "application/json",
  },
})

export function setAuthToken(token: string, rememberMe: boolean, expiresInSeconds: number) {
  if (typeof window === "undefined") return

  if (rememberMe) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
    sessionStorage.removeItem(TOKEN_STORAGE_KEY)
  } else {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token)
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }

  document.cookie = `${TOKEN_COOKIE}=${token}; path=/; max-age=${expiresInSeconds}; samesite=lax`
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem(TOKEN_STORAGE_KEY)
}

export function clearAuthToken() {
  if (typeof window === "undefined") return
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  sessionStorage.removeItem(TOKEN_STORAGE_KEY)
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; samesite=lax`
}

export function markActivationPending() {
  if (typeof window === "undefined") return
  sessionStorage.setItem(ACTIVATE_PENDING_KEY, "1")
  sessionStorage.removeItem(ACTIVATE_DONE_KEY)
}

export function shouldShowActivation(): boolean {
  if (typeof window === "undefined") return false
  return sessionStorage.getItem(ACTIVATE_PENDING_KEY) === "1" && sessionStorage.getItem(ACTIVATE_DONE_KEY) !== "1"
}

export function completeActivation() {
  if (typeof window === "undefined") return
  sessionStorage.setItem(ACTIVATE_DONE_KEY, "1")
  sessionStorage.removeItem(ACTIVATE_PENDING_KEY)
}

export async function login(payload: LoginPayload): Promise<LoginResult> {
  const res = await authApi.post<StandardResponse<LoginResult>>("/auth/login", payload)
  if (!res.data?.success) throw new Error("Login failed")
  return res.data.data
}

export async function fetchMe(token: string): Promise<AuthUser> {
  const res = await authApi.get<StandardResponse<AuthUser>>("/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.data?.success) throw new Error("Unauthorized")
  return res.data.data
}

export async function logout(token?: string | null): Promise<void> {
  try {
    await authApi.post(
      "/auth/logout",
      {},
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
    )
  } catch {
    // no-op
  }
}

export async function updateProfile(
  payload: UpdateProfilePayload,
  token?: string | null
): Promise<AuthUser> {
  const res = await authApi.patch<StandardResponse<AuthUser>>("/auth/profile", payload, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (!res.data?.success) throw new Error("Profile update failed")
  return res.data.data
}

export async function changePassword(
  payload: ChangePasswordPayload,
  token?: string | null
): Promise<void> {
  const res = await authApi.post<StandardResponse<{ message: string }>>(
    "/auth/change-password",
    payload,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }
  )
  if (!res.data?.success) throw new Error("Password change failed")
}
