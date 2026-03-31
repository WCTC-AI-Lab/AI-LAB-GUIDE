# AI-LAB-GUIDE — project context

## Purpose

Web user guide for the **WCTC AI Lab** (Waukesha, WI): helps new users explore **local AI** on lab machines (e.g. Ada 4000 GPU via Ollama) and follow **short “adventures”** (~30 min guided projects).

## Stack

- **Backend**: Flask (`app.py`) serves the built SPA from `frontend/dist` and exposes `/api/*` (e.g. models list, next-token prediction via **Ollama** Python client, `num_gpu` hint in options).
- **Production on lab PCs**: **Waitress** (`run_waitress.py`) under **PM2**, **`pythonw.exe`** (no console window). See `docs/infra.md`. **Note:** `infra.md` sometimes says `run_server.py`; this repo uses **`run_waitress.py`** and **`app.py`**.
- **Frontend**: Vite + React + TypeScript + MUI + react-router-dom under `frontend/`. **`npm run build`** → `frontend/dist`. **`npm run dev`**: Vite proxies `/api` to `http://localhost:5000` (`vite.config.ts`).
- **Updates**: `docs/local.md` — `auto_update.bat` + Windows Task Scheduler (pull-based).

## Repo layout

- Root: `app.py`, `run_waitress.py`, `requirements.txt`, `auto_update.bat`, `ollama/` (small test scripts).
- Features live under `frontend/src/modules/` as **playgrounds** and **adventures**, registered in `frontend/src/modules/registry.ts` (lazy pages + `meta` for nav/order).

## Product areas (current)

- **Playgrounds**: Hub `/playgrounds`. **Explore a Large Language Model** (`/playgrounds/llm-explore`) — step/auto next token, temperature, logprobs; needs local Ollama + models matching `AVAILABLE_MODELS` in `app.py`. **Computer vision** — placeholder only (SAM3/vision not wired yet).
- **Adventures**: Hub `/adventures`. **Make a Video Game** — instructions + link to hosted games site (`frontend/src/modules/adventures/vibe-game-maker/links.ts`); games live in a **separate repo**. **Azure static-site adventure** — intended direction, not in registry yet.
- **Legacy routes**: `/llm-explore`, `/games` still exist for compatibility.

## Quick run (dev)

From repo root: `cd frontend` → `npm install` → `npm run build` → back to root → `pip install -r requirements.txt` → `python app.py`. Open `http://localhost:5000`. More detail: `README-backend.md`.
