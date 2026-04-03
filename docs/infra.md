# Local Windows Deployment Guide: Flask + Waitress + PM2

This guide explains how our local Flask backend is configured to run automatically as a background service on Windows using **PM2**.

---

## Architecture

- **Flask**: Handles API routes and serves the static frontend (`/dist`).
- **Waitress**: A production-grade WSGI server that wraps Flask, handling multiple simultaneous requests reliably.
- **PM2**: A Node.js process manager ensuring the Waitress server:
  - Starts automatically on Windows boot
  - Restarts if it crashes
  - Runs silently in the background

---

## 1. Prerequisites

Ensure the following are installed on your Windows machine:

- **Python 3.x** (with a configured virtual environment)
- **Node.js** & **npm**

Install required Python packages:

```sh
pip install flask waitress
```

---

## 2. Initial Setup (One-Time)

To let PM2 manage startup on Windows:

```sh
npm install -g pm2
npm install -g pm2-windows-startup
pm2-startup install
```

---

## 3. Starting the Background Service

> **CRITICAL:** You must use `pythonw.exe` (windowless Python) instead of `python.exe`.  
> If you use standard `python.exe`, Windows will show a persistent command prompt box that cannot be closed without killing the server.

> **SAM Playground note:** The SAM3 model requires its own Python environment.  
> Use `C:\Users\AI-Lab\Desktop\SAM3\venv\Scripts\pythonw.exe` instead of the project venv's Python.  
> Flask, Waitress, and Ollama have been installed into that environment.

1. Open a terminal and navigate to your project root (where `run_waitress.py` is located).
2. Start the server with PM2 using the SAM3 venv:

```sh
pm2 start "C:\Users\AI-Lab\Desktop\SAM3\venv\Scripts\pythonw.exe" --name "AILabGuide" -- run_waitress.py
```

For quick dev runs (no PM2):
```sh
C:\Users\AI-Lab\Desktop\SAM3\venv\Scripts\python.exe app.py
```

> _Note: If your virtual environment is named differently, adjust the path to `pythonw.exe` accordingly._

3. Lock the current PM2 state so this configuration starts on boot:

```sh
pm2 save
```

---

## 4. PM2 Cheat Sheet

Since the server runs invisibly in the background, use the PM2 CLI for management:

| Action                        | Command                                         |
|-------------------------------|-------------------------------------------------|
| **Check Status**              | `pm2 status`                                    |
| **View Logs**                 | `pm2 logs FlaskBackend`                         |
| **Restart Server**            | `pm2 restart FlaskBackend`                      |
| **Stop Server**               | `pm2 stop FlaskBackend`                         |
| **Remove from PM2**           | `pm2 delete FlaskBackend`                       |

- **Check Status**: See uptime, memory usage, and app status.
- **View Logs**: Read console output (including `print()` statements or Waitress errors).
- **Restart**: Use after code changes or updates to environment variables.
- **Stop**: Temporarily halt the background service.
- **Delete**: Completely remove the app from PM2’s management.
