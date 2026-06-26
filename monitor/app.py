import hashlib
import hmac
import json
import os
import sqlite3
import time
from pathlib import Path
from contextlib import contextmanager

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

load_dotenv()

BASE_DIR        = Path(__file__).resolve().parent
DB_PATH          = BASE_DIR / "monitor.db"
ACTIVITY_LOG_PATH = Path(os.getenv("ACTIVITY_LOG_PATH", BASE_DIR.parent / "backend" / "server" / "data" / "activity.log"))
STATIC_DIR       = BASE_DIR / "static"

MONITOR_PASSWORD = os.getenv("MONITOR_PASSWORD", "")
SECRET_KEY       = os.getenv("SECRET_KEY", "")
COOKIE_NAME      = "monitor_session"
SESSION_MAX_AGE  = 12 * 3600   # 12h login validity
ACTIVE_WINDOW    = 90          # "active now" = an event within the last 90s
GAP_CAP          = 90          # gaps wider than this aren't counted as active time (idle tab)

app = FastAPI(title="ABCEL Activity Monitor")


# ---------------------------------------------------------------------------
# DB setup
# ---------------------------------------------------------------------------

@contextmanager
def db():
    conn = sqlite3.connect(DB_PATH)
    try:
        yield conn
    finally:
        conn.close()


def init_db():
    with db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts REAL NOT NULL,
                type TEXT,
                email TEXT,
                role TEXT,
                company TEXT,
                session_id TEXT,
                page TEXT,
                method TEXT,
                path TEXT,
                status INTEGER,
                duration_ms REAL,
                ip TEXT,
                user_agent TEXT
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id)")
        conn.execute("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)")
        conn.commit()


def get_offset(conn) -> int:
    row = conn.execute("SELECT value FROM meta WHERE key = 'offset'").fetchone()
    return int(row[0]) if row else 0


def set_offset(conn, offset: int):
    conn.execute("INSERT INTO meta (key, value) VALUES ('offset', ?) ON CONFLICT(key) DO UPDATE SET value = ?",
                 (str(offset), str(offset)))


# ---------------------------------------------------------------------------
# Log tailing — ingests new lines appended to the main app's activity.log
# ---------------------------------------------------------------------------

