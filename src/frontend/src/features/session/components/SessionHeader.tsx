import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PanelRightClose, PanelRightOpen, LayoutDashboard, Clock } from 'lucide-react'

interface SessionHeaderProps {
  isReviewMode: boolean;
  qbank: string;
  sessionTitle?: string;
  currentIndex?: number;
  totalQuestions: number;
  timeSpent?: number;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onFinishReview: () => void;
  onQuitSession?: () => void;
}

export function SessionHeader({
  isReviewMode,
  qbank,
  sessionTitle,
  currentIndex = 0,
  totalQuestions,
  timeSpent = 0,
  isSidebarOpen,
  onToggleSidebar,
  onFinishReview,
  onQuitSession,
}: SessionHeaderProps) {
  if (isReviewMode) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
              Block Completed
            </Badge>
            <span className="text-xs text-slate-500 font-medium capitalize">
              {qbank === 'medqa_usmle' ? 'USMLE Practice' : 'MedMCQA Bank'}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Session Review
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Review question rationales, pacing metrics, and explore high-yield concept cards.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            size="sm"
            variant={isSidebarOpen ? "secondary" : "outline"}
            onClick={onToggleSidebar}
            className="h-11 px-4 text-xs font-medium rounded-xl gap-2 cursor-pointer border-slate-200 dark:border-slate-800"
            title={isSidebarOpen ? "Collapse Review Cards" : "Show Review Cards"}
          >
            {isSidebarOpen ? <PanelRightClose className="w-4 h-4 text-slate-500" /> : <PanelRightOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
            <span>{isSidebarOpen ? "Hide Cards" : "Show Cards"}</span>
          </Button>

          <Button 
            onClick={onFinishReview}
            className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 text-white rounded-xl shadow-sm gap-2 h-11 px-5 cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4" />
            Done • Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
      <div className="space-y-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {sessionTitle}
        </span>
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Question {currentIndex + 1} of {totalQuestions}
          </h2>
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{timeSpent}s</span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Button
          size="sm"
          variant={isSidebarOpen ? "secondary" : "outline"}
          onClick={onToggleSidebar}
          className="h-9 px-3 text-xs font-medium rounded-xl gap-1.5 cursor-pointer border-slate-200 dark:border-slate-800"
          title={isSidebarOpen ? "Collapse MedSearch" : "Open MedSearch"}
        >
          {isSidebarOpen ? <PanelRightClose className="w-3.5 h-3.5 text-slate-500" /> : <PanelRightOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
          <span>{isSidebarOpen ? "Hide Search" : "MedSearch"}</span>
        </Button>

        {onQuitSession && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onQuitSession}
            className="h-9 rounded-xl cursor-pointer text-xs
                      text-rose-500
                      hover:bg-rose-50 hover:text-rose-600
                      active:bg-rose-100
                      focus-visible:ring-2 focus-visible:ring-rose-300"
          >
            Quit
          </Button>
        )}
      </div>
    </div>
  )
}

