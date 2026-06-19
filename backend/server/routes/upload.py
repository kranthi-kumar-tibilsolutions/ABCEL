import os
import sys
import json
import asyncio
import subprocess
import threading
import time
from pathlib import Path

from fastapi import APIRouter, UploadFile, File
from fastapi.responses import StreamingResponse

router = APIRouter()

# Absolute paths derived from this file's location — CWD-independent.
# upload.py lives at: <root>/backend/server/routes/upload.py
_BACKEND = Path(__file__).resolve().parent.parent.parent   # <root>/backend
_UPLOADS = _BACKEND / "uploads"
_DATA    = _BACKEND / "data"
_EXTRACT = _BACKEND / "preprocess" / "extract.py"


@router.post("")
async def upload_file(file: UploadFile = File(None)):
    # Read file content NOW, while the request is still open.
    # StreamingResponse iterates the generator lazily AFTER the request body closes,
    # so any await file.read() inside generate() would raise "read of closed file".
    _filename = file.filename if file else None
    _content  = await file.read() if file else None

    async def generate():
        def sse(stage: str, message: str) -> str:
            return f"data: {json.dumps({'stage': stage, 'message': message})}\n\n"

        if _filename is None or _content is None:
            yield sse("error", "No file received. Please try again.")
            yield "data: [DONE]\n\n"
            return

        ext = os.path.splitext(_filename)[1].lower()
        if ext not in {".xlsx", ".xls"}:
            yield sse("error", "Only .xlsx and .xls files are supported")
            yield "data: [DONE]\n\n"
            return

        _UPLOADS.mkdir(parents=True, exist_ok=True)
        file_path = _UPLOADS / f"upload_{int(time.time() * 1000)}{ext}"

        content = _content

        # == JS: limits: { fileSize: 100MB } ==
        if len(content) > 100 * 1024 * 1024:
            yield sse("error", "File too large. Maximum 100MB.")
            yield "data: [DONE]\n\n"
            return

        file_path.write_bytes(content)
        size_mb = len(content) / 1024 / 1024

        # == JS: fs.mkdirSync(dataDir) + clear previous results ==
        _DATA.mkdir(parents=True, exist_ok=True)
        for name in ["businesses.json", "units.json", "clusters.json", "cohorts.json", "meta.json"]:
            try:
                (_DATA / name).unlink()
            except OSError:
                pass

        yield sse("uploading", f"File received ({size_mb:.1f} MB). Starting analysis...")

        # == JS: process.platform === 'win32' ? 'python' : 'python3' ==
        python_cmd    = "python" if sys.platform == "win32" else "python3"
        original_name = os.path.splitext(_filename or "upload")[0]

        # asyncio.create_subprocess_exec requires ProactorEventLoop on Windows,
        # but uvicorn uses SelectorEventLoop. Run extract.py in a thread instead
        # and stream lines back through an asyncio.Queue.
        loop = asyncio.get_running_loop()
        q: asyncio.Queue = asyncio.Queue()

        def _run_extract():
            env = os.environ.copy()
            env["PYTHONIOENCODING"] = "utf-8"
            p = subprocess.Popen(
                [python_cmd, str(_EXTRACT),
                 str(file_path.resolve()), str(_DATA.resolve()), original_name],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=env,
            )
            for raw_line in p.stdout:
                loop.call_soon_threadsafe(q.put_nowait, ("line", raw_line))
            p.stdout.close()
            p.wait()
            errbytes = p.stderr.read()
            p.stderr.close()
            loop.call_soon_threadsafe(q.put_nowait, ("done", p.returncode, errbytes))

        threading.Thread(target=_run_extract, daemon=True).start()

        return_code  = 0
        stderr_bytes = b""
        while True:
            item = await q.get()
            if item[0] == "done":
                _, return_code, stderr_bytes = item
                break
            _, raw = item
            line = raw.decode("utf-8", errors="replace").strip()
            if not line:
                continue
            if "Sheets found"    in line: yield sse("processing", line)
            if "Sheet "          in line: yield sse("processing", line)
            if "Dimensions"      in line: yield sse("computing",  line)
            if "Categories"      in line: yield sse("computing",  line)
            if "businesses extr" in line: yield sse("computing",  line)
            if "business units"  in line: yield sse("computing",  line)
            if "DONE"            in line: yield sse("generating", "Scores computed. AI generating insights...")

        # == JS: fs.unlink(filePath, () => {}) — cleanup temp upload ==
        try:
            file_path.unlink()
        except OSError:
            pass

        if return_code != 0:
            stderr_buf = stderr_bytes.decode()
            print(f"[Python stderr] {stderr_buf}")
            # Extract last meaningful error line (skip File/Traceback/^ lines)
            err_lines = [l.strip() for l in stderr_buf.split("\n")]
            err_line  = next(
                (l for l in reversed(err_lines)
                 if l and not l.startswith("File ") and not l.startswith("Traceback") and not l.startswith("^")),
                None,
            )
            detail = f" ({err_line})" if err_line else ""
            yield sse("error", f"Processing failed. Please check your Excel file format.{detail}")
            yield "data: [DONE]\n\n"
            return

        # Precompute Focus Spotlight segments from the freshly extracted responses.json
        try:
            from lib.segment_engine import precompute_and_save
            precompute_and_save()
        except Exception:
            pass   # non-fatal — spotlight will recompute on first request

        # == JS: JSON.parse(fs.readFileSync(meta.json)) ==
        try:
            meta = json.loads((_DATA / "meta.json").read_text(encoding="utf-8"))
            yield sse("ready", json.dumps(meta))
        except Exception:
            yield sse("error", "Data processed but could not read results. Please try again.")

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
