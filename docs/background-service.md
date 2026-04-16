# Background Service: Flask + Waitress + PM2

The AI Lab Guide backend runs as a silent background service on each lab Windows machine using PM2 to manage a Waitress WSGI server.

---

## Architecture

- **Flask** — handles API routes and serves the built frontend (`frontend/dist`).
- **Waitress** — production-grade WSGI server wrapping Flask; handles concurrent requests.
- **PM2** — Node.js process manager that keeps the server running:
  - Starts via `auto_update.bat` (called by Task Scheduler at boot)
  - Restarts if it crashes (`autorestart: true`)
  - Runs silently in the background

Configuration lives in `ecosystem.config.js` at the project root.

---

## Prerequisites

Install PM2 globally (requires Node.js):

```powershell
npm install -g pm2 pm2-windows-startup
pm2-startup install
```

Everything else is handled by `auto_update.bat` on first run.

---

## How PM2 Starts

`auto_update.bat` manages PM2 with a "kill everything, start fresh" approach:

```batch
pm2 kill                              :: tear down any existing daemon
taskkill /F /IM waitress-serve.exe    :: kill orphaned waitress if any
pm2 start ecosystem.config.js         :: start fresh from config
pm2 save                              :: persist for pm2 resurrect
```

This is intentionally aggressive — it handles every known bad state (stale daemon, orphaned processes, corrupted named pipes).

---

## PM2 Cheat Sheet

| Action | Command |
|---|---|
| Check status | `pm2 status` |
| View logs | `pm2 logs AILabGuide` |
| Restart after code change | `pm2 restart AILabGuide` |
| Stop temporarily | `pm2 stop AILabGuide` |
| Remove from PM2 | `pm2 delete AILabGuide` |
| Nuclear reset | `pm2 kill` then `pm2 start ecosystem.config.js` |

---

## Ports

| Service | Port | Notes |
|---|---|---|
| PM2 / Waitress (prod) | 5000 | Configured in `ecosystem.config.js` |
| Dev server (`dev.ps1`) | 5001 | Avoids clashing with prod instance |
| Vite (dev only) | 5173 | Proxies `/api` → 5001 |

---

## Recovering a Broken PM2

If PM2 is stuck, showing empty process lists, or the app isn't responding, run these commands in order:

```powershell
# 1. Kill the PM2 daemon (may hang 60-90s if daemon is stuck — that's fine)
pm2 kill

# 2. If pm2 kill hangs forever, Ctrl+C and force-kill all node/waitress processes:
taskkill /F /IM waitress-serve.exe
# Find the PM2 daemon PID:
Get-Content $env:USERPROFILE\.pm2\pm2.pid
# Kill it:
taskkill /F /PID <the_pid>

# 3. Clear stale PM2 state files
Remove-Item $env:USERPROFILE\.pm2\dump.pm2 -ErrorAction SilentlyContinue
Remove-Item $env:USERPROFILE\.pm2\pm2.pid -ErrorAction SilentlyContinue

# 4. Start fresh
cd C:\Users\AI-Lab\Desktop\AI-LAB-GUIDE
pm2 start ecosystem.config.js
pm2 save

# 5. Verify
pm2 status
# Should show AILabGuide as "online"
```

If the machine is completely hosed, see the **Fresh Install** section in the README.
