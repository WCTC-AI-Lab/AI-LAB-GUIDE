# AI Lab Guide

An interactive local web app for the AI Lab: playgrounds and guided adventures covering LLMs, computer vision (SAM3), and more.

Runs entirely locally on each lab Windows machine — no cloud, no external services (except Ollama for LLM features).

---

## External Dependencies (install once, manually)

These must be present on the machine before running `setup.ps1`. Use [winget](https://learn.microsoft.com/windows/package-manager/winget/) or the linked installers.

| Tool | Purpose | Install |
|---|---|---|
| Python 3.11+ | Backend runtime | [python.org](https://www.python.org/downloads/) |
| Node.js 22+ | Frontend build + PM2 | `winget install -e --id OpenJS.NodeJS.LTS` |
| Git | Version control + auto-updates | `winget install -e --id Git.Git` |
| ffmpeg | Video frame extraction | `winget install -e --id Gyan.FFmpeg` |
| Ollama | Local LLM inference | `winget install -e --id Ollama.Ollama` |
| NVIDIA drivers + CUDA 13.0 | GPU support for SAM3 | Via NVIDIA website |

After installing, **restart PowerShell** so PATH updates take effect.

Also install the PM2 process manager (requires Node.js):

```powershell
npm install -g pm2 pm2-windows-startup
pm2-startup install
```

---

## SAM3 Model Checkpoint (one-time)

You will need to download the SAM3 model checkpoint and place it where `sam_api.py` expects it. See `SAM_PLAYGROUND_SPEC.md` for details.

The SAM3 package itself is installed automatically by `auto_update.bat` from [our fork](https://github.com/jroberts-fellow/sam3-AI-LAB-GUIDE) — no manual clone needed. The fork includes a Windows compatibility fix (triton → scipy fallback).

---

## First-Time Setup (new machine)

Clone the repo, register the Task Scheduler task, and reboot. `auto_update.bat` handles everything else automatically on first run:

- Creates the Python `venv`
- Installs all dependencies from `requirements.txt`
- Installs PyTorch with CUDA 13.0 support
- Installs SAM3 from the fork

```powershell
git clone https://github.com/YOUR-ORG/AI-LAB-GUIDE C:\Users\AI-Lab\Desktop\AI-LAB-GUIDE
```

Then register the Task Scheduler task (see `docs/local-cicd.md`) and reboot.

---

## Development

```powershell
.\dev.ps1
```

Opens two terminal windows:
- **Backend** — Flask on `http://localhost:5001`
- **Frontend** — Vite dev server on `http://localhost:5173` (proxies `/api` → 5001)

---

## Production (background service)

The app runs silently via PM2 + Waitress. See `docs/background-service.md` for setup.

Auto-updates from `master` are handled by Windows Task Scheduler + `auto_update.bat`. See `docs/local-cicd.md` for setup.

---

## Documentation

| Doc | What it covers |
|---|---|
| `docs/background-service.md` | PM2 + Waitress background service setup |
| `docs/local-cicd.md` | Pull-based auto-update via Task Scheduler |
| `docs/frontend-structure.md` | React module/registry architecture |
| `SAM_PLAYGROUND_SPEC.md` | SAM3 playground feature spec |
