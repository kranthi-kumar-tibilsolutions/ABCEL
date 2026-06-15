import base64
import json
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

# Demo users — Group HR sees all companies, Company HR is scoped to one
USERS = {
    "admin@abg.com": {
        "password": "abg2026",
        "user": {
            "id":      "U001",
            "name":    "ABG Admin",
            "email":   "admin@abg.com",
            "role":    "group_hr",
            "company": None,
        },
    },
    "kranthi@abg.com": {
        "password": "abg2026",
        "user": {
            "id":      "U002",
            "name":    "Kranthi Kumar",
            "email":   "kranthi@abg.com",
            "role":    "group_hr",
            "company": None,
        },
    },
    "hr@cementho.com": {
        "password": "cement2026",
        "user": {
            "id":      "U101",
            "name":    "Cement HO HR",
            "email":   "hr@cementho.com",
            "role":    "company_hr",
            "company": "Cement HO",
        },
    },
    "hr@metals.com": {
        "password": "metals2026",
        "user": {
            "id":      "U102",
            "name":    "Metals HR",
            "email":   "hr@metals.com",
            "role":    "company_hr",
            "company": "Metals",
        },
    },
    "hr@novelis.com": {
        "password": "novelis2026",
        "user": {
            "id":      "U103",
            "name":    "Novelis HR",
            "email":   "hr@novelis.com",
            "role":    "company_hr",
            "company": "Novelis",
        },
    },
}


def _make_token(user: dict) -> str:
    payload = json.dumps({"id": user["id"], "role": user["role"]})
    return base64.b64encode(payload.encode()).decode()


class LoginRequest(BaseModel):
    email:    str
    password: str


@router.post("/login")
async def login(req: LoginRequest):
    record = USERS.get(req.email.lower().strip())
    if not record or record["password"] != req.password:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user  = record["user"]
    token = _make_token(user)
    return {"user": user, "token": token}
