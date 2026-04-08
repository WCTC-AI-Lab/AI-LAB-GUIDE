# Background Service: Flask + Waitress + PM2

This guide explains how the AI Lab Guide backend runs automatically as a silent background service on each lab Windows machine.

---

## Architecture

- **Flask** — handles API routes and serves the built frontend (`frontend/dist`).
- **Waitress** — production-grade WSGI server wrapping Flask; handles concurrent requests reliably.
- **PM2** — Node.js process manager that keeps the server running permanently:
  - Starts automatically on Windows boot
  - Restarts if it crashes
  - Runs silently in the background with no visible window

---

## Prerequisites

Run `setup.ps1` first to ensure the project venv and all Python dependencies are installed. Then install PM2:

```powershell
npm install -g pm2 pm2-windows-startup
pm2-startup install
```

---

## Starting the Background Service

> **Use `pythonw.exe`, not `python.exe`.**
> `pythonw.exe` is the windowless Python interpreter. Using `python.exe` leaves a persistent terminal window open that cannot be closed without killing the server.

From the project root:

```powershell
pm2 start "C:\Users\AI-Lab\Desktop\AI-LAB-GUIDE\venv\Scripts\pythonw.exe" --name "AILabGuide" -- run_waitress.py
```

Then save the PM2 state so it survives reboots:

```powershell
pm2 save
```

---

## PM2 Cheat Sheet

| Action | Command |
|---|---|
| Check status | `pm2 status` |
| View logs | `pm2 logs AILabGuide` |
| Restart after code change | `pm2 restart AILabGuide` |
| Stop temporarily | `pm2 stop AILabGuide` |
| Remove from PM2 | `pm2 delete AILabGuide` |

---

## Ports

| Service | Port | Notes |
|---|---|---|
| PM2 / Waitress (prod) | 5000 | Set via `PORT=5000` environment variable in PM2 |
| Dev server (dev.ps1) | 5001 | Avoids clashing with prod instance |
| Vite (dev only) | 5173 | Proxies `/api` → 5001 |

To run PM2 on port 5000, set the environment variable in the PM2 start command:

```powershell
pm2 start "...\pythonw.exe" --name "AILabGuide" --env PORT=5000 -- run_waitress.py
```
