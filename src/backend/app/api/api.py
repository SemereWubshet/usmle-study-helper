from fastapi import APIRouter
from app.api.routes.health import router as health_router
from app.api.routes.questions import router as questions_router
from app.api.routes.sessions import router as sessions_router
from app.api.routes.analytics import router as analytics_router
from app.api.routes.encyclopedia import router as encyclopedia_router

api_router = APIRouter()

api_router.include_router(health_router)
api_router.include_router(questions_router)
api_router.include_router(sessions_router)
api_router.include_router(analytics_router)
api_router.include_router(encyclopedia_router)

