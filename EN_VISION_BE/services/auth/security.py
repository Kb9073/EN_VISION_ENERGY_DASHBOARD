import os
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt

JWT_SECRET = os.getenv("JWT_SECRET", "dev-en-vision-secret-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_MINUTES = int(os.getenv("JWT_EXPIRES_MINUTES", "60"))
JWT_REMEMBER_EXPIRES_MINUTES = int(os.getenv("JWT_REMEMBER_EXPIRES_MINUTES", str(60 * 24 * 7)))


class TokenError(Exception):
    pass


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(*, user_id: int, username: str, role: str, remember_me: bool = False) -> tuple[str, int]:
    expires_minutes = JWT_REMEMBER_EXPIRES_MINUTES if remember_me else JWT_EXPIRES_MINUTES
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)

    payload: dict[str, Any] = {
        "sub": str(user_id),
        "username": username,
        "role": role,
        "exp": expires_at,
        "iat": datetime.now(timezone.utc),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token, expires_minutes * 60


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError as exc:
        raise TokenError("Invalid or expired token") from exc
