from datetime import datetime
from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str | None = None
    email: str | None = None
    password: str
    remember_me: bool = False


class AuthUser(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    created_at: datetime


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: AuthUser


class UpdateProfileRequest(BaseModel):
    username: str
    email: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
