import os
import sys
import json
import asyncio
import time
from pathlib import Path

from fastapi import APIRouter, UploadFile, File
from fastapi.responses import StreamingResponse

router = APIRouter()

_UPLOADS = Path("./backend/uploads")
_DATA    = Path("./backend/data")


@router.post("/")
async def upload_file(file: UploadFile = File(None)):
    async def generate():
        def sse(stage: str, message: str) -> str:
            return f"data: {json.dumps({'stage': stage, 'message': message})}\n\n"

        # == JS: if (!req.file) ==
        if file is None:
            yield sse("error", "No file received. Please try again.")
            yield "data: [DONE]\n\n"
            return

        # == JS: fileFilter — only .xlsx / .xls ==
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in {".xlsx", ".xls"}:
            yield sse("error", "Only .xlsx and .xls files are supported")
            yield "data: [DONE]\n\n"
            return

        # == JS: multer diskStorage — save to backend/uploads ==
        _UPLOADS.mkdir(parents=True, exist_ok=True)
        file_path = _UPLOADS / f"upload_{int(time.time() * 1000)}{ext}"

        content = await file.read()

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
        original_name = os.path.splitext(file.filename or "upload")[0]

        # == JS: spawn(pythonCmd, ['backend/preprocess/extract.py', filePath, dataDir, originalName]) ==
        proc = await asyncio.create_subprocess_exec(
            python_cmd, "backend/preprocess/extract.py",
            str(file_path.resolve()), str(_DATA.resolve()), original_name,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        # == JS: python.stdout.on('data', ...) — stream progress lines as SSE ==
        async for raw in proc.stdout:
            line = raw.decode().strip()
            if not line:
                continue
            if "Sheets found"    in line: yield sse("processing", line)
            if "Sheet "          in line: yield sse("processing", line)
            if "Dimensions"      in line: yield sse("computing",  line)
            if "Categories"      in line: yield sse("computing",  line)
            if "businesses extr" in line: yield sse("computing",  line)
            if "business units"  in line: yield sse("computing",  line)
            if "DONE"            in line: yield sse("generating", "Scores computed. AI generating insights...")

        # == JS: python.stderr.on('data', ...) + python.on('close', code) ==
        stderr_bytes = await proc.stderr.read()
        await proc.wait()

        # == JS: fs.unlink(filePath, () => {}) — cleanup temp upload ==
        try:
            file_path.unlink()
        except OSError:
            pass

        if proc.returncode != 0:
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
