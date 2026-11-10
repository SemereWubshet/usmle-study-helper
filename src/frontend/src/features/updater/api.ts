import { API_BASE_URL, checkEngineHealth, setEngineUpdatingState } from '@/api'

export type UpdaterPhase =
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'extracting'
  | 'applying'
  | 'restarting'
  | 'completed'
  | 'error'

export interface ComponentUpdateManifest {
  id: string
  name: string
  current_version: string
  latest_version: string
  asset_name: string
  download_url: string
  size_bytes?: number | null
}

export interface UpdateCheckResponse {
  update_available: boolean
  current_version: string
  latest_version: string
  release_url: string
  is_frozen: boolean
  components: ComponentUpdateManifest[]
}

export interface UpdateProgressResponse {
  phase: UpdaterPhase
  current_component?: string | null
  downloaded_bytes: number
  total_bytes: number
  percent: number
  speed_mbps: number
  message: string
  error?: string | null
  target_version?: string | null
}

export async function fetchUpdaterCheck(simulateVersion?: string | null): Promise<UpdateCheckResponse> {
  const query = simulateVersion ? `?simulate_version=${encodeURIComponent(simulateVersion)}` : ''
  const res = await fetch(`${API_BASE_URL}/api/v1/updater/check${query}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) {
    throw new Error(`Updater check returned status ${res.status}`)
  }
  return res.json()
}

export async function triggerEngineUpdate(payload?: {
  target_version?: string
  download_url?: string
}): Promise<UpdateProgressResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/updater/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload || {}),
  })
  if (!res.ok) {
    throw new Error(`Updater start returned status ${res.status}`)
  }
  return res.json()
}

export async function fetchUpdaterStatus(): Promise<UpdateProgressResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/updater/status`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(2500),
  })
  if (!res.ok) {
    throw new Error(`Updater status returned status ${res.status}`)
  }
  return res.json()
}

export { checkEngineHealth, setEngineUpdatingState }
