import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchDashboardStats } from '../api'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Target, Activity, Zap, ArrowUpDown, BookOpen, GraduationCap, Layers } from 'lucide-react'

// Helper to get local YYYY-MM-DD string
const getLocalDateStr = (date: Date) => date.toLocaleDateString('en-CA')

export default function Analytics() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: fetchDashboardStats,
  })

  // State for exam scope selector and sorting
  const [selectedExamScope, setSelectedExamScope] = useState<string>('USMLE Step 1')
  const [sortBy, setSortBy] = useState<'weakest' | 'strongest' | 'alphabetical' | 'volume'>('weakest')

  // Calculate Real Data Metrics
  const { todayAnswered, currentStreak, heatmapData } = useMemo(() => {
    if (!stats?.recent_sessions) return { todayAnswered: 0, currentStreak: 0, heatmapData: Array(84).fill(0) }

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

    // 3. Consistency Heatmap (Last 84 Days)
    const heatmap = Array.from({ length: 84 }).map((_, i) => {
      const targetDate = new Date(today)
      targetDate.setDate(targetDate.getDate() - (83 - i))
      const targetStr = getLocalDateStr(targetDate)
      
      const dayTotal = sessions
        .filter((s: any) => getLocalDateStr(new Date(s.created_at)) === targetStr)
        .reduce((sum: number, s: any) => sum + s.questions_answered, 0)
        
      if (dayTotal === 0) return 0
      if (dayTotal <= 10) return 1
      if (dayTotal <= 25) return 2
      return 3
    })

    return { todayAnswered: todayTotal, currentStreak: streak, heatmapData: heatmap }
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

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-64 w-full rounded-3xl" /></div>

  const dailyGoal = 40
  const progressPercent = Math.min((todayAnswered / dailyGoal) * 100, 100)
  const isGoalMet = todayAnswered >= dailyGoal

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Performance Analytics</h1>
        <p className="text-slate-500 mt-2">Comprehensive tracking of your study discipline, pacing, and subject mastery</p>
      </div>

      {/* Daily Target Progress */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-emerald-500/5 blur-3xl rounded-full" />
        <CardContent className="p-8 space-y-6 relative z-10">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Daily Target</h2>
            <p className="text-slate-500">
              {isGoalMet 
                ? "Outstanding. You have reached your daily practice goal." 
                : `You are ${dailyGoal - todayAnswered} questions away from your daily target of ${dailyGoal}.`}
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-slate-700 dark:text-slate-300">{todayAnswered} Answered Today</span>
              <span className="text-emerald-600 dark:text-emerald-400">{dailyGoal} Goal</span>
            </div>
            <Progress value={progressPercent} className="h-3 bg-slate-100 dark:bg-slate-800" />
          </div>
        </CardContent>
      </Card>

      {/* Global Metrics Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-2xl mb-4 text-blue-600 dark:text-blue-400">
              <Target className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Answered</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats?.total_answered || 0}</h3>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl mb-4 text-emerald-600 dark:text-emerald-400">
              <Activity className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Global Accuracy</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats?.global_accuracy || 0}%</h3>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <div className="p-3 bg-orange-50 dark:bg-orange-950/50 rounded-2xl mb-4 text-orange-600 dark:text-orange-400">
              <Zap className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Current Streak</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{currentStreak} {currentStreak === 1 ? 'Day' : 'Days'}</h3>
          </CardContent>
        </Card>
      </section>

      {/* Consistency Heatmap */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200">Study Consistency</h3>
          <span className="text-sm text-slate-500">Last 12 Weeks</span>
        </div>
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-1.5 md:gap-2">
              {heatmapData.map((intensity, i) => {
                const colors = [
                  'bg-slate-100 dark:bg-slate-800', 
                  'bg-emerald-200 dark:bg-emerald-950/60', 
                  'bg-emerald-400 dark:bg-emerald-800', 
                  'bg-emerald-600 dark:bg-emerald-500'
                ]
                return <div key={i} className={`w-3 h-3 md:w-4 md:h-4 rounded-sm ${colors[intensity]} transition-colors hover:ring-2 hover:ring-slate-400`} />
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Scope / Subject-Level Readiness with Exam Scope Selector */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 py-4 px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Prominent Exam Scope Selector Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedExamScope('USMLE Step 1')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  selectedExamScope === 'USMLE Step 1'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <BookOpen className="w-4 h-4 text-emerald-500" />
                <span>USMLE Step 1</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedExamScope('USMLE Step 2 & 3')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  selectedExamScope === 'USMLE Step 2 & 3'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-emerald-500" />
                <span>USMLE Step 2 & 3</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedExamScope('MedMCQA')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  selectedExamScope === 'MedMCQA'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <Layers className="w-4 h-4 text-indigo-500" />
                <span>MedMCQA Bank</span>
              </button>
            </div>

            {/* Sorting Controls */}
            <div className="flex items-center space-x-2 self-end md:self-auto">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs"
              >
                <option value="weakest">Weakest First</option>
                <option value="strongest">Strongest First</option>
                <option value="volume">Most Practiced</option>
                <option value="alphabetical">Alphabetical (A–Z)</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {filteredAndSortedSubjects.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400">
              No questions answered yet for <span className="font-semibold text-slate-600 dark:text-slate-300">{selectedExamScope}</span>. Complete a session to see subject readiness.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 animate-in fade-in duration-300">
              {filteredAndSortedSubjects.map((sub: any) => (
                <div key={sub.subject} className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{sub.subject}</span>
                    <span className="text-slate-500">
                      <span className={sub.accuracy_percentage >= 70 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-orange-600 dark:text-orange-400 font-bold'}>
                        {sub.accuracy_percentage}%
                      </span>
                      <span className="ml-1 text-xs">({sub.total_answered} Qs)</span>
                    </span>
                  </div>
                  <Progress value={sub.accuracy_percentage} className="h-2 bg-slate-100 dark:bg-slate-800" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

