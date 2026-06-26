from typing import Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from routes.auth import get_current_user
from lib.activity_log import log_event

router = APIRouter()


class TrackEvent(BaseModel):
    type:       str
    page:       Optional[str] = None
    session_id: str


@router.post("/event")
async def track_event(body: TrackEvent, request: Request, user: dict = Depends(get_current_user)):
    log_event({
        "type":       body.type,
        "page":       body.page,
        "session_id": body.session_id,
        "email":      user.get("email"),
        "role":       user.get("role"),
        "company":    user.get("company"),
        "ip":         request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
    })
    return {"ok": True}
