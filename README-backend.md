# Flask + Vite Monorepo Quickstart

## Structure
- `frontend/` — Vite/React app (builds to `frontend/dist`)
- `app.py` — Flask backend serving built frontend

## Usage

1. Build the frontend:
   ```bash
   cd frontend
   npm install
   npm run build
   ```
   This outputs static files to `frontend/dist`.

2. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run Flask backend:
   ```bash
   python app.py
   ```
   Visit http://localhost:5000 to see the frontend served by Flask.

---

- Add your LLM API endpoints to `app.py` as needed.
- The Flask app will serve any static file from the frontend build folder.
