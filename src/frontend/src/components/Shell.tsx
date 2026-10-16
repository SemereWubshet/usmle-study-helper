import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Moon, Sun, BarChart3, History as HistoryIcon, SlidersHorizontal } from 'lucide-react'
import { useTheme } from './theme-provider'
import { Button } from '@/components/ui/button'
import { EngineUpdateBanner } from '@/components/EngineUpdateBanner'
import { GoalsModal } from '@/features/dashboard/components/GoalsModal'

export default function Shell({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme()
  const location = useLocation()
  const [isGoalsOpen, setIsGoalsOpen] = useState(false)

  const isSession = location.pathname.startsWith('/session')

  return (
    <div className={`bg-[#FAF9F6] dark:bg-slate-950 transition-colors duration-300 font-sans text-[#1E2B27] dark:text-slate-100 ${isSession ? 'h-screen overflow-hidden flex flex-col' : 'min-h-screen'}`}>
      {/* Floating Top Navigation */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center p-4 pointer-events-none">
        <nav className="pointer-events-auto flex items-center justify-between w-full max-w-5xl px-6 py-2.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-[#E3E8E5] dark:border-slate-800 rounded-full shadow-[0_8px_28px_rgba(30,43,39,0.08)]">
          
          <div className="flex items-center space-x-2 sm:space-x-6">
            <Link to="/" className="flex items-center space-x-2.5 text-[#0B7A5A] dark:text-emerald-400 font-semibold tracking-tight whitespace-nowrap text-[16px]">
              <img src="/usmle.svg" alt="USMLE Logo" className="w-5 h-5 shrink-0" />
              <span className="hidden lg:inline">USMLE Study Helper</span>
              <span className="hidden md:inline lg:hidden">USMLE Study</span>
              <span className="md:hidden font-extrabold text-sm">USMLE</span>
            </Link>
            
            <div className="flex items-center space-x-1 border-l border-[#E3E8E5] dark:border-slate-800 pl-2 sm:pl-4">
              <Link to="/">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`rounded-full px-3.5 text-xs sm:text-[14px] font-medium transition-all ${
                    location.pathname === '/' 
                      ? 'bg-[#EDF3EF] text-[#1E2B27] hover:bg-[#EDF3EF] dark:bg-slate-800 dark:text-white' 
                      : 'text-[#3E4A45] hover:text-[#1E2B27] hover:bg-[#F2F5F3] dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5 sm:mr-1.5 shrink-0" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Button>
              </Link>

              <Link to="/analytics">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`rounded-full px-3.5 text-xs sm:text-[14px] font-medium transition-all ${
                    location.pathname === '/analytics' 
                      ? 'bg-[#EDF3EF] text-[#1E2B27] hover:bg-[#EDF3EF] dark:bg-slate-800 dark:text-white' 
                      : 'text-[#3E4A45] hover:text-[#1E2B27] hover:bg-[#F2F5F3] dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5 sm:mr-1.5 shrink-0" />
                  <span className="hidden sm:inline">Analytics</span>
                </Button>
              </Link>

              <Link to="/history">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`rounded-full px-3.5 text-xs sm:text-[14px] font-medium transition-all ${
                    location.pathname === '/history' 
                      ? 'bg-[#EDF3EF] text-[#1E2B27] hover:bg-[#EDF3EF] dark:bg-slate-800 dark:text-white' 
                      : 'text-[#3E4A45] hover:text-[#1E2B27] hover:bg-[#F2F5F3] dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <HistoryIcon className="w-3.5 h-3.5 sm:mr-1.5 shrink-0" />
                  <span className="hidden sm:inline">History</span>
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-[#3E4A45] hover:text-[#1E2B27] hover:bg-[#EDF3EF] dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
              onClick={() => setIsGoalsOpen(true)}
              aria-label="Goals & Benchmarks"
              title="Goals & Benchmarks"
            >
              <SlidersHorizontal className="h-[1.15rem] w-[1.15rem]" />
              <span className="sr-only">Goals & Benchmarks</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-slate-600" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-slate-300" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </div>
        </nav>
      </div>

      <GoalsModal isOpen={isGoalsOpen} onClose={() => setIsGoalsOpen(false)} />

      {/* Floating Engine Update Notification (Only appears if engine has newer release) */}
      <EngineUpdateBanner />

      {/* Main Content Area */}
      {isSession ? (
        <main className="pt-20 pb-2 px-3 sm:px-6 lg:px-8 w-full max-w-[1920px] mx-auto flex-1 h-[calc(100vh-5rem)] overflow-hidden flex flex-col">
          {children}
        </main>
      ) : (
        <main className="pt-24 pb-20 px-4 md:px-8 max-w-[1120px] mx-auto">
          {children}
        </main>
      )}
    </div>
  )
}