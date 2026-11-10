import os
import sys
import time
import signal
import subprocess
import threading
from typing import Optional
import httpx

from app.models.updater import UpdateProgressResponse
from app.services.updater_manifest import (
    check_for_updates,
    cleanup_old_updates,
    get_local_binary_path,
)

# Re-export for clean external imports
__all__ = [
    "check_for_updates",
    "cleanup_old_updates",
    "get_update_progress",
    "start_update",
]

# Global thread-safe progress state
_state_lock = threading.Lock()
_progress_state = UpdateProgressResponse(phase="idle", message="Ready")
_is_updating = False


def get_update_progress() -> UpdateProgressResponse:
    """Returns a snapshot of the current update progress."""
    with _state_lock:
        return _progress_state.model_copy()


def _set_progress(**kwargs) -> None:
    global _progress_state
    with _state_lock:
        updated = _progress_state.model_dump()
        updated.update(kwargs)
        _progress_state = UpdateProgressResponse(**updated)


def _get_clean_spawn_env() -> dict[str, str]:
    """Returns a copy of os.environ configured with PYINSTALLER_RESET_ENVIRONMENT=1 so child --onefile binaries unpack cleanly."""
    env = os.environ.copy()
    # Official PyInstaller 6.x flag: forces the child --onefile bootloader to ignore the parent's
    # _PYI_APPLICATION_HOME_DIR and unpack its own fresh temporary environment.
    env["PYINSTALLER_RESET_ENVIRONMENT"] = "1"
    for key in list(env.keys()):
        if key.startswith("_PYI_") or key in ("_MEIPASS", "_MEIPASS2", "PYTHONPATH", "PYTHONHOME"):
            env.pop(key, None)
    # Restore original LD_LIBRARY_PATH if PyInstaller backed it up, otherwise remove it
    if "LD_LIBRARY_PATH_ORIG" in os.environ:
        env["LD_LIBRARY_PATH"] = os.environ["LD_LIBRARY_PATH_ORIG"]
    else:
        env.pop("LD_LIBRARY_PATH", None)
    return env


def _download_and_apply_worker(target_version: str, download_url: str) -> None:
    """Background worker that streams the update binary, swaps executables atomically, and restarts."""
    global _is_updating
    exe_path = get_local_binary_path()
    new_path = exe_path.with_name(exe_path.name + ".new")
    old_path = exe_path.with_name(exe_path.name + ".old")

    try:
        _set_progress(
            phase="downloading",
            current_component="Core Desktop Engine",
            downloaded_bytes=0,
            total_bytes=0,
            percent=0.0,
            speed_mbps=0.0,
            message=f"Downloading USMLE Engine v{target_version}...",
            error=None,
            target_version=target_version,
        )

        start_time = time.time()
        downloaded = 0

        with httpx.Client(timeout=60.0, follow_redirects=True) as client:
            with client.stream("GET", download_url, headers={"User-Agent": "USMLE-Study-Helper-Updater"}) as resp:
                resp.raise_for_status()
                total = int(resp.headers.get("content-length", 0))
                _set_progress(total_bytes=total)

                last_update_ts = 0.0
                with open(new_path, "wb") as f:
                    for chunk in resp.iter_bytes(chunk_size=65536):
                        if not chunk:
                            continue
                        f.write(chunk)
                        downloaded += len(chunk)
                        now = time.time()
                        if now - last_update_ts >= 0.15 or downloaded == total:
                            last_update_ts = now
                            elapsed = max(0.001, now - start_time)
                            speed = (downloaded / (1024 * 1024)) / elapsed
                            pct = round((downloaded / total) * 100, 1) if total > 0 else 50.0
                            _set_progress(
                                downloaded_bytes=downloaded,
                                percent=min(99.9, pct),
                                speed_mbps=round(speed, 2),
                            )

        if not new_path.exists() or new_path.stat().st_size < 1024:
            raise RuntimeError("Downloaded update binary appears incomplete or corrupted.")

        _set_progress(
            phase="applying",
            percent=100.0,
            message=f"Installing update v{target_version}...",
        )

        if not sys.platform.startswith("win"):
            new_path.chmod(0o755)

        # Atomic swap (Windows allows renaming a currently running .exe)
        if old_path.exists():
            old_path.unlink(missing_ok=True)
        if exe_path.exists():
            exe_path.rename(old_path)
        new_path.rename(exe_path)

        _set_progress(
            phase="restarting",
            percent=100.0,
            message="Restarting engine with updated version...",
        )

        time.sleep(1.2)

        if getattr(sys, "frozen", False):
            spawn_args = [str(exe_path), "--no-browser"]
            clean_env = _get_clean_spawn_env()
            subprocess.Popen(
                spawn_args,
                cwd=str(exe_path.parent),
                env=clean_env,
                **(
                    {"creationflags": getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0x00000200)}
                    if sys.platform == "win32"
                    else {"start_new_session": True}
                ),
            )
            time.sleep(0.3)
            os._exit(0)
        else:
            _set_progress(
                phase="completed",
                message="Update downloaded cleanly (dev mode - manual restart required).",
            )
    except Exception as exc:
        if new_path.exists():
            new_path.unlink(missing_ok=True)
        _set_progress(
            phase="error",
            message="Failed to install automatic update.",
            error=str(exc),
        )
    finally:
        _is_updating = False


def start_update(target_version: Optional[str] = None, custom_download_url: Optional[str] = None) -> UpdateProgressResponse:
    """Initiates the non-blocking background update workflow."""
    global _is_updating
    with _state_lock:
        if _is_updating:
            return _progress_state.model_copy()

    if not target_version or not custom_download_url:
        check = check_for_updates(simulated_version=target_version)
        if not check.components:
            _set_progress(
                phase="error",
                message="No update asset found for your platform.",
                error="Release binary not yet available on GitHub Releases.",
            )
            return get_update_progress()
        engine_comp = check.components[0]
        target_version = engine_comp.latest_version
        custom_download_url = custom_download_url or engine_comp.download_url

    with _state_lock:
        _is_updating = True

    worker = threading.Thread(
        target=_download_and_apply_worker,
        args=(target_version, custom_download_url),
        daemon=True,
    )
    worker.start()
    time.sleep(0.05)
    return get_update_progress()
