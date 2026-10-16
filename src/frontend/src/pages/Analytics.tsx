import { useMemo, useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchDashboardStats } from '../api'
import { Skeleton } from '@/components/ui/skeleton'
import { getStoredGoals, type UserGoals } from '@/utils/goalsStorage'
import { ChevronDown, Check } from 'lucide-react'

// Helper to get local YYYY-MM-DD string
const getLocalDateStr = (date: Date) => date.toLocaleDateString('en-CA')

const sortOptions = [
  { value: 'weakest', label: 'Weakest' },
  { value: 'strongest', label: 'Strongest' },
  { value: 'volume', label: 'Most practiced' },
  { value: 'alphabetical', label: 'Alphabetical' },
]

export default function Analytics() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: fetchDashboardStats,
  })

  // Goals state synchronized with global updates
  const [goals, setGoals] = useState<UserGoals>(getStoredGoals)

  useEffect(() => {
    const handleGoalsChanged = (e: any) => {
      if (e.detail) setGoals(e.detail)
    }
    window.addEventListener('usmle_goals_changed', handleGoalsChanged)
    return () => window.removeEventListener('usmle_goals_changed', handleGoalsChanged)
  }, [])

  // State for exam scope selector and sorting
  const [selectedExamScope, setSelectedExamScope] = useState<string>('USMLE Step 1')
  const [sortBy, setSortBy] = useState<'weakest' | 'strongest' | 'alphabetical' | 'volume'>('weakest')
  const [isSortOpen, setIsSortOpen] = useState(false)
  const sortDropdownRef = useRef<HTMLDivElement>(null)

  // Close sort dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Calculate Real Data Metrics
  const { todayAnswered, currentStreak } = useMemo(() => {
    if (!stats?.recent_sessions) return { todayAnswered: 0, currentStreak: 0 }

    const sessions = stats.recent_sessions
    const today = new Date()
    const todayStr = getLocalDateStr(today)
    
    // 1. Today's Answered
    const todayTotal = sessions
      .filter((s: any) => getLocalDateStr(new Date(s.created_at)) === todayStr)
      .reduce((sum: number, s: any) => sum + s.questions_answered, 0)

    // 2. Current Streak
    const sessionDates = new Set(sessions.map((s: any) => getLocalDateStr(new Date(s.created_at))))
    let streak = 0
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (sessionDates.has(todayStr) || sessionDates.has(getLocalDateStr(yesterday))) {
      let activeDate = sessionDates.has(todayStr) ? new Date(today) : new Date(yesterday)
      while (sessionDates.has(getLocalDateStr(activeDate))) {
        streak++
        activeDate.setDate(activeDate.getDate() - 1)
      }
    }

    return { todayAnswered: todayTotal, currentStreak: streak }
  }, [stats])

  // Filter and sort subject performance by selected exam scope
  const filteredAndSortedSubjects = useMemo(() => {
    if (!stats?.subject_performance) return []

    // Filter by selected exam scope
    const filtered = stats.subject_performance.filter((item: any) => {
      if (selectedExamScope === 'USMLE Step 1') {
        return item.exam_group === 'USMLE Step 1' || (!item.exam_group && !item.subject.includes('Surgery') && !item.subject.includes('Obstetrics'))
      }
      if (selectedExamScope === 'USMLE Step 2 & 3') {
        return item.exam_group === 'USMLE Step 2 and Step 3'
      }
      if (selectedExamScope === 'MedMCQA') {
        return item.exam_group === 'MedMCQA'
      }
      return true
    })

    return [...filtered].sort((a: any, b: any) => {
      if (sortBy === 'weakest') return a.accuracy_percentage - b.accuracy_percentage
      if (sortBy === 'strongest') return b.accuracy_percentage - a.accuracy_percentage
      if (sortBy === 'volume') return b.total_answered - a.total_answered
      if (sortBy === 'alphabetical') return a.subject.localeCompare(b.subject)
      return 0
    })
  }, [stats?.subject_performance, selectedExamScope, sortBy])

  // Calculate this week's 7-day activity and 12-week question totals
  const { thisWeekDays, weeklyTotals, maxWeeklyTotal } = useMemo(() => {
    const today = new Date()
    const sessions = stats?.recent_sessions || []

    // 1. Current week (Mon -> Sun)
    // Find Monday of current week
    const dayOfWeek = today.getDay() // 0 is Sun, 1 is Mon...
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(today)
    monday.setDate(today.getDate() + distanceToMonday)

    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, index) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + index)
      const dStr = getLocalDateStr(d)
      const isToday = dStr === getLocalDateStr(today)
      const isFuture = d > today && !isToday

      const count = sessions
        .filter((s: any) => getLocalDateStr(new Date(s.created_at)) === dStr)
        .reduce((sum: number, s: any) => sum + s.questions_answered, 0)

      return {
        label,
        dateStr: dStr,
        count,
        isToday,
        isFuture,
        hasActivity: count > 0,
      }
    })

    // 2. 12-week question history (from 11 weeks ago to this week)
    const weeks: { weekNum: number; count: number }[] = []
    for (let w = 11; w >= 0; w--) {
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - (w * 7 + 6))
      const weekEnd = new Date(today)
      weekEnd.setDate(today.getDate() - (w * 7))

      const count = sessions
        .filter((s: any) => {
          const sDate = new Date(s.created_at)
          return sDate >= weekStart && sDate <= weekEnd
        })
        .reduce((sum: number, s: any) => sum + s.questions_answered, 0)

      weeks.push({ weekNum: 12 - w, count })
    }

    const maxWeekly = Math.max(...weeks.map(w => w.count), 280)

    return { thisWeekDays: days, weeklyTotals: weeks, maxWeeklyTotal: maxWeekly }
  }, [stats])

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <Skeleton className="h-20 w-80 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    )
  }

  const dailyGoal = goals.dailyTarget || 40
  const weeklyGoal = dailyGoal * 7
  const progressPercent = Math.min((todayAnswered / dailyGoal) * 100, 100)

  return (
    <div className="animate-in fade-in duration-500 flex flex-col gap-12">
      {/* Page Title & Daily Target Header */}
      <div className="flex items-end justify-between gap-6 flex-wrap pt-2">
        <div>
          <h1 className="font-heading font-medium text-4xl sm:text-5xl text-[#1E2B27] dark:text-white tracking-tight leading-[1.1]">
            Your progress
          </h1>
          <p className="mt-3 text-lg text-[#3E4A45] dark:text-slate-400">
            Your study habits.
          </p>
        </div>

        {/* Daily Target Progress Meter */}
        <div className="w-full sm:w-72 sm:min-w-[240px] pb-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[14px] text-[#3E4A45] dark:text-slate-400 font-medium">Daily target</span>
            <span className="flex items-baseline">
              <span className="font-heading text-[26px] font-medium text-[#1E2B27] dark:text-white">
                {todayAnswered}
              </span>
              <span className="ml-1.5 text-[14px] text-[#3E4A45] dark:text-slate-400">
                of {dailyGoal} today
              </span>
            </span>
          </div>
          <div className="mt-2.5 h-1.5 rounded-full bg-[#E3E8E5] dark:bg-slate-800 overflow-hidden">
            <div 
              className="h-full rounded-full bg-[#0B7A5A] transition-all duration-500" 
              style={{ width: `${progressPercent}%` }} 
            />
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics: Fraunces Numbers & Narrative Labels */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-10 py-1">
        <div>
          <div className="font-heading font-medium text-3xl sm:text-4xl text-[#1E2B27] dark:text-white leading-[1.1]">
            {stats?.total_answered || 0}
          </div>
          <div className="mt-2 text-[15px] font-semibold text-[#1E2B27] dark:text-slate-200">
            Total answered
          </div>
          <div className="mt-1 text-[13px] text-[#4F5C57] dark:text-slate-400 leading-snug">
            {stats?.total_answered 
              ? `About ${((stats.total_answered / 7009) * 100).toFixed(1)}% of the question bank` 
              : 'Complete practice questions to build your volume'}
          </div>
        </div>

        <div>
          <div className="font-heading font-medium text-3xl sm:text-4xl text-[#1E2B27] dark:text-white leading-[1.1]">
            {stats?.global_accuracy || 0}%
          </div>
          <div className="mt-2 text-[15px] font-semibold text-[#1E2B27] dark:text-slate-200">
            Global accuracy
          </div>
          <div className="mt-1 text-[13px] text-[#4F5C57] dark:text-slate-400 leading-snug">
            Your mastery goal is {goals.excellenceThreshold}%
          </div>
        </div>

        <div>
          <div className="font-heading font-medium text-3xl sm:text-4xl text-[#1E2B27] dark:text-white leading-[1.1]">
            {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
          </div>
          <div className="mt-2 text-[15px] font-semibold text-[#1E2B27] dark:text-slate-200">
            Current streak
          </div>
          <div className="mt-1 text-[13px] text-[#4F5C57] dark:text-slate-400 leading-snug">
            {currentStreak > 0 ? 'Keep momentum rolling today' : 'Answer a question today to start a streak'}
          </div>
        </div>
      </section>

      {/* Subject Mastery Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-[#1E2B27] dark:text-white">
          Subject mastery
        </h2>

        {/* Bank Filter Tabs & Sorting Select */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedExamScope('USMLE Step 1')}
              className={`min-h-[42px] px-5 rounded-full text-[14px] transition-all cursor-pointer ${
                selectedExamScope === 'USMLE Step 1'
                  ? 'border border-[#0B7A5A] bg-[#E3F2EA] text-[#0B5F46] font-semibold dark:bg-emerald-950/70 dark:text-emerald-300'
                  : 'border border-[#E3E8E5] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#1E2B27] dark:text-slate-200 hover:border-[#0B7A5A]/50 shadow-[0_1px_2px_rgba(30,43,39,0.04)]'
              }`}
            >
              USMLE Step 1
            </button>

            <button
              type="button"
              onClick={() => setSelectedExamScope('USMLE Step 2 & 3')}
              className={`min-h-[42px] px-5 rounded-full text-[14px] transition-all cursor-pointer ${
                selectedExamScope === 'USMLE Step 2 & 3'
                  ? 'border border-[#0B7A5A] bg-[#E3F2EA] text-[#0B5F46] font-semibold dark:bg-emerald-950/70 dark:text-emerald-300'
                  : 'border border-[#E3E8E5] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#1E2B27] dark:text-slate-200 hover:border-[#0B7A5A]/50 shadow-[0_1px_2px_rgba(30,43,39,0.04)]'
              }`}
            >
              USMLE Step 2 & 3
            </button>

            <button
              type="button"
              onClick={() => setSelectedExamScope('MedMCQA')}
              className={`min-h-[42px] px-5 rounded-full text-[14px] transition-all cursor-pointer ${
                selectedExamScope === 'MedMCQA'
                  ? 'border border-[#0B7A5A] bg-[#E3F2EA] text-[#0B5F46] font-semibold dark:bg-emerald-950/70 dark:text-emerald-300'
                  : 'border border-[#E3E8E5] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#1E2B27] dark:text-slate-200 hover:border-[#0B7A5A]/50 shadow-[0_1px_2px_rgba(30,43,39,0.04)]'
              }`}
            >
              MedMCQA
            </button>
          </div>

          <div className="relative self-start sm:self-auto shrink-0" ref={sortDropdownRef}>
            <button
              type="button"
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="min-h-[42px] pl-4.5 pr-3.5 rounded-full border border-[#E3E8E5] dark:border-slate-800 bg-white dark:bg-slate-900 text-[14px] font-medium text-[#1E2B27] dark:text-slate-200 hover:border-[#0B7A5A]/50 focus:border-[#0B7A5A] transition-all shadow-[0_1px_3px_rgba(30,43,39,0.04)] flex items-center gap-2 cursor-pointer select-none"
            >
              <span className="text-[#4F5C57] dark:text-slate-400 font-normal">Sort:</span>
              <span className="font-semibold text-[#0B5F46] dark:text-emerald-300">
                {sortOptions.find(o => o.value === sortBy)?.label || 'Weakest'}
              </span>
              <ChevronDown className={`w-4 h-4 text-[#4F5C57] dark:text-slate-400 transition-transform duration-200 ${isSortOpen ? 'rotate-180 text-[#0B7A5A]' : ''}`} />
            </button>

            {isSortOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-[#E3E8E5] dark:border-slate-800 rounded-2xl shadow-[0_8px_30px_rgba(30,43,39,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] p-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                {sortOptions.map((option) => {
                  const isSelected = sortBy === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setSortBy(option.value as any)
                        setIsSortOpen(false)
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

        {/* Subject Accuracy Cards Grid */}
        <div className="mt-3 bg-white dark:bg-slate-900 border border-[#E3E8E5] dark:border-slate-800 rounded-[24px] p-6 sm:p-7 shadow-[0_1px_3px_rgba(30,43,39,0.06)] grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {filteredAndSortedSubjects.length === 0 ? (
            <div className="col-span-full py-8 text-center text-sm text-[#4F5C57]">
              No questions answered yet for {selectedExamScope}. Complete a session to see subject readiness.
            </div>
          ) : (
            filteredAndSortedSubjects.map((sub: any) => {
              const isMastery = sub.accuracy_percentage >= goals.excellenceThreshold
              const isPassing = sub.accuracy_percentage >= goals.passingThreshold

              let barColor = '#B4530A'
              if (isMastery) {
                barColor = '#0A5A43'
              } else if (isPassing) {
                barColor = '#0B7A5A'
              }

              return (
                <div
                  key={sub.subject}
                  className="w-full text-left p-3.5 rounded-2xl hover:bg-[#FAF9F6] dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[15px] font-medium text-[#1E2B27] dark:text-white truncate">
                      {sub.subject}
                    </span>
                    <span className="flex items-baseline shrink-0">
                      <span 
                        className="font-heading text-[20px] font-medium inline-flex items-center gap-1" 
                        style={{ color: barColor }}
                      >
                        {isMastery && <span className="text-[14px] leading-none">★</span>}
                        <span>{sub.accuracy_percentage}%</span>
                      </span>
                      <span className="ml-2 text-[13px] text-[#4F5C57] dark:text-slate-400">
                        {sub.total_answered} Qs
                      </span>
                    </span>
                  </div>

                  {/* Visual Accuracy Bar */}
                  <div className="relative mt-2.5 h-2 rounded-full bg-[#E8ECE9] dark:bg-slate-800 overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(sub.accuracy_percentage, 100)}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* Study Consistency: Weekly Breakdown & Trend Chart */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h2 className="text-2xl font-semibold text-[#1E2B27] dark:text-white">
            Study consistency
          </h2>
          <span className="text-[14px] text-[#3E4A45] dark:text-slate-400">
            Last 12 weeks
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E3E8E5] dark:border-slate-800 rounded-[24px] p-7 sm:p-8 shadow-[0_1px_3px_rgba(30,43,39,0.06)] flex flex-col lg:flex-row gap-10 lg:gap-14 items-start">
          {/* Left: This Week 7-Day Dots */}
          <div className="w-full lg:w-auto">
            <div className="text-[15px] font-semibold text-[#1E2B27] dark:text-white">
              This week
            </div>
            
            <div className="mt-4 flex gap-3">
              {thisWeekDays.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <span
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      d.isToday
                        ? 'border-2 border-[#0B7A5A] bg-white dark:bg-slate-900 shadow-xs'
                        : d.hasActivity
                        ? 'bg-[#7FD1AE] text-white'
                        : 'bg-[#EDF0EE] dark:bg-slate-800'
                    }`}
                  >
                    {d.hasActivity && (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0B7A5A]" />
                    )}
                  </span>
                  <span
                    className={`text-[13px] ${
                      d.isToday
                        ? 'font-bold text-[#0B7A5A] dark:text-emerald-400'
                        : 'text-[#3E4A45] dark:text-slate-400'
                    }`}
                  >
                    {d.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 text-[14px] text-[#3E4A45] dark:text-slate-400">
              {todayAnswered > 0
                ? `${todayAnswered} questions completed today.`
                : 'Answer one question today to start a streak.'}
            </div>
          </div>

          {/* Right: 12-Week Question Volume Bar Chart */}
          <div className="flex-1 w-full">
            <div className="text-[15px] font-semibold text-[#1E2B27] dark:text-white">
              Questions per week
            </div>

            <div className="relative mt-4 h-36 flex items-end gap-2.5 pt-6 pb-1 border-b border-[#E3E8E5] dark:border-slate-800">
              {/* Dashed Weekly Target Line */}
              <div 
                className="absolute left-0 right-0 border-t border-dashed border-[#8A9690] pointer-events-none"
                style={{ bottom: `${Math.min((weeklyGoal / maxWeeklyTotal) * 100, 95)}%` }}
              />

              {/* 12 Weekly Bars */}
              {weeklyTotals.map((w, i) => {
                const heightPercent = w.count > 0 
                  ? Math.max(8, (w.count / maxWeeklyTotal) * 100) 
                  : 4
                const isCurrentWeek = i === weeklyTotals.length - 1

                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center group relative h-full justify-end"
                  >
                    <div
                      className={`w-full rounded-md transition-all ${
                        isCurrentWeek && w.count > 0
                          ? 'bg-[#7FD1AE]'
                          : w.count > 0
                          ? 'bg-[#0B7A5A]'
                          : 'bg-[#E3E8E5] dark:bg-slate-800'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                      title={`Week ${w.weekNum}: ${w.count} Qs`}
                    />
                  </div>
                )
              })}
            </div>

            <div className="mt-2.5 flex justify-between text-[13px] text-[#35433E] dark:text-slate-300">
              <span>12 weeks ago</span>
              <span className="hidden sm:inline">Dashed line is your weekly goal, {weeklyGoal}</span>
              <span>This week</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

