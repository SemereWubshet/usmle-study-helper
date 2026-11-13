import { useState, useEffect, useCallback, useRef } from 'react'
import {
  fetchUpdaterCheck,
  triggerEngineUpdate,
  fetchUpdaterStatus,
  checkEngineHealth,
  setEngineUpdatingState,
  type UpdateCheckResponse,
  type UpdateProgressResponse,
} from '../api'

function parseSemver(v: string): number[] {
  return v
    .replace(/^[^0-9]*/, '')
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map(n => parseInt(n, 10))
}

function isSameOrNewer(current: string, target: string): boolean {
  const pCurr = parseSemver(current)
  const pTarg = parseSemver(target)
  const len = Math.max(pCurr.length, pTarg.length)
  for (let i = 0; i < len; i++) {
    const a = pCurr[i] ?? 0
    const b = pTarg[i] ?? 0
    if (a > b) return true
    if (a < b) return false
  }
  return true
}

export function useAutoUpdater() {
  const [checkInfo, setCheckInfo] = useState<UpdateCheckResponse | null>(null)
  const [progress, setProgress] = useState<UpdateProgressResponse | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isWaitingForReconnect, setIsWaitingForReconnect] = useState(false)

  const pollingRef = useRef<number | null>(null)
  const reconnectRef = useRef<number | null>(null)
  const latestProgressRef = useRef<UpdateProgressResponse | null>(null)
  const hasTriggeredReloadRef = useRef(false)

  const updateProgress = useCallback((next: UpdateProgressResponse | null | ((prev: UpdateProgressResponse | null) => UpdateProgressResponse | null)) => {
    setProgress(prev => {
      const resolved = typeof next === 'function' ? next(prev) : next
      latestProgressRef.current = resolved
      return resolved
    })
  }, [])

  const stopPolling = useCallback(() => {
    if (pollingRef.current !== null) {
      window.clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  const stopReconnectPolling = useCallback(() => {
    if (reconnectRef.current !== null) {
      window.clearInterval(reconnectRef.current)
      reconnectRef.current = null
    }
  }, [])

  const startReconnectWatcher = useCallback((expectedVersion?: string | null, initialVersion?: string | null) => {
    setIsWaitingForReconnect(true)
    stopReconnectPolling()

    let isCheckingHealth = false
    reconnectRef.current = window.setInterval(async () => {
      if (isCheckingHealth || hasTriggeredReloadRef.current) return
      isCheckingHealth = true
      try {
        const health = await checkEngineHealth()
        if (health.status === 'healthy') {
          const isUpgraded =
            (expectedVersion && isSameOrNewer(health.version, expectedVersion)) ||
            (initialVersion && health.version.replace(/^v/, '') !== initialVersion.replace(/^v/, ''))

          if (!expectedVersion || isUpgraded) {
            hasTriggeredReloadRef.current = true
            stopReconnectPolling()
            setIsWaitingForReconnect(false)
            setEngineUpdatingState(false)
            updateProgress(prev => prev ? { ...prev, phase: 'completed', percent: 100, message: `Updated to v${health.version}! Reloading...` } : null)
            setTimeout(() => {
              window.location.reload()
            }, 600)
          }
        }
      } catch {
        // Engine is still restarting, keep waiting quietly
      } finally {
        isCheckingHealth = false
      }
    }, 700)
  }, [stopReconnectPolling, updateProgress])

  const beginUpdate = useCallback(async (targetVersion?: string, downloadUrl?: string, currentVersion?: string) => {
    setEngineUpdatingState(true)
    hasTriggeredReloadRef.current = false
    try {
      const initialStatus = await triggerEngineUpdate({
        target_version: targetVersion,
        download_url: downloadUrl,
      })
      updateProgress(initialStatus)

      stopPolling()
      let isRequestInFlight = false
      pollingRef.current = window.setInterval(async () => {
        if (isRequestInFlight) return
        isRequestInFlight = true
        try {
          const status = await fetchUpdaterStatus()

          // If the new engine already booted up, its updater status is reset to 'idle'!
          if (status.phase === 'idle') {
            stopPolling()
            startReconnectWatcher(targetVersion, currentVersion)
            return
          }

          updateProgress(status)

          if (status.phase === 'restarting') {
            stopPolling()
            startReconnectWatcher(status.target_version || targetVersion, currentVersion)
          } else if (status.phase === 'completed') {
            stopPolling()
            setEngineUpdatingState(false)
          } else if (status.phase === 'error') {
            stopPolling()
            setEngineUpdatingState(false)
          }
        } catch {
          // If status fetch fails while phase was applying/downloading, engine likely restarted
          const prev = latestProgressRef.current
          if (prev && (prev.phase === 'applying' || prev.phase === 'restarting' || prev.percent >= 95)) {
            stopPolling()
            updateProgress({ ...prev, phase: 'restarting', percent: 100, message: 'Restarting local engine...' })
            startReconnectWatcher(prev.target_version || targetVersion, currentVersion)
          }
        } finally {
          isRequestInFlight = false
        }
      }, 750)
    } catch (err: any) {
      setEngineUpdatingState(false)
      updateProgress({
        phase: 'error',
        downloaded_bytes: 0,
        total_bytes: 0,
        percent: 0,
        speed_mbps: 0,
        message: 'Could not start automatic update.',
        error: err?.message || 'Unknown error',
      })
    }
  }, [stopPolling, startReconnectWatcher, updateProgress])

  useEffect(() => {
    let isMounted = true

    async function checkAndAutoTrigger() {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const simulated = urlParams.get('testUpdate') || localStorage.getItem('usmle_simulate_latest_version')

        const result = await fetchUpdaterCheck(simulated)
        if (!isMounted || !result.update_available) return

        setCheckInfo(result)

        // Automatically start the update when running as a packaged executable (or when simulated)
        if (result.is_frozen || simulated) {
          const comp = result.components[0]
          const mockUrl = localStorage.getItem('usmle_mock_download_url') || urlParams.get('mockUrl')
          const downloadUrl = mockUrl || comp?.download_url
          await beginUpdate(result.latest_version, downloadUrl, result.current_version)
        }
      } catch {
        // Ignore if engine is older and lacks /api/v1/updater/check or user is offline
      }
    }

    checkAndAutoTrigger()

    return () => {
      isMounted = false
      stopPolling()
      stopReconnectPolling()
    }
  }, [beginUpdate, stopPolling, stopReconnectPolling])

  const retryUpdate = useCallback(() => {
    const comp = checkInfo?.components[0]
    beginUpdate(checkInfo?.latest_version, comp?.download_url, checkInfo?.current_version)
  }, [checkInfo, beginUpdate])

  const dismiss = useCallback(() => {
    stopPolling()
    stopReconnectPolling()
    setEngineUpdatingState(false)
    setIsDismissed(true)
  }, [stopPolling, stopReconnectPolling])

  return {
    checkInfo,
    progress,
    isDismissed,
    isWaitingForReconnect,
    retryUpdate,
    dismiss,
  }
}
