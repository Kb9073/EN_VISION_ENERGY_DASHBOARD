from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from db.session import get_db
from models.user import User
from schemas.auth import (
    AuthUser,
    ChangePasswordRequest,
    LoginRequest,
    LoginResponse,
    UpdateProfileRequest,
)
from schemas.base import StandardResponse
from services.auth.dependencies import get_current_user
from services.auth.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Auth"])


def _to_auth_user(user: User) -> AuthUser:
    return AuthUser(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
    )


@router.post("/login", response_model=StandardResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    identifier = (payload.username or payload.email or "").strip()
    if not identifier:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username or email is required")

    identifier_lower = identifier.lower()
    user = (
        db.query(User)
        .filter(
            (func.lower(User.username) == identifier_lower) | (func.lower(User.email) == identifier_lower),
            User.is_active.is_(True),
        )
        .first()
    )

    valid_password = bool(user and verify_password(payload.password, user.password_hash))

    # Migrate legacy plaintext passwords to bcrypt when users log in.
    if user and not valid_password and payload.password == user.password_hash:
        user.password_hash = hash_password(payload.password)
        db.add(user)
        db.commit()
        db.refresh(user)
        valid_password = True

    if not user or not valid_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token, expires_in = create_access_token(
        user_id=user.id,
        username=user.username,
        role=user.role,
        remember_me=payload.remember_me,
    )

    response.set_cookie(
        key="envision_token",
        value=token,
        max_age=expires_in,
        httponly=False,
        samesite="lax",
    )

    data = LoginResponse(
        access_token=token,
        expires_in=expires_in,
        user=_to_auth_user(user),
    )

    return StandardResponse(success=True, data=data.model_dump(), timestamp=datetime.utcnow())


@router.post("/logout", response_model=StandardResponse)
def logout(response: Response):
    response.delete_cookie(key="envision_token")
    return StandardResponse(success=True, data={"message": "Logged out"}, timestamp=datetime.utcnow())


@router.get("/me", response_model=StandardResponse)
def me(user: User = Depends(get_current_user)):
    return StandardResponse(success=True, data=_to_auth_user(user).model_dump(), timestamp=datetime.utcnow())


@router.patch("/profile", response_model=StandardResponse)
def update_profile(
    payload: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    username = payload.username.strip()
    email = payload.email.strip().lower()

    if not username or not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username and email are required")

    existing = (
        db.query(User)
        .filter(
            User.id != user.id,
            ((User.username == username) | (User.email == email)),
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username or email already exists")

    user.username = username
    user.email = email
    db.add(user)
    db.commit()
    db.refresh(user)

    return StandardResponse(success=True, data=_to_auth_user(user).model_dump(), timestamp=datetime.utcnow())


@router.post("/change-password", response_model=StandardResponse)
def change_password(
    payload: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

    if len(payload.new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be at least 8 characters")

    user.password_hash = hash_password(payload.new_password)
    db.add(user)
    db.commit()

    return StandardResponse(
        success=True,
        data={"message": "Password changed successfully"},
        timestamp=datetime.utcnow(),
    )


def ensure_default_users(db: Session):
    defaults = [
        ("admin", "admin@envision.local", "Admin", "Admin@123"),
        ("user", "user@envision.local", "User", "User@123"),
        ("viewer", "viewer@envision.local", "Viewer", "Viewer@123"),
    ]

    for username, email, role, password in defaults:
        existing = db.query(User).filter((User.username == username) | (User.email == email)).first()
        if existing:
            continue
        db.add(
            User(
                username=username,
                email=email,
                role=role,
                password_hash=hash_password(password),
                is_active=True,
            )
        )

    db.commit()
