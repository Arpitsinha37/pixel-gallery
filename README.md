# 🎨 Emoji Mosaic Generator

Convert your photos into stunning high-resolution emoji photomosaics with up to 250,000 emoji tiles!

## Quick Start

### Backend
```bash
cd emoji-mosaic
pip install -r requirements.txt
cd backend
python generate_tiles.py    # Generate emoji tile PNGs (first time only)
python main.py               # Start FastAPI server on port 8000
```

### Frontend
```bash
cd emoji-mosaic/frontend
npm install
npm run dev                  # Start Vite dev server on port 5173
```

Then open **http://localhost:5173** in your browser.

## Features
- 📷 Upload any JPG/PNG photo
- 🔍 Instant low-res preview (~1000 tiles)
- 🎚️ Adjustable tile size (8–32px) and density (25k–250k)
- 🎭 Emoji theme filters (faces, hearts, animals, food)
- 📥 Download HD mosaic poster (up to 12000×12000px)
- ⚡ Fast KDTree color matching + NumPy vectorized ops
- 🖥️ Runs 100% locally — no cloud APIs needed
