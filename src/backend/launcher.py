"""
USMLE Study Helper - Desktop Engine Launcher
=============================================
This launcher starts the FastAPI engine on 127.0.0.1:8000 and automatically opens
the student's default browser to the study application gate.
"""

import os
import sys
import time
import webbrowser
import threading
from pathlib import Path

# Resolve root directory (handles both normal Python and PyInstaller --onefile / --onedir)
if getattr(sys, 'frozen', False):
    APP_DIR = Path(sys.executable).resolve().parent
else:
    APP_DIR = Path(__file__).resolve().parent

# Ensure the app package is on sys.path
sys.path.insert(0, str(APP_DIR))

import uvicorn
from app.database import init_profile_db

DEFAULT_WEB_URL = os.environ.get("USMLE_WEB_URL", "https://usmle.semere.dev:8000")
HOST = os.environ.get("USMLE_HOST", "127.0.0.1")
PORT = int(os.environ.get("USMLE_PORT", "8000"))

# Check for SSL certificates in certs/ directory
CERTS_DIR = APP_DIR / "certs"
SSL_CERT = CERTS_DIR / "cert.pem"
SSL_KEY = CERTS_DIR / "key.pem"

def open_browser():
    """Wait for FastAPI server to bind port and launch student browser."""
    time.sleep(1.2)
    # When students launch the engine, open the hosted frontend gate automatically
    url = os.environ.get("USMLE_FRONTEND_URL", "https://usmle.semere.dev")
    print(f"[Launcher] Opening web browser to {url}...")
    try:
        webbrowser.open(url)
    except Exception as e:
        print(f"[Launcher] Could not launch browser automatically: {e}")

def main():
    print("=" * 60)
    print("  USMLE Study Helper - Local Engine")
    print(f"  Directory: {APP_DIR}")
    print("=" * 60)

    # Guard: Detect if running inside an unextracted zip archive or missing assets
    if getattr(sys, 'frozen', False):
        datasets_dir = APP_DIR / "datasets"
        certs_dir = APP_DIR / "certs"
        if not datasets_dir.exists() or not (datasets_dir / "medmcqa.db").exists():
            print("\n" + "!" * 60)
            print("  ERROR: Required datasets directory not found!")
            print("  Did you extract the ZIP file before running?")
            print("  Please extract the entire USMLEStudyHelper folder, then run.")
            print("!" * 60)
            input("\nPress Enter to exit...")
            sys.exit(1)

    # 1. Initialize local portable profile storage (study.db)
    init_profile_db()

    # 2. Check SSL configuration
    ssl_kwargs = {}
    if SSL_CERT.exists() and SSL_KEY.exists():
        print(f"[Launcher] Enabling HTTPS TLS using certificates in {CERTS_DIR}")
        ssl_kwargs = {
            "ssl_certfile": str(SSL_CERT),
            "ssl_keyfile": str(SSL_KEY)
        }
    else:
        print("[Launcher] WARNING: No TLS certificates found in certs/; running standard HTTP on 127.0.0.1")
        print("[Launcher] Note: Remote HTTPS websites (usmle.semere.dev) require HTTPS loopback.")

    # 3. Launch browser in a background thread
    threading.Thread(target=open_browser, daemon=True).start()

    # 4. Start Uvicorn engine
    from app.main import app
    uvicorn.run(
        app,
        host=HOST,
        port=PORT,
        log_level="info",
        **ssl_kwargs
    )

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        import traceback
        print("\n" + "!" * 60)
        print("  FATAL ERROR OCCURRED WHILE STARTING LOCAL ENGINE:")
        print("!" * 60)
        traceback.print_exc()
        print("\n" + "=" * 60)
        print("Please send a screenshot of this window to the USMLE Study Helper team for assistance.")
        input("\nPress Enter to exit...")
        sys.exit(1)
