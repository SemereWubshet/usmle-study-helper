from fastapi import APIRouter
from app.core.config import APP_VERSION, MIN_FRONTEND_VERSION, update_heartbeat

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
    """Version handshake endpoint to verify compatibility between remote frontend and local engine."""
    return {
        "version": APP_VERSION,
        "min_frontend_version": MIN_FRONTEND_VERSION,
        "engine": "USMLE-Study-Helper-Local-Engine"
    }


