from pydantic import BaseModel, Field
from typing import List, Optional, Literal

UpdaterPhase = Literal["idle", "checking", "downloading", "extracting", "applying", "restarting", "completed", "error"]


class ComponentUpdateManifest(BaseModel):
    """Schema for an updatable component (engine, datasets, graphdata, certs)."""
    id: str = Field(..., description="Component identifier, e.g., 'engine', 'datasets', 'graphdata'")
    name: str = Field(..., description="Human-readable component name")
    current_version: str
    latest_version: str
    asset_name: str
    download_url: str
    size_bytes: Optional[int] = None


class UpdateCheckResponse(BaseModel):
    """Response returned when checking for available updates."""
    update_available: bool
    current_version: str
    latest_version: str
    release_url: str
    is_frozen: bool = Field(..., description="True when running as a packaged executable")
    components: List[ComponentUpdateManifest] = []


class UpdateStartRequest(BaseModel):
    """Optional payload to trigger update (allows specifying target tag or simulated URL)."""
    target_version: Optional[str] = None
    download_url: Optional[str] = None


class UpdateProgressResponse(BaseModel):
    """Real-time progress status polled by the frontend during an update."""
    phase: UpdaterPhase
    current_component: Optional[str] = None
    downloaded_bytes: int = 0
    total_bytes: int = 0
    percent: float = 0.0
    speed_mbps: float = 0.0
    message: str = ""
    error: Optional[str] = None
    target_version: Optional[str] = None

