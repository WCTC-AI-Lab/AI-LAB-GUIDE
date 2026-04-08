# Local CI/CD: Auto-Updating the Lab Machines

Each lab machine runs a **pull-based auto-update**: a Windows Task Scheduler job wakes up at startup (or on a schedule), checks GitHub for new commits on `master`, pulls them, rebuilds the frontend, updates Python deps, and restarts the PM2 service — all silently in the background.

---

## How It Works

1. `auto_update.bat` fetches the remote `master` branch and counts new commits.
2. If up to date, it exits immediately.
3. If behind, it pulls, runs `npm install && npm run build` in `frontend/`, updates Python deps via `pip install -r requirements.txt`, and restarts PM2.

> **Note:** PyTorch and the `sam3` editable install are set up once via `setup.ps1` and are **not** reinstalled during auto-updates. If either ever needs updating, re-run `setup.ps1` manually.

---

## Windows Task Scheduler Setup

To run `auto_update.bat` silently at startup:

1. Open **Task Scheduler** from the Start Menu.
2. Click **Create Task...** (not "Create Basic Task").
3. **General tab:**
   - Name: `AI Lab Guide Auto-Updater`
   - Check **Run whether user is logged on or not**
   - Check **Run with highest privileges**
4. **Triggers tab → New:**
   - Begin the task: **At startup**
5. **Actions tab → New:**
   - Action: **Start a program**
   - Program/script: browse to `auto_update.bat` in the project root
   - **Start in (optional):** paste the project root path (e.g. `C:\Users\AI-Lab\Desktop\AI-LAB-GUIDE`)
6. **Conditions tab:**
   - Check **Start only if the following network connection is available → Any connection**
7. Save (Windows will prompt for your admin password).

---

## Testing the Updater

At any time you can trigger a manual update run:

1. Open **Task Scheduler**
2. Find `AI Lab Guide Auto-Updater` in the library
3. Right-click → **Run**

Or just run the script directly from a terminal:

```cmd
cd C:\Users\AI-Lab\Desktop\AI-LAB-GUIDE
auto_update.bat
```

---

## Windows Batch Quirks (for reference)

- Use `cd /d` to change drives (e.g. if the script runs from `C:` but the project is on `D:`).
- Always use `call` before `pip` and `pm2` — they are `.cmd` executables, and without `call`, Windows terminates the entire batch script as soon as that command finishes.
