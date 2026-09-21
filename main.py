#!/usr/bin/env python3
"""
MOTION PULSE SAMPLE SPACE
"LISTEN BEFORE RELEASE."

Main Python application launcher.
Starts the Motion Pulse Sample Space web application.
"""

import os
import sys
import time
import shutil
import signal
import webbrowser
import subprocess
import argparse
from pathlib import Path

if sys.platform == "win32":
    import io
    if hasattr(sys.stdout, "buffer"):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "buffer"):
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

APP_DIR = Path(__file__).parent.resolve()
DEFAULT_PORT = 3000

BANNER = r"""
================================================================================
  M O T I O N   P U L S E
  S A M P L E   S P A C E
  "LISTEN BEFORE RELEASE."
  Private Audio Preview Platform - Motion Pulse India
================================================================================
"""

def find_node_environment():
    """Locate node and npm binaries, checking PATH and common local install locations."""
    # First check standard PATH
    node_bin = shutil.which("node")
    npm_bin = shutil.which("npm") or shutil.which("npm.cmd")

    if node_bin and npm_bin:
        return Path(node_bin).parent, node_bin, npm_bin

    # Search common Windows user directories
    local_app_data = os.environ.get("LOCALAPPDATA", "")
    user_profile = os.environ.get("USERPROFILE", "")
    program_files = os.environ.get("ProgramFiles", "C:\\Program Files")

    search_dirs = [
        Path(local_app_data) / "nodejs" / "node-v20.18.0-win-x64",
        Path(local_app_data) / "Programs" / "nodejs",
        Path(program_files) / "nodejs",
        Path(user_profile) / "AppData" / "Local" / "nodejs" / "node-v20.18.0-win-x64",
    ]

    for d in search_dirs:
        if d.is_dir():
            n = d / "node.exe"
            npm = d / "npm.cmd"
            if n.exists() and npm.exists():
                # Add to current environment PATH
                os.environ["PATH"] = f"{d};{os.environ.get('PATH', '')}"
                return d, str(n), str(npm)

    return None, node_bin, npm_bin


def check_dependencies(npm_bin):
    """Ensure node_modules are installed."""
    node_modules = APP_DIR / "node_modules"
    if not node_modules.exists():
        print("[*] Installing project dependencies (npm install)...")
        res = subprocess.run([npm_bin, "install"], cwd=str(APP_DIR))
        if res.returncode != 0:
            print("[!] npm install failed. Please check your network connection.")
            sys.exit(1)
        print("[+] Dependencies successfully installed.\n")


def ensure_build(npm_bin, force_rebuild=False):
    """Ensure production build exists before starting production server."""
    next_build = APP_DIR / ".next"
    if force_rebuild or not next_build.exists():
        print("[*] Building production assets (npm run build)...")
        res = subprocess.run([npm_bin, "run", "build"], cwd=str(APP_DIR))
        if res.returncode != 0:
            print("[!] Build failed.")
            sys.exit(1)
        print("[+] Production build ready.\n")


def main():
    parser = argparse.ArgumentParser(
        description="Motion Pulse Sample Space - Application Server"
    )
    parser.add_argument(
        "--port", "-p", type=int, default=DEFAULT_PORT, help="Port to bind (default: 3000)"
    )
    parser.add_argument(
        "--dev", action="store_true", help="Start development server with hot-reloading"
    )
    parser.add_argument(
        "--build", action="store_true", help="Force rebuild before starting server"
    )
    parser.add_argument(
        "--no-browser", action="store_true", help="Do not automatically open browser"
    )

    args = parser.parse_args()

    print(BANNER)

    # 1. Check Node.js and npm
    bin_dir, node_bin, npm_bin = find_node_environment()
    if not node_bin or not npm_bin:
        print("[!] Error: Node.js runtime not found.")
        print("    Please install Node.js 18+ or run the bundled portable environment.")
        sys.exit(1)

    print(f"[+] Runtime: Node.js ({node_bin})")
    print(f"[+] Workspace: {APP_DIR}")

    # 2. Check dependencies
    check_dependencies(npm_bin)

    # 3. Build or Dev mode
    port = args.port
    server_url = f"http://localhost:{port}"

    if args.dev:
        print(f"[*] Starting DEVELOPMENT server on port {port}...")
        cmd = [npm_bin, "run", "dev", "--", "-p", str(port)]
    else:
        ensure_build(npm_bin, force_rebuild=args.build)
        print(f"[*] Starting PRODUCTION server on port {port}...")
        cmd = [npm_bin, "run", "start", "--", "-p", str(port)]

    # 4. Launch server process
    process = subprocess.Popen(
        cmd,
        cwd=str(APP_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    def cleanup(sig=None, frame=None):
        print("\n[*] Stopping Motion Pulse Sample Space...")
        if process.poll() is None:
            # Terminate process tree on Windows
            if sys.platform == "win32":
                subprocess.run(
                    ["taskkill", "/F", "/T", "/PID", str(process.pid)],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
            else:
                process.terminate()
        print("[+] Application stopped cleanly.")
        sys.exit(0)

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    # 5. Monitor output and open browser once ready
    browser_opened = False

    print("\n--------------------------------------------------------------------------------")
    print(f"  [>] Portal:          {server_url}")
    print(f"  [>] Admin Dashboard: {server_url}/admin")
    print(f"      Credentials:     admin@motionpulse.local / motionpulse-demo")
    print(f"  [>] Demo Sample:     {server_url}/listen/MP-ELEEVZQB")
    print("--------------------------------------------------------------------------------")
    print("Press Ctrl+C to terminate the server.\n")

    try:
        while True:
            line = process.stdout.readline()
            if not line:
                if process.poll() is not None:
                    break
                time.sleep(0.1)
                continue

            print(line, end="")

            if not browser_opened and not args.no_browser:
                if "Ready in" in line or "compiled client and server successfully" in line:
                    time.sleep(0.5)
                    webbrowser.open(server_url)
                    browser_opened = True

    except KeyboardInterrupt:
        cleanup()

    return process.poll() or 0


if __name__ == "__main__":
    sys.exit(main())
