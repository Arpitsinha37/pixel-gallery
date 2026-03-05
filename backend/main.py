"""
FastAPI server for the Emoji Mosaic Generator.
"""

import os
import sys
import uuid
import asyncio
import json
import time
from typing import Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

from emoji_database import EmojiDatabase
from mosaic_engine import MosaicEngine

# ---- App Setup ----
app = FastAPI(title="Emoji Mosaic Generator API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Directories ----
BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.environ.get("RAILWAY_VOLUME_MOUNT_PATH", BASE_DIR)
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")
OUTPUT_DIR = os.path.join(DATA_DIR, "outputs")
GALLERY_DB = os.path.join(DATA_DIR, "gallery.json")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ---- Global State ----
emoji_db = EmojiDatabase()
mosaic_engine = None
task_progress = {}  # task_id -> {progress, status, result, error, file_id}


# ---- Gallery Database ----
def _load_gallery():
    """Load gallery entries from JSON file."""
    if os.path.exists(GALLERY_DB):
        try:
            with open(GALLERY_DB, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []


def _save_gallery(entries):
    """Save gallery entries to JSON file."""
    with open(GALLERY_DB, "w", encoding="utf-8") as f:
        json.dump(entries, f, indent=2, ensure_ascii=False)


def _add_gallery_entry(entry):
    """Add a new entry to the gallery."""
    entries = _load_gallery()
    entries.insert(0, entry)  # newest first
    _save_gallery(entries)


def _find_upload_path(file_id):
    """Find the uploaded file by its ID."""
    for ext in [".png", ".jpg", ".jpeg", ".webp"]:
        candidate = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")
        if os.path.exists(candidate):
            return candidate
    return None


@app.on_event("startup")
async def startup():
    global mosaic_engine
    print("Initializing Emoji Database...")
    emoji_db.initialize()
    mosaic_engine = MosaicEngine(emoji_db)
    print("Server ready!")


# ---- Models ----
class GenerateRequest(BaseModel):
    file_id: str
    tile_size: int = 16
    density: int = 50000
    theme: str = "all"
    preview: bool = False


class GenerateResponse(BaseModel):
    task_id: str
    message: str


class ProgressResponse(BaseModel):
    progress: int
    status: str
    result: Optional[str] = None
    error: Optional[str] = None


# ---- Endpoints ----

@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    """Upload an image for mosaic generation."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    # Validate file type
    allowed_types = {"image/jpeg", "image/png", "image/jpg", "image/webp"}
    if file.content_type and file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Use JPG, PNG, or WebP."
        )

    # Generate unique file ID
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1] or ".png"
    save_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")

    # Save file
    content = await file.read()
    with open(save_path, "wb") as f:
        f.write(content)

    file_size_kb = len(content) / 1024
    print(f"Uploaded: {file.filename} -> {file_id}{ext} ({file_size_kb:.1f} KB)")

    return {
        "file_id": file_id,
        "filename": file.filename,
        "size_kb": round(file_size_kb, 1),
    }


@app.get("/original/{file_id}")
async def get_original_image(file_id: str):
    """Serve the original uploaded image."""
    upload_path = _find_upload_path(file_id)
    if not upload_path:
        raise HTTPException(status_code=404, detail="Original file not found")
    return FileResponse(upload_path, media_type="image/png")


@app.post("/generate", response_model=GenerateResponse)
async def generate_mosaic(request: GenerateRequest, background_tasks: BackgroundTasks):
    """Start mosaic generation (runs in background)."""
    upload_path = _find_upload_path(request.file_id)
    if not upload_path:
        raise HTTPException(status_code=404, detail="Uploaded file not found")

    # Create task
    task_id = str(uuid.uuid4())
    task_progress[task_id] = {
        "progress": 0,
        "status": "Queued",
        "result": None,
        "error": None,
    }

    # Run generation in background
    background_tasks.add_task(
        _run_generation,
        task_id=task_id,
        file_id=request.file_id,
        upload_path=upload_path,
        original_filename=os.path.basename(upload_path),
        tile_size=request.tile_size,
        density=request.density,
        theme=request.theme,
        preview=request.preview,
    )

    return GenerateResponse(
        task_id=task_id,
        message="Mosaic generation started",
    )


def _run_generation(
    task_id: str,
    file_id: str,
    upload_path: str,
    original_filename: str,
    tile_size: int,
    density: int,
    theme: str,
    preview: bool,
):
    """Background task for mosaic generation."""
    def progress_callback(pct, status):
        task_progress[task_id] = {
            "progress": pct,
            "status": status,
            "result": None,
            "error": None,
        }

    try:
        if preview:
            result_filename = mosaic_engine.generate_preview(
                upload_path, theme=theme, output_dir=OUTPUT_DIR
            )
        else:
            result_filename = mosaic_engine.generate_mosaic(
                upload_path,
                tile_size=tile_size,
                density=density,
                theme=theme,
                progress_callback=progress_callback,
                output_dir=OUTPUT_DIR,
            )

        task_progress[task_id] = {
            "progress": 100,
            "status": "Complete",
            "result": result_filename,
            "error": None,
        }

        # Save to gallery database
        mode = "preview" if preview else "hd"
        _add_gallery_entry({
            "id": str(uuid.uuid4()),
            "file_id": file_id,
            "original_filename": original_filename,
            "mosaic_filename": result_filename,
            "tile_size": tile_size,
            "density": 1000 if preview else density,
            "theme": theme,
            "mode": mode,
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "timestamp": int(time.time()),
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Generation error: {e}")
        task_progress[task_id] = {
            "progress": 0,
            "status": "Error",
            "result": None,
            "error": str(e),
        }


@app.get("/progress/{task_id}")
async def get_progress(task_id: str):
    """Get the progress of a mosaic generation task."""
    if task_id not in task_progress:
        raise HTTPException(status_code=404, detail="Task not found")
    return task_progress[task_id]


@app.get("/progress-stream/{task_id}")
async def progress_stream(task_id: str):
    """SSE endpoint for real-time progress updates."""
    if task_id not in task_progress:
        raise HTTPException(status_code=404, detail="Task not found")

    async def event_generator():
        while True:
            if task_id in task_progress:
                data = json.dumps(task_progress[task_id])
                yield f"data: {data}\n\n"

                progress_info = task_progress[task_id]
                if progress_info["progress"] >= 100 or progress_info["error"]:
                    break

            await asyncio.sleep(0.5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@app.get("/download/{filename}")
async def download_mosaic(filename: str):
    """Download a generated mosaic image."""
    filepath = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")

    display_name = filename if filename.endswith(".png") else f"{filename}.png"

    return FileResponse(
        filepath,
        media_type="image/png",
        filename=display_name,
    )


@app.get("/mosaic-image/{filename}")
async def get_mosaic_image(filename: str):
    """Serve a mosaic image for display (inline, no download)."""
    filepath = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(filepath, media_type="image/png")


@app.get("/gallery")
async def get_gallery():
    """Get all gallery entries (newest first)."""
    entries = _load_gallery()
    return {"entries": entries, "total": len(entries)}


@app.delete("/gallery/{entry_id}")
async def delete_gallery_entry(entry_id: str):
    """Delete a gallery entry."""
    entries = _load_gallery()
    updated = [e for e in entries if e.get("id") != entry_id]
    if len(updated) == len(entries):
        raise HTTPException(status_code=404, detail="Entry not found")
    _save_gallery(updated)
    return {"message": "Deleted", "remaining": len(updated)}


@app.get("/health")
async def health():
    """Health check endpoint."""
    emoji_count = len(emoji_db.emoji_colors) if emoji_db.emoji_colors else 0
    gallery_count = len(_load_gallery())
    return {
        "status": "healthy",
        "emoji_count": emoji_count,
        "gallery_count": gallery_count,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
