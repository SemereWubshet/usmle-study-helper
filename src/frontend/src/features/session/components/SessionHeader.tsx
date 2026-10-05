import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, GitGraph, LayoutDashboard, Clock, Pause, Play, AlertCircle } from 'lucide-react'

export type ActiveSidePanel = 'none' | 'medsearch' | 'graph';

interface SessionHeaderProps {
  isReviewMode: boolean;
  qbank: string;
  sessionTitle?: string;
  currentIndex?: number;
  totalQuestions: number;
  timeSpent?: number;
  examMode?: 'tutor' | 'mock_exam';
  timeRemaining?: number;
  isPaused?: boolean;
  onTogglePause?: () => void;
  activePanel: ActiveSidePanel;
  onTogglePanel: (panel: ActiveSidePanel) => void;
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
  examMode = 'tutor',
  timeRemaining = 3600,
  isPaused = false,
  onTogglePause,
  activePanel,
  onTogglePanel,
  onFinishReview,
  onQuitSession,
}: SessionHeaderProps) {
  const isMedSearchOpen = activePanel === 'medsearch';
  const isGraphOpen = activePanel === 'graph';

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

        <div className="flex items-center space-x-2">
          {/* Mutually Exclusive Panel Toggles */}
          <div className="flex items-center space-x-1 bg-transparent p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <button
              type="button"
              onClick={() => onTogglePanel(isMedSearchOpen ? 'none' : 'medsearch')}
              className={`h-9 px-3 text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.97] active:translate-y-px ${
                isMedSearchOpen
                  ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-800 shadow-2xs'
                  : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-indigo-500/10 hover:text-indigo-700 dark:hover:text-indigo-300'
              }`}
              title="Toggle MedSearch"
            >
              <Search className={`w-3.5 h-3.5 ${isMedSearchOpen ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`} />
              <span>MedSearch</span>
            </button>

            <button
              type="button"
              onClick={() => onTogglePanel(isGraphOpen ? 'none' : 'graph')}
              className={`h-9 px-3 text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.97] active:translate-y-px ${
                isGraphOpen
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 shadow-2xs'
                  : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300'
              }`}
              title="Toggle MedGraph"
            >
              <GitGraph className={`w-3.5 h-3.5 ${isGraphOpen ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`} />
              <span>MedGraph</span>
            </button>
          </div>

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

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const isLowTime = timeRemaining <= 300
  const isCriticalTime = timeRemaining <= 60

  return (
    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
      <div className="space-y-1">
        <div className="flex items-center space-x-2">
          {examMode === 'mock_exam' && (
            <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800 text-[10px] font-bold uppercase tracking-wider">
              Mock Exam
            </Badge>
          )}
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {sessionTitle}
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Question {currentIndex + 1} of {totalQuestions}
          </h2>

          {examMode === 'mock_exam' ? (
            <div className="flex items-center space-x-2">
              <div className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-1 rounded-lg border shadow-2xs transition-colors ${
                isCriticalTime
                  ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 animate-pulse'
                  : isLowTime
                  ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-700'
              }`}>
                {isCriticalTime ? (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 animate-bounce" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span className="font-mono tracking-tight">{formatCountdown(timeRemaining)}</span>
              </div>

              {onTogglePause && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onTogglePause}
                  className="h-8 px-2.5 rounded-lg border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
                  title={isPaused ? "Resume Exam" : "Pause Exam"}
                >
                  {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" /> : <Pause className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{isPaused ? "Resume" : "Pause"}</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{timeSpent}s</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {examMode !== 'mock_exam' && (
          <div className="flex items-center space-x-1 bg-transparent p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <button
              type="button"
              onClick={() => onTogglePanel(isMedSearchOpen ? 'none' : 'medsearch')}
              className={`h-8 px-2.5 text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.97] active:translate-y-px ${
                isMedSearchOpen
                  ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-800 shadow-2xs'
                  : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-indigo-500/10 hover:text-indigo-700 dark:hover:text-indigo-300'
              }`}
              title="Toggle MedSearch"
            >
              <Search className={`w-3.5 h-3.5 ${isMedSearchOpen ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`} />
              <span>MedSearch</span>
            </button>

            <button
              type="button"
              onClick={() => onTogglePanel(isGraphOpen ? 'none' : 'graph')}
              className={`h-8 px-2.5 text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.97] active:translate-y-px ${
                isGraphOpen
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 shadow-2xs'
                  : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300'
              }`}
              title="Toggle MedGraph"
            >
              <GitGraph className={`w-3.5 h-3.5 ${isGraphOpen ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`} />
              <span>MedGraph</span>
            </button>
          </div>
        )}

        {onQuitSession && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onQuitSession}
            className="h-8 rounded-xl cursor-pointer text-xs
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
