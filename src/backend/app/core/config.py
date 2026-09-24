import os
import time
import signal
import threading
from contextlib import asynccontextmanager
from fastapi import FastAPI

APP_VERSION = "0.6.0"
MIN_FRONTEND_VERSION = "0.6.0"

LAST_HEARTBEAT = time.time()
WATCHDOG_TIMEOUT_SECONDS = 120
WATCHDOG_GRACE_PERIOD = 120

DEFAULT_HTTP_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/xml, */*",
}



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

