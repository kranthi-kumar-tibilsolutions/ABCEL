import base64
import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

router = APIRouter()

_USERS_FILE = Path(__file__).resolve().parent.parent / "data" / "users.json"

# Maps display company name → name used in businesses/units data files
COMPANY_DATA_ALIAS: dict = {
    "UltraTech Cement": "Cement HO",
}


def _load_users() -> list:
    try:
        return json.loads(_USERS_FILE.read_text(encoding="utf-8-sig"))
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
    payload = json.dumps({
        "email":   u["email"],
        "role":    u["role"],
        "company": u.get("company"),
    })
    return base64.b64encode(payload.encode()).decode()


def data_company(user: dict) -> Optional[str]:
    """Returns the dataset name for the user's company (maps display name → data name)."""
    name = user.get("company") or ""
    return COMPANY_DATA_ALIAS.get(name, name) or None


def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """FastAPI dependency — decodes Bearer token and returns user dict.
    Falls back to group_hr (full access) if no token present."""
    if not authorization or not authorization.startswith("Bearer "):
        return {"role": "group_hr", "company": None}
    try:
        token = authorization.split(" ", 1)[1]
        return json.loads(base64.b64decode(token).decode())
    except Exception:
        return {"role": "group_hr", "company": None}


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
    raise HTTPException(status_code=401, detail="Not authenticated")
