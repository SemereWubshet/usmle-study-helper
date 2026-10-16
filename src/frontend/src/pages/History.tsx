import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { fetchDashboardStats, fetchSessionReview, retrySession } from '../api'
import { Eye, RotateCcw, Loader2, ChevronDown, Check } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { getStoredGoals, type UserGoals } from '@/utils/goalsStorage'

// 5 Time Range Options
const timeRangeOptions = [
  { value: '1', label: 'Past 24 hours' },
  { value: '3', label: 'Past 3 days' },
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 14 days' },
  { value: '30', label: 'Last 30 days' },
]

// Helper to format date header (e.g., "Today, Oct 15", "Yesterday", or "Oct 5")
function formatDateHeader(dateStr: string): string {
  const target = new Date(dateStr)
  const today = new Date()
  
  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const monthDay = target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  if (isSameDay(target, today)) {
    return `Today, ${monthDay}`
  }
  if (isSameDay(target, yesterday)) {
    return `Yesterday, ${monthDay}`
  }
  return monthDay
}

export default function History() {
  const navigate = useNavigate()
  const [loadingSessionId, setLoadingSessionId] = useState<number | null>(null)
  const [actionType, setActionType] = useState<'review' | 'retry' | null>(null)
  
  // Goals state
  const [goals, setGoals] = useState<UserGoals>(getStoredGoals)

  useEffect(() => {
    const handleGoalsChanged = (e: any) => {
      if (e.detail) setGoals(e.detail)
    }
    window.addEventListener('usmle_goals_changed', handleGoalsChanged)
    return () => window.removeEventListener('usmle_goals_changed', handleGoalsChanged)
  }, [])

  // Filter tabs state: 'all' | 'below_passing'
  const [filterMode, setFilterMode] = useState<'all' | 'below_passing'>('all')
  // Time range select state: default to '3' (Past 3 days)
  const [timeRange, setTimeRange] = useState<string>('3')
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false)
  const timeDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target as Node)) {
        setIsTimeDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: fetchDashboardStats,
  })

  // Review mutation: Fetches past session questions + recorded answers and opens Session in Review Mode
  const reviewMutation = useMutation({
    mutationFn: (sessionId: number) => fetchSessionReview(sessionId),
    onSuccess: (data) => {
      navigate('/session', {
        state: {
          sessionData: {
            ...data.sessionData,
            customConfig: {
              passingThreshold: goals.passingThreshold,
              excellenceThreshold: goals.excellenceThreshold,
              targetSeconds: goals.targetSeconds,
            },
          },
          attempts: data.attempts,
          isReviewMode: true,
        },
      })
    },
    onSettled: () => {
      setLoadingSessionId(null)
      setActionType(null)
    },
  })

  // Retry mutation: Creates a brand-new session with the same questions and starts active test
  const retryMutation = useMutation({
    mutationFn: (sessionId: number) => retrySession(sessionId),
    onSuccess: (data) => {
      navigate('/session', {
        state: {
          sessionData: data,
        },
      })
    },
    onSettled: () => {
      setLoadingSessionId(null)
      setActionType(null)
    },
  })

  const handleReview = (sessionId: number) => {
    setLoadingSessionId(sessionId)
    setActionType('review')
    reviewMutation.mutate(sessionId)
  }

  const handleRetry = (sessionId: number) => {
    setLoadingSessionId(sessionId)
    setActionType('retry')
    retryMutation.mutate(sessionId)
  }

  // Filter sessions by passing threshold and time range
  const filteredSessions = useMemo(() => {
    const rawSessions: any[] = stats?.recent_sessions || []
    const now = new Date()

    return rawSessions.filter((s: any) => {
      // 1. Time range filter
      if (timeRange !== 'all') {
        const days = Number(timeRange)
        const sessionDate = new Date(s.created_at)
        const diffMs = now.getTime() - sessionDate.getTime()
        const diffDays = diffMs / (1000 * 60 * 60 * 24)
        if (diffDays > days) return false
      }

      // 2. Below passing filter (< passingThreshold accuracy or no questions answered)
      if (filterMode === 'below_passing') {
        const accuracy = s.accuracy_percentage ?? 0
        const isBelow = accuracy < goals.passingThreshold || s.questions_answered === 0
        if (!isBelow) return false
      }

      return true
    })
  }, [stats?.recent_sessions, filterMode, timeRange, goals.passingThreshold])

  // Group filtered sessions by calendar day string
  const groupedSessions = useMemo(() => {
    const groups: { [key: string]: { label: string; date: string; sessions: any[]; totalQuestions: number } } = {}

    filteredSessions.forEach((s: any) => {
      const dateKey = new Date(s.created_at).toLocaleDateString('en-CA')
      if (!groups[dateKey]) {
        groups[dateKey] = {
          label: formatDateHeader(s.created_at),
          date: dateKey,
          sessions: [],
          totalQuestions: 0,
        }
      }
      groups[dateKey].sessions.push(s)
      groups[dateKey].totalQuestions += s.questions_answered || 0
    })

    // Return sorted descending by date
    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date))
  }, [filteredSessions])

  // Summary counts for filtered view
  const totalQuestionsFiltered = useMemo(() => {
    return filteredSessions.reduce((acc, s) => acc + (s.questions_answered || 0), 0)
  }, [filteredSessions])

  const averageAccuracyFiltered = useMemo(() => {
    const scored = filteredSessions.filter(s => s.questions_answered > 0)
    if (!scored.length) return 0
    const sum = scored.reduce((acc, s) => acc + (s.accuracy_percentage || 0), 0)
    return Math.round(sum / scored.length)
  }, [filteredSessions])

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <Skeleton className="h-16 w-80 rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in duration-500 flex flex-col gap-10">
      {/* Title & Subtitle */}
      <div>
        <h1 className="font-heading font-medium text-4xl sm:text-5xl text-[#1E2B27] dark:text-white tracking-tight leading-[1.1]">
          Session history
        </h1>
        <p className="mt-3 text-lg text-[#3E4A45] dark:text-slate-400">
          Look back at past sessions and retest any block.
        </p>
      </div>

      {/* Filter Tabs & Time Range Select */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Status filter pills */}
        <div className="flex gap-2 p-1.5 bg-[#EFF4F0] dark:bg-slate-900/80 border border-[#E3E8E5]/70 dark:border-slate-800 rounded-full w-fit">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`min-h-[36px] px-4 rounded-full text-[13px] font-medium transition-all cursor-pointer ${
              filterMode === 'all'
                ? 'bg-white dark:bg-slate-800 text-[#0B5F46] dark:text-emerald-300 font-semibold shadow-[0_1px_3px_rgba(30,43,39,0.08)]'
                : 'text-[#4F5C57] dark:text-slate-400 hover:text-[#1E2B27] dark:hover:text-white'
            }`}
          >
            All sessions
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('below_passing')}
            className={`min-h-[36px] px-4 rounded-full text-[13px] font-medium transition-all cursor-pointer ${
              filterMode === 'below_passing'
                ? 'bg-white dark:bg-slate-800 text-[#0B5F46] dark:text-emerald-300 font-semibold shadow-[0_1px_3px_rgba(30,43,39,0.08)]'
                : 'text-[#4F5C57] dark:text-slate-400 hover:text-[#1E2B27] dark:hover:text-white'
            }`}
          >
            Below passing
          </button>
        </div>

        {/* Time range custom dropdown */}
        <div className="relative self-start sm:self-auto shrink-0" ref={timeDropdownRef}>
          <button
            type="button"
            onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
            className="min-h-[42px] pl-4.5 pr-3.5 rounded-full border border-[#E3E8E5] dark:border-slate-800 bg-white dark:bg-slate-900 text-[14px] font-medium text-[#1E2B27] dark:text-slate-200 hover:border-[#0B7A5A]/50 focus:border-[#0B7A5A] transition-all shadow-[0_1px_3px_rgba(30,43,39,0.04)] flex items-center gap-2 cursor-pointer select-none"
          >
            <span className="text-[#4F5C57] dark:text-slate-400 font-normal">Time:</span>
            <span className="font-semibold text-[#0B5F46] dark:text-emerald-300">
              {timeRangeOptions.find((o) => o.value === timeRange)?.label || 'Past 3 days'}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-[#4F5C57] dark:text-slate-400 transition-transform duration-200 ${
                isTimeDropdownOpen ? 'rotate-180 text-[#0B7A5A]' : ''
              }`}
            />
          </button>

          {isTimeDropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-[#E3E8E5] dark:border-slate-800 rounded-2xl shadow-[0_8px_30px_rgba(30,43,39,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] p-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
              {timeRangeOptions.map((option) => {
                const isSelected = timeRange === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setTimeRange(option.value)
                      setIsTimeDropdownOpen(false)
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-[#E3F2EA] dark:bg-emerald-950/70 text-[#0B5F46] dark:text-emerald-300 font-semibold'
                        : 'text-[#1E2B27] dark:text-slate-200 hover:bg-[#F4F7F5] dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span>{option.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-[#0B7A5A] dark:text-emerald-400" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Summary Narrative Subtext */}
      <p className="text-[15px] text-[#3E4A45] dark:text-slate-400 -mt-4">
        {filteredSessions.length} {filteredSessions.length === 1 ? 'session' : 'sessions'}, {totalQuestionsFiltered} {totalQuestionsFiltered === 1 ? 'question' : 'questions'} answered, {averageAccuracyFiltered}% average
      </p>

      {/* Grouped Sessions Chronological List */}
      {groupedSessions.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-[#E3E8E5] dark:border-slate-800 rounded-[24px] p-12 text-center shadow-[0_1px_3px_rgba(30,43,39,0.06)]">
          <p className="text-base text-[#4F5C57] dark:text-slate-400">
            No sessions match the selected filter.
          </p>
        </div>
      ) : (
        groupedSessions.map((group) => (
          <section key={group.date} className="space-y-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-xl font-semibold text-[#1E2B27] dark:text-white">
                {group.label}
              </h2>
              <span className="text-[14px] text-[#3E4A45] dark:text-slate-400">
                {group.sessions.length} {group.sessions.length === 1 ? 'session' : 'sessions'}, {group.totalQuestions} {group.totalQuestions === 1 ? 'question' : 'questions'}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {group.sessions.map((session: any) => {
                const isThisLoading = loadingSessionId === session.session_id
                const isReviewLoading = isThisLoading && actionType === 'review'
                const isRetryLoading = isThisLoading && actionType === 'retry'

                const questionsCount = session.questions_answered || 0
                const isScored = questionsCount > 0
                const accuracy = session.accuracy_percentage ?? 0
                const isMastery = accuracy >= goals.excellenceThreshold
                const isPassing = accuracy >= goals.passingThreshold

                let scoreClass = 'text-[#C2410C] dark:text-amber-400 font-semibold'
                if (isMastery) {
                  scoreClass = 'text-[#0A5A43] dark:text-emerald-300 font-semibold'
                } else if (isPassing) {
                  scoreClass = 'text-[#0B7A5A] dark:text-emerald-400 font-semibold'
                }

                // Scope & Block narrative
                let scopeDisplay = session.scope || 'USMLE Step 1'
                if (scopeDisplay === 'USMLE Step 2 and Step 3' || scopeDisplay === 'USMLE Step 2 and 3') {
                  scopeDisplay = 'USMLE Step 2 & 3'
                }
                const pacingText = session.average_time_seconds 
                  ? `${session.average_time_seconds}s per question` 
                  : null

                const blockDetails = isScored
                  ? `Block ${session.session_id}, ${questionsCount} ${questionsCount === 1 ? 'question' : 'questions'}${pacingText ? `, ${pacingText}` : ''}`
                  : `Block ${session.session_id}, no questions answered`

                return (
                  <div
                    key={session.session_id}
                    className="group bg-white dark:bg-slate-900 border border-[#E3E8E5] dark:border-slate-800 hover:border-[#0B7A5A]/40 dark:hover:border-emerald-600/40 rounded-[24px] p-5 sm:p-6 shadow-[0_1px_3px_rgba(30,43,39,0.04)] hover:shadow-[0_4px_20px_rgba(30,43,39,0.06)] transition-all flex flex-wrap items-center justify-between gap-4 sm:gap-6"
                  >
                    {/* Left: Scope & Details */}
                    <div className="flex-1 min-w-[240px]">
                      <div className="text-[17px] font-semibold text-[#1E2B27] dark:text-white group-hover:text-[#0B7A5A] dark:group-hover:text-emerald-400 transition-colors">
                        {scopeDisplay}
                      </div>
                      <div className="mt-1 text-[14px] text-[#4F5C57] dark:text-slate-400">
                        {blockDetails}
                      </div>
                    </div>

                    {/* Middle: Score Percentage */}
                    <div className="w-28 shrink-0">
                      {isScored ? (
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className={`font-heading text-[26px] inline-flex items-center gap-1 tracking-tight ${scoreClass}`}
                          >
                            {isMastery && <span className="text-[15px] leading-none text-emerald-600 dark:text-emerald-400">★</span>}
                            <span>{accuracy}%</span>
                          </span>
                        </div>
                      ) : (
                        <span className="text-[14px] text-[#4F5C57] dark:text-slate-300 font-medium bg-[#EFF4F0] dark:bg-slate-800 px-3 py-1 rounded-full">
                          Not scored
                        </span>
                      )}
                    </div>

                    {/* Right: Actions (Review & Retry) */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {/* Review button - present for all sessions */}
                      <button
                        type="button"
                        onClick={() => handleReview(session.session_id)}
                        disabled={isThisLoading}
                        className="min-h-[40px] px-4.5 rounded-full border border-[#E3E8E5] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#1E2B27] dark:text-slate-200 text-[13px] font-medium hover:border-[#0B7A5A]/50 hover:bg-[#F8FAF9] dark:hover:bg-slate-800 shadow-[0_1px_2px_rgba(30,43,39,0.04)] transition-all cursor-pointer disabled:opacity-40 flex items-center gap-2"
                      >
                        {isReviewLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B7A5A] dark:text-emerald-400" />
                        ) : (
                          <Eye className="w-3.5 h-3.5 text-[#0B7A5A] dark:text-emerald-400 group-hover:scale-105 transition-transform" />
                        )}
                        <span>Review</span>
                      </button>

                      {/* Retry block button */}
                      <button
                        type="button"
                        onClick={() => handleRetry(session.session_id)}
                        disabled={isThisLoading}
                        className="min-h-[40px] px-5 rounded-full bg-[#E3F2EA] dark:bg-emerald-950/70 text-[#0B5F46] dark:text-emerald-300 text-[13px] font-semibold hover:bg-[#D4EBDD] dark:hover:bg-emerald-900/80 transition-all cursor-pointer disabled:opacity-40 flex items-center gap-2"
                      >
                        {isRetryLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        <span>Retry block</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))
      )}
    </div>
  )
}