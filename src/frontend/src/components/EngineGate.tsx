import { useState, useEffect, type ReactNode } from 'react'
import { checkEngineHealth, API_BASE_URL, type EngineHealth } from '../api'
import { Laptop, Download, RefreshCw, ShieldCheck } from 'lucide-react'
import { EngineGatePreview } from './EngineGatePreview'

interface EngineGateProps {
  children: ReactNode
}

export default function EngineGate({ children }: EngineGateProps) {
  const [health, setHealth] = useState<EngineHealth | null>(null)
  const [checking, setChecking] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isPreviewSidebarOpen, setIsPreviewSidebarOpen] = useState(false)

  // Detect user's Operating System
  const userOS = (() => {
    if (typeof window === 'undefined') return 'windows'
    const ua = window.navigator.userAgent.toLowerCase()
    if (ua.includes('linux')) return 'linux'
    if (ua.includes('mac')) return 'mac'
    return 'windows'
  })()

  const downloadUrl = userOS === 'linux'
    ? 'https://github.com/SemereWubshet/usmle-study-helper/releases/latest/download/USMLEStudyHelper-Linux.tar.gz'
    : 'https://github.com/SemereWubshet/usmle-study-helper/releases/latest/download/USMLEStudyHelper-Windows.zip'

  const downloadLabel = userOS === 'linux'
    ? 'Download for Linux (.tar.gz)'
    : 'Download for Windows (.zip)'

  const binaryName = userOS === 'linux' ? 'USMLE-Helper' : 'USMLE-Helper.exe'

  const verifyEngine = async () => {
    setChecking(true)
    setHasError(false)
    try {
      const res = await checkEngineHealth()
      if (res.status === 'healthy') {
        setHealth(res)
      } else {
        setHasError(true)
      }
    } catch {
      setHasError(true)
      setHealth(null)
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    const handleDisconnect = () => {
      setHealth(null)
      setHasError(true)
    }
    window.addEventListener('engine-disconnected', handleDisconnect)
    return () => window.removeEventListener('engine-disconnected', handleDisconnect)
  }, [])

  useEffect(() => {
    // If we are already connected and healthy, do NOT poll anymore
    if (health) return

    verifyEngine()

    // Poll every 4 seconds ONLY while waiting for engine to start
    const interval = setInterval(async () => {
      try {
        const res = await checkEngineHealth()
        if (res.status === 'healthy') {
          setHealth(res)
          setHasError(false)
        }
      } catch {
        // Still offline, continue waiting silently
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [health])

  useEffect(() => {
    if (!health) return

    const sendHeartbeat = () => {
      fetch(`${API_BASE_URL}/api/v1/heartbeat`, { method: 'POST' }).catch(() => {})
    }

    // Send an immediate heartbeat upon connecting
    sendHeartbeat()

    // Send a heartbeat periodically while this tab is open (every 30 seconds)
    const interval = setInterval(sendHeartbeat, 30000)

    // Immediately refresh the watchdog whenever the user focuses or returns to the tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat()
      }
    }

    window.addEventListener('focus', sendHeartbeat)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', sendHeartbeat)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [health])

  if (checking && !health) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative flex items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600/10 dark:bg-emerald-500/10 flex items-center justify-center animate-pulse">
              <Laptop className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="font-semibold text-slate-800 dark:text-slate-200">Connecting to Local Study Engine...</p>
            <p className="text-xs text-slate-500">Checking loopback connection at {API_BASE_URL || 'http://127.0.0.1:8000'}</p>
          </div>
        </div>
      </div>
    )
  }

  // Engine is offline -> Render friendly download & setup screen with Live UI Showcase
  if (hasError || !health) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#FAF9F6] dark:bg-slate-950 p-4 sm:p-6 lg:p-10 transition-all duration-300">
        <div className={`w-full ${isPreviewSidebarOpen ? 'max-w-7xl' : 'max-w-6xl'} grid grid-cols-1 lg:grid-cols-12 gap-8 items-center transition-all duration-300`}>
          
          {/* LEFT COLUMN: Setup & Download Card */}
          <div className={`${isPreviewSidebarOpen ? 'lg:col-span-4' : 'lg:col-span-5'} w-full transition-all duration-300`}>
            <div className="w-full bg-white dark:bg-slate-900 border border-[#E3E8E5] dark:border-slate-800 shadow-[0_4px_24px_rgba(30,43,39,0.06)] rounded-[32px] p-6 sm:p-8 space-y-6">
              <div className="text-center space-y-3">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-[#E3F2EA] dark:bg-emerald-950/50 flex items-center justify-center border border-[#0B7A5A]/20">
                  <Laptop className="w-7 h-7 text-[#0B7A5A] dark:text-emerald-400" />
                </div>
                <div>
                  <h1 className="font-heading font-medium text-2xl sm:text-[28px] text-[#1E2B27] dark:text-white leading-tight">
                    Local Engine Not Detected
                  </h1>
                  <p className="text-[14px] text-[#4F5C57] dark:text-slate-400 mt-2 leading-relaxed">
                    Your USMLE questions and study statistics stay 100% private and offline on your computer.
                  </p>
                </div>
              </div>

              {/* 2-Step Quick Setup Card */}
              <div className="bg-[#FAF9F6] dark:bg-slate-950/60 border border-[#E3E8E5] dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5">
                <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#4F5C57] dark:text-slate-400">
                  Quick 2-Step Setup
                </div>
                <div className="flex items-start gap-3 text-[14px] text-[#1E2B27] dark:text-slate-200">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#E3F2EA] dark:bg-emerald-950/80 text-[#0B5F46] dark:text-emerald-300 text-xs font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <p className="leading-snug">
                    Download and extract the portable <strong className="font-semibold text-[#1E2B27] dark:text-white">USMLEStudyHelper</strong> package.
                  </p>
                </div>
                <div className="flex items-start gap-3 text-[14px] text-[#1E2B27] dark:text-slate-200">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#E3F2EA] dark:bg-emerald-950/80 text-[#0B5F46] dark:text-emerald-300 text-xs font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <p className="leading-snug">
                    Double-click <code className="font-mono text-xs bg-[#EDF0EE] dark:bg-slate-800 px-1.5 py-0.5 rounded text-[#1E2B27] dark:text-slate-200">{binaryName}</code> to launch your local engine.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-h-[46px] rounded-full bg-[#0B7A5A] hover:bg-[#09664B] dark:bg-[#0B7A5A] dark:hover:bg-[#09664B] text-white font-semibold text-[14px] shadow-[0_2px_10px_rgba(11,122,90,0.28)] flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{downloadLabel}</span>
                  </a>
                  <button
                    type="button"
                    onClick={verifyEngine}
                    disabled={checking}
                    className="min-h-[46px] px-5 rounded-full border border-[#E3E8E5] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#1E2B27] dark:text-slate-200 hover:border-[#0B7A5A]/50 text-[14px] font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                    <span>Retry</span>
                  </button>
                </div>

                <div className="text-center pt-1">
                  <a 
                    href="https://github.com/SemereWubshet/usmle-study-helper/releases/latest" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-[#0B7A5A] dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    Looking for other operating systems? View downloads on GitHub &rarr;
                  </a>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#4F5C57] dark:text-slate-400 pt-4 border-t border-[#E3E8E5] dark:border-slate-800">
                <div className="flex items-center gap-1.5 font-medium text-[#0B5F46] dark:text-emerald-300">
                  <ShieldCheck className="w-4 h-4 text-[#0B7A5A] dark:text-emerald-400" />
                  <span>Zero cloud tracking</span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#EDF0EE] dark:bg-slate-800 text-[#4F5C57] dark:text-slate-400">
                  {API_BASE_URL || '127.0.0.1:8000'}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Realistic Live UI Preview (7 cols by default, 8 cols when sidebar open) */}
          <div className={`${isPreviewSidebarOpen ? 'lg:col-span-8' : 'lg:col-span-7'} w-full flex flex-col space-y-3 transition-all duration-300`}>
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Application Preview
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Explore how your study helper looks once your local engine is running.
                </p>
              </div>
            </div>

            <EngineGatePreview 
              isSidebarOpen={isPreviewSidebarOpen} 
              onToggleSidebar={() => setIsPreviewSidebarOpen(prev => !prev)} 
            />
          </div>

        </div>
      </div>
    )
  }

  // Engine is healthy -> Render the app normally!
  return <>{children}</>
}
