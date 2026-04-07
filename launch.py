"""
StudentTrack Launcher
─────────────────────
Double-click this file (or run: python3 launch.py) to start the app.
The browser opens automatically at http://localhost:8000

DATA PORTABILITY
  All data lives in the  data/  folder (database + uploaded files).
  To move to another computer: copy the entire project folder.
  To restore on a new machine: just copy and run this launcher.
"""

import os
import sys
import time
import shutil
import subprocess
import threading
import webbrowser

BASE  = os.path.dirname(os.path.abspath(__file__))
DIST  = os.path.join(BASE, "frontend", "dist")
BACK  = os.path.join(BASE, "backend")
DATA  = os.path.join(BASE, "data")
PORT  = 8000
URL   = f"http://localhost:{PORT}"

def find_npm():
    for candidate in [
        "/tmp/node-v20.15.0-darwin-arm64/bin/npm",
        shutil.which("npm"),
        shutil.which("npm.cmd"),
    ]:
        if candidate and os.path.exists(candidate):
            return candidate
    return None

def find_node():
    for candidate in [
        "/tmp/node-v20.15.0-darwin-arm64/bin/node",
        shutil.which("node"),
        shutil.which("node.exe"),
    ]:
        if candidate and os.path.exists(candidate):
            return candidate
    return None

def build_frontend():
    npm = find_npm()
    node = find_node()
    if not npm or not node:
        print("⚠  Node.js not found — skipping frontend build.")
        print("   Download Node.js from https://nodejs.org and re-run.")
        return False

    fe_dir = os.path.join(BASE, "frontend")
    node_dir = os.path.dirname(node)
    env = dict(os.environ)
    env["PATH"] = node_dir + os.pathsep + env.get("PATH", "")

    # Install deps if needed
    node_modules = os.path.join(fe_dir, "node_modules")
    if not os.path.exists(node_modules):
        print("📦 Installing frontend dependencies (first run)…")
        subprocess.run([npm, "install"], cwd=fe_dir, env=env, check=True)

    print("🔨 Building frontend…")
    vite = os.path.join(fe_dir, "node_modules", ".bin", "vite")
    subprocess.run([node, vite, "build"], cwd=fe_dir, env=env, check=True)
    print("✅ Frontend built.")
    return True

def open_browser():
    time.sleep(2.5)
    webbrowser.open(URL)

def main():
    print("=" * 50)
    print("  StudentTrack — Internship Manager")
    print("=" * 50)

    os.makedirs(DATA, exist_ok=True)

    # Build frontend if dist is missing
    if not os.path.isdir(DIST) or not os.listdir(DIST):
        print("\n📁 Frontend not built yet. Building now…\n")
        ok = build_frontend()
        if not ok:
            print("\n  You can still use the API at http://localhost:8000/docs")

    # Open browser in background
    threading.Thread(target=open_browser, daemon=True).start()

    # Start backend
    print(f"\n🚀 Starting server at {URL}\n   Press Ctrl+C to stop.\n")
    os.chdir(BACK)
    subprocess.run(
        [sys.executable, "-m", "uvicorn", "main:app",
         "--host", "0.0.0.0", "--port", str(PORT)],
    )

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nStopped. Goodbye!")
