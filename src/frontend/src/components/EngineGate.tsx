import { useState, useEffect, type ReactNode } from 'react'
import { checkEngineHealth, API_BASE_URL, type EngineHealth } from '../api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
    // Send an immediate heartbeat upon connecting
    fetch(`${API_BASE_URL}/api/v1/heartbeat`, { method: 'POST' }).catch(() => {})
    // Send a heartbeat periodically while this tab is open
    const interval = setInterval(() => {
      fetch(`${API_BASE_URL}/api/v1/heartbeat`, { method: 'POST' }).catch(() => {})
    }, 45000)
    return () => clearInterval(interval)
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
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50/70 dark:bg-slate-950 p-4 sm:p-6 lg:p-10 transition-all duration-300">
        <div className={`w-full ${isPreviewSidebarOpen ? 'max-w-7xl' : 'max-w-6xl'} grid grid-cols-1 lg:grid-cols-12 gap-8 items-center transition-all duration-300`}>
          
          {/* LEFT COLUMN: Setup & Download Card (5 cols by default, 4 cols when sidebar open) */}
          <div className={`${isPreviewSidebarOpen ? 'lg:col-span-4' : 'lg:col-span-5'} w-full transition-all duration-300`}>
            <Card className="w-full border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl overflow-hidden bg-white dark:bg-slate-900">
              <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
              <CardHeader className="text-center pb-2 pt-6">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mb-2 border border-emerald-200/60 dark:border-emerald-800/40">
                  <Laptop className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Local Engine Not Detected
                </CardTitle>
                <CardDescription className="text-slate-500 text-sm mt-1">
                  Your USMLE questions and study statistics stay 100% private on your computer.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6 pt-2 pb-6 px-6">
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Quick 2-Step Setup
                  </p>
                  <div className="flex items-start space-x-3 text-sm text-slate-700 dark:text-slate-300">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold shrink-0">
                      1
                    </span>
                    <p>
                      Download and unzip your portable <span className="font-semibold text-slate-900 dark:text-slate-100">USMLEStudyHelper</span> folder.
                    </p>
                  </div>
                  <div className="flex items-start space-x-3 text-sm text-slate-700 dark:text-slate-300">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold shrink-0">
                      2
                    </span>
                    <p>
                      Double-click <span className="font-mono text-xs bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">{binaryName}</span> to launch the local engine.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      asChild
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 shadow-sm gap-2"
                    >
                      <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4" />
                        {downloadLabel}
                      </a>
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={verifyEngine}
                      disabled={checking}
                      className="rounded-xl h-11 border-slate-300 dark:border-slate-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                      Retry Connection
                    </Button>
                  </div>

                  <div className="text-center">
                    <a 
                      href="https://github.com/SemereWubshet/usmle-study-helper/releases/latest" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                    >
                      Looking for other operating systems? View all downloads on GitHub &rarr;
                    </a>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Zero cloud data tracking</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-normal border-slate-200 dark:border-slate-800">
                    Target: {API_BASE_URL || '127.0.0.1:8000'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
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
