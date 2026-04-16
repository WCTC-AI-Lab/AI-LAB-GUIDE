# AI Lab Guide

An interactive local web app for the AI Lab: playgrounds and guided adventures covering LLMs, computer vision (SAM3), and more.

Runs entirely locally on each lab Windows machine — no cloud, no external services (except Ollama for LLM features).

---

## External Dependencies (install once, manually)

These must be present on the machine before the first run. Use [winget](https://learn.microsoft.com/windows/package-manager/winget/) or the linked installers.

| Tool | Purpose | Install |
|---|---|---|
| Python 3.11+ | Backend runtime | [python.org](https://www.python.org/downloads/) |
| Node.js 22+ | Frontend build + PM2 | `winget install -e --id OpenJS.NodeJS.LTS` |
| Git | Version control + auto-updates | `winget install -e --id Git.Git` |
| ffmpeg | Video frame extraction | `winget install -e --id Gyan.FFmpeg` |
| Ollama | Local LLM inference | `winget install -e --id Ollama.Ollama` |
| NVIDIA drivers + CUDA 13.0 | GPU support for SAM3 | Via NVIDIA website |

After installing external dependencies, **restart PowerShell** so PATH updates take effect.

Install PM2 globally:

```powershell
npm install -g pm2 pm2-windows-startup
pm2-startup install
```

---

## First-Time Setup (new machine)

```powershell
# 1. Clone the repo
git clone https://github.com/YOUR-ORG/AI-LAB-GUIDE C:\Users\AI-Lab\Desktop\AI-LAB-GUIDE

# 2. Create the secrets file (needed for SAM3 model download)
cd C:\Users\AI-Lab\Desktop\AI-LAB-GUIDE
echo set HF_TOKEN=hf_YOUR_TOKEN_HERE > secrets.bat

# 3. Run the update script manually for the first time
auto_update.bat
# This creates the venv, installs all deps (PyTorch CUDA, SAM3, etc.),
# builds the frontend, and starts the app via PM2.
# First run takes 10-20 minutes (PyTorch download is large).

# 4. Verify the app is running
pm2 status
# Should show AILabGuide as "online"
# Open http://localhost:5000 in a browser

# 5. Set up Task Scheduler for auto-updates on reboot
# See docs/local-cicd.md for step-by-step instructions
```

The SAM3 package is installed automatically from [our fork](https://github.com/jroberts-fellow/sam3-AI-LAB-GUIDE) (includes a Windows compatibility fix). The SAM3 model checkpoint is downloaded automatically via HuggingFace Hub using the token in `secrets.bat`.

---

## Fresh Install (nuke and rebuild)

If a machine is in a broken state (PM2 stuck, merge conflicts, stale venv), start over:

```powershell
# 1. Kill everything
pm2 kill
taskkill /F /IM waitress-serve.exe 2>$null

# 2. Delete the old repo
Remove-Item -Recurse -Force C:\Users\AI-Lab\Desktop\AI-LAB-GUIDE

# 3. Clone fresh
git clone https://github.com/YOUR-ORG/AI-LAB-GUIDE C:\Users\AI-Lab\Desktop\AI-LAB-GUIDE

# 4. Recreate secrets
cd C:\Users\AI-Lab\Desktop\AI-LAB-GUIDE
echo set HF_TOKEN=hf_YOUR_TOKEN_HERE > secrets.bat

# 5. Run the update script (bootstraps everything)
auto_update.bat

# 6. Verify
pm2 status
```

The Task Scheduler task does not need to be recreated — it points to the same path.

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

The app runs silently via PM2 + Waitress. See `docs/background-service.md` for details.

Auto-updates from `master` are handled by Windows Task Scheduler + `auto_update.bat`. See `docs/local-cicd.md` for setup.

---

## Documentation

| Doc | What it covers |
|---|---|
| `docs/background-service.md` | PM2 + Waitress background service setup and recovery |
| `docs/local-cicd.md` | Pull-based auto-update via Task Scheduler |
| `docs/frontend-structure.md` | React module/registry architecture |
| `SAM_PLAYGROUND_SPEC.md` | SAM3 playground feature spec |
