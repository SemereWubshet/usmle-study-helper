from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import APP_VERSION, lifespan
from app.api.api import api_router

app = FastAPI(
    title="USMLE Study Helper API",
    version=APP_VERSION,
    lifespan=lifespan
)

# Private Network Access (PNA) header for Chromium browsers (Chrome/Edge)
# connecting from remote public origins (https://usmle.semere.dev) to local engine loopback (127.0.0.1)
@app.middleware("http")
async def add_private_network_access_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response

# Dynamic CORS: Allow localhost for dev, loopback domain, and wildcard/remote Vercel origins
# allow_private_network=True is required for Chrome/Edge PNA preflights (OPTIONS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_private_network=True,
)

# Include all modular API routes
app.include_router(api_router)