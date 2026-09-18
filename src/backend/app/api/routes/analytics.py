import sqlite3
from fastapi import APIRouter, Depends
from app.database import get_db
from app.models import DashboardOut
from app.services import analytics as analytics_service

router = APIRouter(tags=["Analytics"])


@router.get("/api/v1/analytics/dashboard", response_model=DashboardOut)
def get_dashboard_stats(db: sqlite3.Connection = Depends(get_db)):
    """Calculates global metrics, pacing, and subject-level readiness."""
    return analytics_service.get_dashboard_stats(db=db)

