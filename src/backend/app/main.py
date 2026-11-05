from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.types import ASGIApp, Scope, Receive, Send
from app.core.config import APP_VERSION, lifespan
from app.api.api import api_router

app = FastAPI(
    title="USMLE Study Helper API",
    version=APP_VERSION,
    lifespan=lifespan
)

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

# Universal Private Network Access (PNA) ASGI middleware
# Wraps outermost to guarantee Access-Control-Allow-Private-Network: true is injected
# into EVERY HTTP response (including preflight OPTIONS, errors, and standard endpoints)
# for Chromium browsers (Chrome/Brave/Edge) accessing 127.0.0.1 from public origins.
class UniversalPrivateNetworkAccessMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                has_pna = any(k.lower() == b"access-control-allow-private-network" for k, _ in headers)
                if not has_pna:
                    headers.append((b"access-control-allow-private-network", b"true"))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_wrapper)

app.add_middleware(UniversalPrivateNetworkAccessMiddleware)

# Include all modular API routes
app.include_router(api_router)