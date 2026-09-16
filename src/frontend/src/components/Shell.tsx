import { Link, useLocation } from 'react-router-dom'
import { BookOpen, LayoutDashboard, Moon, Sun, BarChart3 } from 'lucide-react'
import { useTheme } from './theme-provider'
import { Button } from '@/components/ui/button'

export default function Shell({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme()
  const location = useLocation()

  const isSession = location.pathname.startsWith('/session')

  return (
    <div className={`bg-slate-50 dark:bg-slate-950 transition-colors duration-300 ${isSession ? 'h-screen overflow-hidden flex flex-col' : 'min-h-screen'}`}>
      {/* Floating Top Navigation */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center p-4 pointer-events-none">
        <nav className="pointer-events-auto flex items-center justify-between w-full max-w-4xl px-6 py-3 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-full shadow-sm">
          
          <div className="flex items-center space-x-6">
            <Link to="/" className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold tracking-tight">
              <BookOpen className="w-5 h-5" />
              <span>USMLE Study Helper</span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-1 border-l border-slate-200 dark:border-slate-700 pl-6">
              <Link to="/">
                <Button variant={location.pathname === '/' ? 'secondary' : 'ghost'} size="sm" className="rounded-full">
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>

              <Link to="/history">
                <Button variant={location.pathname === '/history' ? 'secondary' : 'ghost'} size="sm" className="rounded-full">
                <BarChart3 className="w-4 h-4 mr-2" />
                History
                </Button>
            </Link>
            </div>
          </div>

          <div className="flex items-center space-x-2">
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

      {/* Main Content Area */}
      {isSession ? (
        <main className="pt-20 pb-2 px-3 sm:px-6 lg:px-8 w-full max-w-[1920px] mx-auto flex-1 h-[calc(100vh-5rem)] overflow-hidden flex flex-col">
          {children}
        </main>
      ) : (
        <main className="pt-24 pb-12 px-4 md:px-8 max-w-5xl mx-auto">
          {children}
        </main>
      )}
    </div>
  )
}