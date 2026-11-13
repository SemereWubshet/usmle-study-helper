from fastapi import APIRouter
from app.core.config import APP_VERSION, update_heartbeat

router = APIRouter(tags=["Health & System"])


@router.post("/api/v1/heartbeat")
def heartbeat():
    """Updates the watchdog timestamp to keep the engine running while tabs are active."""
    update_heartbeat()
    return {"status": "alive"}


@router.get("/api/v1/health")
def health_check():
    """Heartbeat endpoint queried by the hosted frontend gate to check engine connectivity."""
    return {
        "status": "healthy",
        "version": APP_VERSION,
        "engine": "USMLE-Study-Helper-Local-Engine"
    }


@router.get("/api/v1/version")
def get_version():
    """Returns the current local engine version."""
    return {
        "version": APP_VERSION,
        "engine": "USMLE-Study-Helper-Local-Engine"
    }


