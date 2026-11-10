import { Sparkles, RefreshCw, CheckCircle2, AlertTriangle, ExternalLink, X } from 'lucide-react'
import { useAutoUpdater } from '../hooks/useAutoUpdater'

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 MB'
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function EngineUpdateModal() {
  const { checkInfo, progress, isDismissed, isWaitingForReconnect, retryUpdate, dismiss } = useAutoUpdater()

  if (!checkInfo || !progress || isDismissed) {
    return null
  }

  const isError = progress.phase === 'error'
  const isCompleted = progress.phase === 'completed'
  const isRestarting = progress.phase === 'restarting' || isWaitingForReconnect
  const percent = Math.max(0, Math.min(100, progress.percent || 0))

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="engine-updater-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-[#E3E8E5] dark:border-slate-800 rounded-[28px] shadow-[0_16px_48px_rgba(15,23,42,0.22)] p-6 sm:p-7 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                isError
                  ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                  : isCompleted
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-[#0B7A5A] dark:text-emerald-400'
                  : 'bg-[#E3F2EA] dark:bg-emerald-950/70 border-[#0B7A5A]/20 text-[#0B7A5A] dark:text-emerald-400'
              }`}
            >
              {isError ? (
                <AlertTriangle className="w-6 h-6" />
              ) : isCompleted ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <Sparkles className="w-6 h-6 animate-pulse" />
              )}
            </div>

            <div>
              <h2
                id="engine-updater-title"
                className="font-heading font-medium text-xl text-[#1E2B27] dark:text-white leading-tight"
              >
                {isError
                  ? 'Engine Update Paused'
                  : isCompleted
                  ? `Updated to v${checkInfo.latest_version}`
                  : `Updating to v${checkInfo.latest_version}`}
              </h2>
              <p className="text-xs text-[#4F5C57] dark:text-slate-400 mt-0.5">
                Current version: v{checkInfo.current_version} • 100% study data preserved
              </p>
            </div>
          </div>

          {isError && (
            <button
              type="button"
              onClick={dismiss}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#4F5C57] hover:text-[#1E2B27] dark:hover:text-white hover:bg-[#F2F5F3] dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Progress Bar & Status Details */}
        {!isError && (
          <div className="bg-[#FAF9F6] dark:bg-slate-950/60 border border-[#E3E8E5] dark:border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-[#1E2B27] dark:text-slate-200 flex items-center gap-2">
                {isRestarting && <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0B7A5A] dark:text-emerald-400" />}
                <span>{progress.message || 'Updating local engine...'}</span>
              </span>
              <span className="font-mono text-[#0B7A5A] dark:text-emerald-400 font-semibold">
                {percent.toFixed(0)}%
              </span>
            </div>

            <div className="w-full h-2.5 bg-[#E3E8E5] dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0B7A5A] dark:bg-emerald-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#4F5C57] dark:text-slate-400 font-mono">
              <span>
                {progress.total_bytes > 0
                  ? `${formatBytes(progress.downloaded_bytes)} / ${formatBytes(progress.total_bytes)}`
                  : isRestarting
                  ? 'Applying binary swap...'
                  : 'Preparing download stream...'}
              </span>
              {progress.speed_mbps > 0 && progress.phase === 'downloading' && (
                <span>{progress.speed_mbps.toFixed(1)} MB/s</span>
              )}
            </div>
          </div>
        )}

        {/* Error Fallback UI */}
        {isError && (
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 text-xs text-red-700 dark:text-red-300 leading-relaxed">
              {progress.error || progress.message || 'An unexpected network error occurred while downloading the update.'}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={retryUpdate}
                className="flex-1 min-h-[42px] rounded-full bg-[#0B7A5A] hover:bg-[#09664B] text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Auto-Update</span>
              </button>

              <a
                href={checkInfo.release_url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[42px] px-4 rounded-full border border-[#E3E8E5] dark:border-slate-800 hover:border-[#0B7A5A]/50 text-[#1E2B27] dark:text-slate-200 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Release Page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {!isError && (
          <p className="text-[11px] text-center text-[#4F5C57] dark:text-slate-400">
            Please keep this tab open. Your study session will reload automatically in a moment.
          </p>
        )}
      </div>
    </div>
  )
}

