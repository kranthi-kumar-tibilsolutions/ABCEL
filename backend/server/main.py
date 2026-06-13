import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn

# == Line 1 of index.js: require('dotenv').config() ==
load_dotenv()

# == Line 6: const app = express() ==
app = FastAPI(title="ABG EEI Server")

# == Line 7: app.use(cors({ origin: '*' })) ==
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# == Lines 11-17: app.use('/api/...', require('./routes/...')) ==
from routes.upload      import router as upload_router
from routes.data        import router as data_router
from routes.ai          import router as ai_router
from routes.sentiment   import router as sentiment_router
from routes.statistical import router as statistical_router
from routes.persona     import router as persona_router
from routes.hypothesis  import router as hypothesis_router

app.include_router(upload_router,      prefix="/api/upload")
app.include_router(data_router,        prefix="/api")
app.include_router(ai_router,          prefix="/api")
app.include_router(sentiment_router,   prefix="/api/sentiment")
app.include_router(statistical_router, prefix="/api/statistical")
app.include_router(persona_router,     prefix="/api/persona")
app.include_router(hypothesis_router,  prefix="/api/hypothesis")

# == Lines 20-24: serve React build (express.static + catch-all *) ==
dist_path = Path(__file__).parent.parent.parent / "frontend" / "dist"

# Mount /assets so JS/CSS bundles load correctly
if (dist_path / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(dist_path / "assets")), name="assets")

# Catch-all: return index.html for every non-API path (SPA routing)
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    index = dist_path / "index.html"
    if index.exists():
        return FileResponse(str(index))
    return {"error": "Frontend not built. Run: cd frontend && npm run build"}

# == Lines 26-30: app.listen(PORT) ==
if __name__ == "__main__":
    port = int(os.getenv("PORT", 3001))
    print(f"ABG EEI server running on http://localhost:{port}")
    print(f"Cerebras model: {os.getenv('CEREBRAS_MODEL', 'llama-3.3-70b')}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
