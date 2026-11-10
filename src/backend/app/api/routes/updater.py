from typing import Optional
from fastapi import APIRouter, Query
from app.models.updater import (
    UpdateCheckResponse,
    UpdateStartRequest,
    UpdateProgressResponse,
)
from app.services.updater_service import (
    check_for_updates,
    start_update,
    get_update_progress,
)

router = APIRouter(prefix="/api/v1/updater", tags=["Auto-Updater"])


@router.get("/check", response_model=UpdateCheckResponse)
def check_updater(simulate_version: Optional[str] = Query(default=None)):
    """Checks GitHub Releases for a newer desktop engine or asset version."""
    return check_for_updates(simulated_version=simulate_version)


@router.post("/start", response_model=UpdateProgressResponse)
def trigger_update(payload: Optional[UpdateStartRequest] = None):
    """Triggers the background download, atomic swap, and seamless engine restart."""
    target_ver = payload.target_version if payload else None
    dl_url = payload.download_url if payload else None
    return start_update(target_version=target_ver, custom_download_url=dl_url)


@router.get("/status", response_model=UpdateProgressResponse)
def updater_status():
    """Returns real-time download progress and update phase."""
    return get_update_progress()

