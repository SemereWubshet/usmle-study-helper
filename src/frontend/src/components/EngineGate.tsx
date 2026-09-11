import { useState, useEffect, type ReactNode } from 'react'
import { checkEngineHealth, API_BASE_URL, type EngineHealth } from '../api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Laptop, Download, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react'

interface EngineGateProps {
  children: ReactNode
}

export default function EngineGate({ children }: EngineGateProps) {
  const [health, setHealth] = useState<EngineHealth | null>(null)
  const [checking, setChecking] = useState(true)
  const [hasError, setHasError] = useState(false)

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

  if (checking && !health) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative flex items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/10 flex items-center justify-center animate-pulse">
              <Laptop className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
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

  // Engine is offline -> Render friendly download & setup screen
  if (hasError || !health) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50/70 dark:bg-slate-950 p-4">
        <Card className="w-full max-w-lg border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl overflow-hidden bg-white dark:bg-slate-900">
          <div className="h-2 bg-gradient-to-r from-amber-500 to-indigo-600" />
          <CardHeader className="text-center pb-2 pt-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center mb-2 border border-amber-200/50 dark:border-amber-800/40">
              <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Local Engine Not Detected
            </CardTitle>
            <CardDescription className="text-slate-500 text-sm mt-1">
              Your USMLE questions and study statistics stay 100% private on your laptop.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-2 pb-6 px-6">
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Quick 2-Step Setup
              </p>
              <div className="flex items-start space-x-3 text-sm text-slate-700 dark:text-slate-300">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold shrink-0">
                  1
                </span>
                <p>
                  Download and unzip your portable <span className="font-semibold text-slate-900 dark:text-slate-100">USMLEStudyHelper</span> folder.
                </p>
              </div>
              <div className="flex items-start space-x-3 text-sm text-slate-700 dark:text-slate-300">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold shrink-0">
                  2
                </span>
                <p>
                  Double-click <span className="font-mono text-xs bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">USMLE-Helper.exe</span> to launch the local engine.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                asChild
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 shadow-sm gap-2"
              >
                <a href="#download-release" onClick={(e) => { e.preventDefault(); alert('Download will be linked to GitHub Releases executable once built!'); }}>
                  <Download className="w-4 h-4" />
                  Download for Windows (.zip)
                </a>
              </Button>
              <Button 
                variant="outline" 
                onClick={verifyEngine}
                disabled={checking}
                className="rounded-xl h-11 border-slate-300 dark:border-slate-700 gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                Retry Connection
              </Button>
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
    )
  }

  // Engine is healthy -> Render the app normally!
  return <>{children}</>
}
