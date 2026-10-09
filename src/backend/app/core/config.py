import os
import sys
import time
import signal
import threading
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI

APP_VERSION = "0.8.0"
MIN_FRONTEND_VERSION = "0.8.0"

LAST_HEARTBEAT = time.time()
WATCHDOG_TIMEOUT_SECONDS = 120
WATCHDOG_GRACE_PERIOD = 120

DEFAULT_HTTP_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/xml, */*",
}

# Resolve backend root directory
if getattr(sys, 'frozen', False):
    BACKEND_DIR = Path(sys.executable).resolve().parent
    REPO_ROOT = BACKEND_DIR
else:
    BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
    REPO_ROOT = BACKEND_DIR.parent.parent


def load_local_api_key() -> str:
    """
    Safely retrieves the OpenRouter API key.
    Checks in order:
    1. Environment variable: OPENROUTER_API_KEY
    2. Local file in backend dir: api_key.txt or api_key.env or .env
    3. Local file in repo root: api_key.txt or .env
    """
    env_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if env_key:
        return env_key

    candidate_files = [
        BACKEND_DIR / "api_key.txt",
        BACKEND_DIR / "api_key.env",
        BACKEND_DIR / ".env",
        REPO_ROOT / "api_key.txt",
        REPO_ROOT / ".env",
    ]

    for fpath in candidate_files:
        if fpath.exists() and fpath.is_file():
            try:
                for line in fpath.read_text(encoding="utf-8").splitlines():
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if line.startswith("OPENROUTER_API_KEY="):
                        key = line.split("=", 1)[1].strip().strip('"').strip("'")
                        if key:
                            return key
                    elif line.startswith("sk-or-"):
                        return line
            except Exception:
                pass

    return ""


OPENROUTER_API_KEY = load_local_api_key()
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
PRIMARY_CLUE_MODEL = "inclusionai/ling-3.0-flash-sante:free"
FALLBACK_CLUE_MODELS = [
    "mistralai/mistral-small-24b-instruct-2501:free",
    "openrouter/auto:free",
]

# Unified Pruned Clinical Knowledge Graph Package
GRAPHDATA_DIR = BACKEND_DIR / "graphdata"
if not GRAPHDATA_DIR.exists() and (BACKEND_DIR / "_internal" / "graphdata").exists():
    GRAPHDATA_DIR = BACKEND_DIR / "_internal" / "graphdata"

USMLE_CLINICAL_GRAPH_PATH = GRAPHDATA_DIR / "usmle_clinical_graph.pkl"


def update_heartbeat():
    """Updates the last heartbeat timestamp to prevent watchdog shutdown."""
    global LAST_HEARTBEAT
    LAST_HEARTBEAT = time.time()


def watchdog_worker():
    """Background thread that cleanly shuts down the engine if all browser tabs are closed."""
    time.sleep(WATCHDOG_GRACE_PERIOD)
    while True:
        time.sleep(15)
        idle_time = time.time() - LAST_HEARTBEAT
        if idle_time > WATCHDOG_TIMEOUT_SECONDS:
            print(f"[Watchdog] No active browser tabs detected for {int(idle_time)}s. Shutting down cleanly...")
            os.kill(os.getpid(), signal.SIGINT)
            break


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan context manager handling watchdog startup and shutdown."""
    thread = threading.Thread(target=watchdog_worker, daemon=True)
    thread.start()
    yield
