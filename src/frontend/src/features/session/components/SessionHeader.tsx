import { Search, Clock, Pause, Play, AlertCircle } from 'lucide-react'
import { MedGraphIcon } from '@/components/icons/MedGraphIcon'

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
  qbank: _qbank,
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

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const isLowTime = timeRemaining <= 300
  const isCriticalTime = timeRemaining <= 60

  return (
    <div className="flex flex-col gap-4 pb-2">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        {/* Left: Scope Tag & Question Progress Header */}
        <div>
          <div className="text-[12px] tracking-[0.08em] uppercase text-[#4F5C57] dark:text-slate-400 font-semibold">
            {sessionTitle || 'USMLE Step 1'}
          </div>
          <div className="mt-2 flex items-center gap-3.5 flex-wrap">
            <h1 className="font-heading font-medium text-3xl sm:text-[34px] text-[#1E2B27] dark:text-white leading-[1.1]">
              {isReviewMode ? 'Session Review' : `Question ${currentIndex + 1} of ${totalQuestions}`}
            </h1>

            {/* Timer Badge */}
            {examMode === 'mock_exam' ? (
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-colors ${
                  isCriticalTime
                    ? 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 animate-pulse'
                    : isLowTime
                    ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-200'
                    : 'bg-[#EDF0EE] dark:bg-slate-800 text-[#3E4A45] dark:text-slate-200'
                }`}>
                  {isCriticalTime ? (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 animate-bounce" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-[#3E4A45] dark:text-slate-400" />
                  )}
                  <span className="font-mono">{formatCountdown(timeRemaining)}</span>
                </span>

                {onTogglePause && (
                  <button
                    type="button"
                    onClick={onTogglePause}
                    className="h-8 px-3 rounded-full border border-[#E3E8E5] dark:border-slate-800 bg-white dark:bg-slate-900 text-[12px] font-medium text-[#1E2B27] dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {isPaused ? <Play className="w-3 h-3 text-[#0B7A5A] fill-[#0B7A5A]" /> : <Pause className="w-3 h-3 text-[#35433E] dark:text-slate-300" />}
                    <span>{isPaused ? 'Resume' : 'Pause'}</span>
                  </button>
                )}
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#EDF0EE] dark:bg-slate-800 text-[13px] font-semibold text-[#1E2B27] dark:text-slate-200">
                <Clock className="w-3.5 h-3.5 text-[#35433E] dark:text-slate-300" />
                <span>{timeSpent}s</span>
              </span>
            )}
          </div>
        </div>

        {/* Right: MedSearch / MedGraph Pill Group & End Session Button */}
        <div className="flex items-center gap-3 flex-wrap">
          {(isReviewMode || examMode !== 'mock_exam') && (
            <div className="inline-flex gap-1 p-1 bg-[#EDF0EE] dark:bg-slate-800/80 rounded-full border border-[#E3E8E5]/70 dark:border-slate-800">
              <button
                type="button"
                onClick={() => onTogglePanel(isMedSearchOpen ? 'none' : 'medsearch')}
                className={`min-h-[38px] px-3.5 sm:px-4 rounded-full text-[13px] sm:text-[14px] inline-flex items-center gap-2 transition-all cursor-pointer ${
                  isMedSearchOpen
                    ? 'bg-white dark:bg-slate-900 text-[#0B7A5A] dark:text-emerald-400 font-semibold shadow-[0_1px_4px_rgba(30,43,39,0.12)]'
                    : 'bg-transparent text-[#35433E] dark:text-slate-300 font-medium hover:text-[#1E2B27] dark:hover:text-white'
                }`}
                title="Toggle MedSearch Panel"
              >
                <Search className="w-4 h-4 shrink-0 text-[#35433E] dark:text-slate-300" />
                <span>MedSearch</span>
              </button>

              <button
                type="button"
                onClick={() => onTogglePanel(isGraphOpen ? 'none' : 'graph')}
                className={`min-h-[38px] px-3.5 sm:px-4 rounded-full text-[13px] sm:text-[14px] inline-flex items-center gap-2 transition-all cursor-pointer ${
                  isGraphOpen
                    ? 'bg-white dark:bg-slate-900 text-[#0B7A5A] dark:text-emerald-400 font-semibold shadow-[0_1px_4px_rgba(30,43,39,0.12)]'
                    : 'bg-transparent text-[#35433E] dark:text-slate-300 font-medium hover:text-[#1E2B27] dark:hover:text-white'
                }`}
                title="Toggle MedGraph Panel"
              >
                <MedGraphIcon size={16} className="shrink-0" />
                <span>MedGraph</span>
              </button>
            </div>
          )}

          {/* End session button matching active pill appearance with red on hover */}
          {isReviewMode ? (
            <button
              type="button"
              onClick={onFinishReview}
              className="min-h-[42px] px-5 rounded-full bg-white dark:bg-slate-900 border border-[#E3E8E5] dark:border-slate-800 text-[#1E2B27] dark:text-slate-200 text-[14px] font-semibold hover:border-[#0B7A5A] shadow-[0_1px_4px_rgba(30,43,39,0.12)] transition-all cursor-pointer"
            >
              Back to dashboard
            </button>
          ) : onQuitSession && (
            <button
              type="button"
              onClick={onQuitSession}
              className="min-h-[42px] px-5 rounded-full bg-white dark:bg-slate-900 border border-[#E3E8E5] dark:border-slate-800 text-[#1E2B27] dark:text-slate-200 text-[14px] font-semibold shadow-[0_1px_4px_rgba(30,43,39,0.12)] hover:border-rose-300 hover:text-rose-600 dark:hover:border-rose-400 dark:hover:text-rose-400 transition-all cursor-pointer"
            >
              End session
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