def ingest_new_lines():
    if not ACTIVITY_LOG_PATH.exists():
        return
    with db() as conn:
        offset = get_offset(conn)
        size = ACTIVITY_LOG_PATH.stat().st_size
        if size < offset:
            offset = 0  # log was rotated/truncated
        if size == offset:
            return

        with open(ACTIVITY_LOG_PATH, "rb") as f:
            f.seek(offset)
            data = f.read()

        text = data.decode("utf-8", errors="ignore")
        ends_clean = text.endswith("\n")
        lines = text.split("\n")
        incomplete = "" if ends_clean else lines.pop()
        consumed = len(data) - len(incomplete.encode("utf-8"))

        rows = []
        for line in lines:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except Exception:
                continue

        if rows:
            conn.executemany(
                """INSERT INTO events
                   (ts, type, email, role, company, session_id, page, method, path, status, duration_ms, ip, user_agent)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                [(
                    r.get("ts"), r.get("type"), r.get("email"), r.get("role"), r.get("company"),
                    r.get("session_id"), r.get("page"), r.get("method"), r.get("path"),
                    r.get("status"), r.get("duration_ms"), r.get("ip"), r.get("user_agent"),
                ) for r in rows],
            )
        set_offset(conn, offset + consumed)
        conn.commit()


async def tail_loop():
    import asyncio
    while True:
        try:
            ingest_new_lines()
        except Exception as e:
            print(f"[monitor] tail error: {e}")
        await asyncio.sleep(2)


@app.on_event("startup")
async def on_startup():
    import asyncio
    init_db()
    asyncio.create_task(tail_loop())


# ---------------------------------------------------------------------------
# Auth — separate from the main app: a single shared password, signed cookie
# ---------------------------------------------------------------------------

def _sign(value: str) -> str:
    sig = hmac.new(SECRET_KEY.encode(), value.encode(), hashlib.sha256).hexdigest()
    return f"{value}.{sig}"


def _make_token() -> str:
    return _sign(str(int(time.time())))


def _verify_token(token: str) -> bool:
    try:
        value, sig = token.rsplit(".", 1)
        expected = hmac.new(SECRET_KEY.encode(), value.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return False
        return (time.time() - int(value)) < SESSION_MAX_AGE
    except Exception:
        return False


def require_auth(request: Request):
    token = request.cookies.get(COOKIE_NAME)
    if not token or not _verify_token(token):
        raise HTTPException(status_code=401, detail="Not authenticated")


class LoginBody(BaseModel):
    password: str


@app.post("/login")
async def login(body: LoginBody, response: Response):
    if not MONITOR_PASSWORD or body.password != MONITOR_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid password")
    response.set_cookie(
        COOKIE_NAME, _make_token(),
        httponly=True, samesite="lax", max_age=SESSION_MAX_AGE,
    )
    return {"ok": True}


@app.post("/logout")
async def logout(response: Response):
    response.delete_cookie(COOKIE_NAME)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Aggregation
# ---------------------------------------------------------------------------

def _session_active_seconds(conn, since_ts: float):
    """Per-session active time: sums consecutive event gaps, dropping any gap
    wider than GAP_CAP so a tab left open/idle doesn't inflate the duration."""
    rows = conn.execute(
        "SELECT session_id, ts, email FROM events WHERE ts >= ? ORDER BY session_id, ts",
        (since_ts,),
    ).fetchall()
    sessions = {}
    prev_session = prev_ts = None
    for session_id, ts, email in rows:
        s = sessions.setdefault(session_id, {"email": email, "seconds": 0.0, "last": ts})
        if email:
            s["email"] = email
        s["last"] = ts
        if prev_session == session_id:
            gap = ts - prev_ts
            if gap <= GAP_CAP:
                s["seconds"] += gap
        prev_session, prev_ts = session_id, ts
    return sessions


@app.get("/api/summary", dependencies=[Depends(require_auth)])
async def api_summary():
    now = time.time()
    with db() as conn:
        unique_users = conn.execute(
            "SELECT COUNT(DISTINCT email) FROM events WHERE email IS NOT NULL"
        ).fetchone()[0]
        active_now = conn.execute(
            "SELECT COUNT(DISTINCT session_id) FROM events WHERE ts >= ?", (now - ACTIVE_WINDOW,)
        ).fetchone()[0]
        sessions = _session_active_seconds(conn, now - 86400)
        durations = [s["seconds"] for s in sessions.values()]
        avg_minutes = (sum(durations) / len(durations) / 60) if durations else 0
        return {
            "unique_users_total":   unique_users,
            "active_now":           active_now,
            "sessions_24h":         len(sessions),
            "avg_session_minutes":  round(avg_minutes, 1),
        }


@app.get("/api/users", dependencies=[Depends(require_auth)])
async def api_users():
    with db() as conn:
        sessions = _session_active_seconds(conn, 0)
        by_user = {}
        for s in sessions.values():
            if not s["email"]:
                continue
            u = by_user.setdefault(s["email"], {"sessions": 0, "seconds": 0.0, "last_seen": 0.0})
            u["sessions"] += 1
            u["seconds"] += s["seconds"]
            u["last_seen"] = max(u["last_seen"], s["last"])
        rows = [
            {
                "email":         email,
                "sessions":      v["sessions"],
                "total_minutes": round(v["seconds"] / 60, 1),
                "last_seen":     v["last_seen"],
            }
            for email, v in by_user.items()
        ]
        rows.sort(key=lambda r: r["last_seen"], reverse=True)
        return rows


@app.get("/api/pages", dependencies=[Depends(require_auth)])
async def api_pages():
    with db() as conn:
        rows = conn.execute(
            "SELECT session_id, ts, page FROM events WHERE page IS NOT NULL ORDER BY session_id, ts"
        ).fetchall()
        pages = {}
        prev_session = prev_ts = prev_page = None
        for session_id, ts, page in rows:
            pages.setdefault(page, {"visits": 0, "seconds": 0.0})
            pages[page]["visits"] += 1
            if prev_session == session_id and prev_page:
                gap = ts - prev_ts
                if gap <= GAP_CAP:
                    pages[prev_page]["seconds"] += gap
            prev_session, prev_ts, prev_page = session_id, ts, page
        result = [
            {"page": p, "visits": v["visits"], "minutes": round(v["seconds"] / 60, 1)}
            for p, v in pages.items()
        ]
        result.sort(key=lambda r: r["minutes"], reverse=True)
        return result


@app.get("/api/timeseries", dependencies=[Depends(require_auth)])
async def api_timeseries(hours: int = 24):
    now = time.time()
    since = now - hours * 3600
    with db() as conn:
        rows = conn.execute(
            "SELECT session_id, MIN(ts) FROM events WHERE ts >= ? GROUP BY session_id", (since,)
        ).fetchall()
        buckets = {}
        for _, start in rows:
            bucket = int(start // 3600) * 3600
            buckets[bucket] = buckets.get(bucket, 0) + 1
        start_hour = int(since // 3600) * 3600
        end_hour = int(now // 3600) * 3600
        result, h = [], start_hour
        while h <= end_hour:
            result.append({"hour": h, "sessions": buckets.get(h, 0)})
            h += 3600
        return result


@app.get("/api/recent", dependencies=[Depends(require_auth)])
async def api_recent(limit: int = 50):
    with db() as conn:
        rows = conn.execute(
            """SELECT ts, type, email, page, method, path, status
               FROM events ORDER BY ts DESC LIMIT ?""",
            (limit,),
        ).fetchall()
        return [
            {"ts": ts, "type": t, "email": email, "page": page, "method": method, "path": path, "status": status}
            for ts, t, email, page, method, path, status in rows
        ]


# ---------------------------------------------------------------------------
# Static dashboard
# ---------------------------------------------------------------------------

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
async def index():
    return FileResponse(str(STATIC_DIR / "index.html"))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 3002))
    print(f"ABCEL monitor running on http://localhost:{port}")
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
