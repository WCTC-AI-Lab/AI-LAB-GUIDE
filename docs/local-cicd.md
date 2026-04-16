# Local CI/CD: Auto-Updating the Lab Machines

Each lab machine runs a **pull-based auto-update**: a Windows Task Scheduler job runs at startup, force-syncs to `origin/master`, bootstraps any missing dependencies, rebuilds the frontend, and restarts the app — all silently in the background.

---

## How It Works

`auto_update.bat` runs these steps in order:

1. **Load secrets** — sources `secrets.bat` (gitignored) for the HuggingFace token.
2. **Git sync** — `git checkout master && git fetch origin master && git reset --hard origin/master`. This forces the local repo to exactly match the remote, discarding any local changes. No merge conflicts possible.
3. **Bootstrap** (first run only, guarded by checks):
   - Creates the Python `venv` if missing
   - Installs PyTorch with CUDA support if `import torch` fails
   - Installs SAM3 from the fork if `import sam3` fails
4. **Rebuild frontend** — `npm install && npm run build`
5. **Update Python deps** — `pip install -r requirements.txt`
6. **Restart app** — `pm2 kill` → `taskkill waitress` → `pm2 start ecosystem.config.js`

All output is redirected to `auto_update.log` in the project root for debugging.

---

## secrets.bat

The HuggingFace token (needed to download SAM3 model weights) lives in a gitignored file at the project root. Create it once on each machine:

```cmd
cd C:\Users\AI-Lab\Desktop\AI-LAB-GUIDE
echo set HF_TOKEN=hf_YOUR_TOKEN_HERE > secrets.bat
```

The `git reset --hard` in the update script will **not** touch this file because it's in `.gitignore`.

---

## Windows Task Scheduler Setup

1. Open **Task Scheduler** from the Start Menu.
2. Click **Create Task...** (not "Create Basic Task").
3. **General tab:**
   - Name: `AI Lab Guide Auto-Updater`
   - Do **NOT** check "Run with highest privileges" — elevated tasks create elevated PM2 daemons, which then reject connections from non-elevated terminals (`EPERM //./pipe/rpc.sock`)
4. **Triggers tab → New:**
   - Begin the task: **At startup**
5. **Actions tab → New:**
   - Action: **Start a program**
   - Program/script: `C:\Users\AI-Lab\Desktop\AI-LAB-GUIDE\auto_update.bat`
   - **Start in:** `C:\Users\AI-Lab\Desktop\AI-LAB-GUIDE`
6. **Conditions tab:**
   - Check **Start only if the following network connection is available → Any connection**
7. **Settings tab:**
   - Check **Allow task to be run on demand**
   - Set **Stop the task if it runs longer than:** `1 hour` (safety net)
8. Save (Windows will prompt for your admin password).

**Enable history** (one-time): In Task Scheduler, click the machine name in the left panel, then **Action → Enable All Tasks History** in the top menu bar.

---

## Testing the Updater

Run the script manually from a terminal:

```cmd
cd C:\Users\AI-Lab\Desktop\AI-LAB-GUIDE
auto_update.bat
```

Then check the log:

```powershell
Get-Content auto_update.log
```

Or trigger it via Task Scheduler: right-click the task → **Run**.

---

## Debugging

| Symptom | Check |
|---|---|
| App not running after reboot | `Get-Content auto_update.log` — look for errors |
| PM2 shows empty process list | See recovery steps in `docs/background-service.md` |
| Git sync failed | Check if network was available at boot; re-run manually |
| SAM3 import fails | Check `secrets.bat` exists and HF token is valid |
| Script seems stuck | Check for orphaned `cmd.exe` holding `auto_update.log` open |

---

## Batch Script Quirks

- Use `cd /d` to change drives.
- Always use `call` before `pip`, `npm`, and `pm2` — they are `.cmd` executables, and without `call`, Windows terminates the entire batch script.
- Avoid Unicode characters in `.bat` files — the Windows command interpreter can't parse them.
- Output redirection (`> file 2>&1`) locks the log file — if a previous run is stuck, the next run can't write to the log.
