export type UserRole = "Admin" | "User" | "Viewer"

export interface AuthUser {
  id: number
  username: string
  email: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface LoginPayload {
  username: string
  password: string
  remember_me: boolean
}

export interface LoginResult {
  access_token: string
  token_type: "bearer"
  expires_in: number
  user: AuthUser
}

export interface StandardResponse<T> {
  success: boolean
  data: T
  timestamp: string
}

export interface UpdateProfilePayload {
  username: string
  email: string
}

export interface ChangePasswordPayload {
  current_password: string
  new_password: string
}
