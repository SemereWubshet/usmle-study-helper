import os
import re
import sys
from pathlib import Path
from typing import Optional
import httpx

from app.core.config import APP_VERSION, BACKEND_DIR
from app.models.updater import ComponentUpdateManifest, UpdateCheckResponse

GITHUB_REPO = "SemereWubshet/usmle-study-helper"
GITHUB_LATEST_RELEASE_API = f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest"


def parse_semver(version_str: str) -> tuple[int, ...]:
    """Extracts numeric (major, minor, patch) tuple from version string e.g. 'v1.2.0' -> (1, 2, 0)."""
    cleaned = re.sub(r"^[^0-9]*", "", version_str.strip())
    parts = [int(p) for p in re.split(r"[^0-9]+", cleaned) if p.isdigit()]
    return tuple(parts) if parts else (0, 0, 0)


def is_newer_version(latest: str, current: str) -> bool:
    """Returns True if `latest` is strictly newer than `current`."""
    p_latest = parse_semver(latest)
    p_curr = parse_semver(current)
    max_len = max(len(p_latest), len(p_curr))
    for i in range(max_len):
        v1 = p_latest[i] if i < len(p_latest) else 0
        v2 = p_curr[i] if i < len(p_curr) else 0
        if v1 > v2:
            return True
        if v1 < v2:
            return False
    return False


def get_expected_engine_asset_name() -> str:
    """Returns the standalone binary asset name expected in GitHub Releases for the current OS."""
    return "USMLE-Helper.exe" if sys.platform == "win32" else "USMLE-Helper-Linux"


def get_local_binary_path() -> Path:
    """Resolves the path of the running executable (or target binary path in dev mode)."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve()
    bin_name = "USMLE-Helper.exe" if sys.platform == "win32" else "USMLE-Helper"
    return BACKEND_DIR / bin_name


def cleanup_old_updates() -> None:
    """Removes leftover .old or .new update files from previous runs on startup."""
    try:
        exe_path = get_local_binary_path()
        for suffix in (".old", ".new"):
            candidate = exe_path.with_name(exe_path.name + suffix)
            if candidate.exists():
                candidate.unlink(missing_ok=True)
    except Exception:
        pass


def check_for_updates(simulated_version: Optional[str] = None) -> UpdateCheckResponse:
    """Queries GitHub Releases to check if a newer engine version or component is available."""
    is_frozen = getattr(sys, "frozen", False)
    asset_name = get_expected_engine_asset_name()
    default_release_url = f"https://github.com/{GITHUB_REPO}/releases/latest"

    # Allow targeting a specific pre-release tag via query param or USMLE_UPDATE_TAG env var
    target_tag = (simulated_version or os.environ.get("USMLE_UPDATE_TAG", "")).strip()

    try:
        api_url = (
            f"https://api.github.com/repos/{GITHUB_REPO}/releases/tags/{target_tag}"
            if target_tag
            else GITHUB_LATEST_RELEASE_API
        )

        data = None
        try:
            with httpx.Client(timeout=6.0, follow_redirects=True) as client:
                resp = client.get(
                    api_url,
                    headers={"Accept": "application/vnd.github.v3+json", "User-Agent": "USMLE-Study-Helper-Updater"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                elif not target_tag:
                    resp.raise_for_status()
        except Exception:
            if not target_tag:
                raise

        if data:
            latest_tag = data.get("tag_name", target_tag or APP_VERSION)
            clean_latest = latest_tag.lstrip("v")
            release_url = data.get("html_url", default_release_url)

            download_url = f"https://github.com/{GITHUB_REPO}/releases/download/{latest_tag}/{asset_name}"
            size_bytes = None
            for asset in data.get("assets", []):
                if asset.get("name") == asset_name:
                    download_url = asset.get("browser_download_url", download_url)
                    size_bytes = asset.get("size")
                    break
        else:
            # Fallback if a simulated tag doesn't exist as a GitHub Release yet
            latest_tag = target_tag if target_tag.startswith("v") else f"v{target_tag}"
            clean_latest = latest_tag.lstrip("v")
            download_url = f"https://github.com/{GITHUB_REPO}/releases/download/{latest_tag}/{asset_name}"
            size_bytes = None
            release_url = f"https://github.com/{GITHUB_REPO}/releases/tag/{latest_tag}"

        newer = is_newer_version(clean_latest, APP_VERSION)
        components = []
        if newer:
            components.append(
                ComponentUpdateManifest(
                    id="engine",
                    name="Core Desktop Engine",
                    current_version=APP_VERSION,
                    latest_version=clean_latest,
                    asset_name=asset_name,
                    download_url=download_url,
                    size_bytes=size_bytes,
                )
            )

        return UpdateCheckResponse(
            update_available=newer,
            current_version=APP_VERSION,
            latest_version=clean_latest,
            release_url=release_url,
            is_frozen=is_frozen,
            components=components,
        )
    except Exception:
        return UpdateCheckResponse(
            update_available=False,
            current_version=APP_VERSION,
            latest_version=APP_VERSION,
            release_url=default_release_url,
            is_frozen=is_frozen,
            components=[],
        )

