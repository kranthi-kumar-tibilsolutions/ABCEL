import base64
import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

_USERS_FILE = Path(__file__).resolve().parent.parent / "data" / "users.json"


def _load_users() -> list:
    try:
        return json.loads(_USERS_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []


def _public_user(u: dict) -> dict:
    return {
        "email":   u["email"],
        "name":    u["name"],
        "role":    u["role"],
        "company": u.get("company"),
        "theme":   u.get("theme", "abg"),
    }


def _make_token(u: dict) -> str:
    payload = json.dumps({"email": u["email"], "role": u["role"]})
    return base64.b64encode(payload.encode()).decode()


class LoginRequest(BaseModel):
    email:    str
    password: str


@router.post("/login")
async def login(req: LoginRequest):
    users = _load_users()
    user  = next(
        (u for u in users if u["email"].lower() == req.email.lower().strip()),
        None,
    )
    if not user or user.get("password") != req.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    pub   = _public_user(user)
    token = _make_token(pub)
    return {"token": token, "user": pub}


@router.get("/me")
async def me():
    # Placeholder — frontend uses localStorage, not server-side sessions
    raise HTTPException(status_code=401, detail="Not authenticated")
