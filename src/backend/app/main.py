from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import APP_VERSION, lifespan
from app.api.api import api_router

app = FastAPI(
    title="USMLE Study Helper API",
    version=APP_VERSION,
    lifespan=lifespan
)

# Dynamic CORS: Allow localhost for dev, loopback domain, and wildcard/remote Vercel origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all modular API routes
app.include_router(api_router)