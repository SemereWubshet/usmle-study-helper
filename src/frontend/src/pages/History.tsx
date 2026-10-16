import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { fetchDashboardStats, fetchSessionReview, retrySession } from '../api'
import { Eye, RotateCcw, Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { getStoredGoals, type UserGoals } from '@/utils/goalsStorage'

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
  // Time range select state: '7' | '14' | '30' | 'all'
  const [timeRange, setTimeRange] = useState<string>('14')

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
          sessionData: data.sessionData,
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
        <div className="flex gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`min-h-[42px] px-5 rounded-full text-[14px] transition-all cursor-pointer ${
              filterMode === 'all'
                ? 'border border-[#0B7A5A] bg-[#E3F2EA] text-[#0B5F46] font-semibold dark:bg-emerald-950/70 dark:text-emerald-300'
                : 'border border-[#E3E8E5] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#1E2B27] dark:text-slate-200 hover:border-[#0B7A5A]/50 shadow-[0_1px_2px_rgba(30,43,39,0.04)]'
            }`}
          >
            All sessions
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('below_passing')}
            className={`min-h-[42px] px-5 rounded-full text-[14px] transition-all cursor-pointer ${
              filterMode === 'below_passing'
                ? 'border border-[#0B7A5A] bg-[#E3F2EA] text-[#0B5F46] font-semibold dark:bg-emerald-950/70 dark:text-emerald-300'
                : 'border border-[#E3E8E5] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#1E2B27] dark:text-slate-200 hover:border-[#0B7A5A]/50 shadow-[0_1px_2px_rgba(30,43,39,0.04)]'
            }`}
          >
            Below passing
          </button>
        </div>

        {/* Time range selector */}
        <div className="relative self-start sm:self-auto shrink-0">
          <label htmlFor="time-range-select" className="sr-only">Time range</label>
          <select
            id="time-range-select"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="min-h-[42px] pl-4 pr-9 rounded-full border border-[#E3E8E5] dark:border-slate-800 bg-white dark:bg-slate-900 font-medium text-[14px] text-[#1E2B27] dark:text-slate-200 outline-none cursor-pointer shadow-[0_1px_2px_rgba(30,43,39,0.04)] appearance-none"
          >
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
            <option value="all">All time</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#4F5C57]">
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
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

                let scoreColor = '#B4530A'
                if (isMastery) {
                  scoreColor = '#0A5A43'
                } else if (isPassing) {
                  scoreColor = '#0B7A5A'
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
                    className="bg-white dark:bg-slate-900 border border-[#E3E8E5] dark:border-slate-800 rounded-[20px] p-5 sm:p-6 shadow-[0_1px_3px_rgba(30,43,39,0.06)] flex flex-wrap items-center justify-between gap-4 sm:gap-6"
                  >
                    {/* Left: Scope & Details */}
                    <div className="flex-1 min-w-[240px]">
                      <div className="text-[17px] font-semibold text-[#1E2B27] dark:text-white">
                        {scopeDisplay}
                      </div>
                      <div className="mt-1 text-[14px] text-[#3E4A45] dark:text-slate-400">
                        {blockDetails}
                      </div>
                    </div>

                    {/* Middle: Score Percentage */}
                    <div className="w-28 shrink-0">
                      {isScored ? (
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className="font-heading text-[24px] font-medium inline-flex items-center gap-1"
                            style={{ color: scoreColor }}
                          >
                            {isMastery && <span className="text-[16px] leading-none">★</span>}
                            <span>{accuracy}%</span>
                          </span>
                        </div>
                      ) : (
                        <span className="text-[15px] text-[#4F5C57] dark:text-slate-400 font-medium">
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
                        className="min-h-[42px] px-4.5 rounded-full border border-[#E3E8E5] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#1E2B27] dark:text-slate-200 text-[14px] font-medium hover:border-[#0B7A5A]/50 shadow-[0_1px_2px_rgba(30,43,39,0.04)] transition-all cursor-pointer disabled:opacity-40 flex items-center gap-2"
                      >
                        {isReviewLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#0B7A5A]" />
                        ) : (
                          <Eye className="w-4 h-4 text-[#3E4A45]" />
                        )}
                        <span>Review</span>
                      </button>

                      {/* Retry block button */}
                      <button
                        type="button"
                        onClick={() => handleRetry(session.session_id)}
                        disabled={isThisLoading}
                        className="min-h-[42px] px-5 rounded-full bg-[#E3F2EA] dark:bg-emerald-950/70 text-[#0B5F46] dark:text-emerald-300 text-[14px] font-semibold hover:bg-[#E3F2EA]/80 transition-all cursor-pointer disabled:opacity-40 flex items-center gap-2"
                      >
                        {isRetryLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RotateCcw className="w-4 h-4" />
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