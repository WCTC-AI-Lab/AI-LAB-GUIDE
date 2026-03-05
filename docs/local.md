# Local CI/CD: Auto-Updating the Windows App

This document explains our **"pull-based" auto-update mechanism** for automatically updating your Windows application. Instead of pushing updates directly from GitHub Actions, the Windows machine runs a scheduled background task that checks GitHub for updates, pulls new code, and restarts the PM2 service.

---

## The Architecture

- **`auto_update.bat`**: A Windows batch script that checks the remote repository status and safely restarts the environment.
- **Windows Task Scheduler**: Triggers the batch script silently in the background on a set schedule (e.g., daily at 3:00 AM or on system boot).

---

## 1. The Update Script (`auto_update.bat`)

This script should live in the root of your project directory.

### Important Windows Quirks to Remember

- Use `cd /d` to ensure the command prompt changes to the correct drive (e.g., if the script runs from `C:` but the project is on `D:`).
- Always use `call` before executing `pip` and `pm2`. On Windows, these are `.cmd` executables. If you don't use `call`, Windows will terminate the entire batch script as soon as that specific command finishes!

You can find the actual `auto_update.bat` script [here](../auto_update.bat).


## 2. Windows Task Scheduler Setup

To run this script automatically and invisibly (without a popping command prompt window):

1. Open **Task Scheduler** from the Windows Start Menu.
2. Click **Create Task...** (Do **not** use "Create Basic Task").
3. **General Tab**:
    - **Name**: `FlaskApp Auto-Updater`
    - Check **Run whether user is logged on or not** (this makes it run as a hidden background service)
    - Check **Run with highest privileges**
4. **Triggers Tab**:
    - Click **New...**
    - Set to **At startup**
5. **Actions Tab**:
    - Click **New...**
    - **Action**: Start a program
    - **Program/script**: Browse to your `auto_update.bat` file
    - **Crucial Step**: In the “Start in (optional)” field, paste the path to your project folder
6. **Conditions Tab**:
    - Check **Start only if the following network connection is available** > **Any connection**
7. Save the task (Windows will prompt for your administrator password).

---

## 3. Testing the Updater

You can test the pipeline at any time by:

- Opening **Task Scheduler**
- Finding `FlaskApp Auto-Updater` in the Task Scheduler Library list
- Right-clicking it and selecting **Run**
