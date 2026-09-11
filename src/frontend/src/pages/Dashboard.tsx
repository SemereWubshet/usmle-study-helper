import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { fetchDashboardStats, createSession, type SessionPayload } from '../api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { Activity, Target, Zap, Settings2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

// Helper to get local YYYY-MM-DD string
const getLocalDateStr = (date: Date) => date.toLocaleDateString('en-CA')

export default function Dashboard() {
  const navigate = useNavigate()
  const [blockCount, setBlockCount] = useState([40])

  const [selectedQbank, setSelectedQbank] = useState("medqa_usmle")
  const [examTarget, setExamTarget] = useState("USMLE Step 1")
  
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['All Subjects'])
  const [subjectSearch, setSubjectSearch] = useState('')

  const subjects = [
    'All Subjects',
    'Anatomy', 'Physiology', 'Biochemistry', 'Pharmacology', 'Pathology',
    'Microbiology', 'Forensic Medicine', 'Social & Preventive Medicine',
    'Medicine', 'Surgery', 'Pediatrics', 'Gynaecology & Obstetrics',
    'Orthopaedics', 'Ophthalmology', 'ENT', 'Psychiatry',
    'Dermatology', 'Radiology', 'Anaesthesia', 'Dental'
  ]

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: fetchDashboardStats,
  })

  const sessionMutation = useMutation({
    mutationFn: (payload: SessionPayload) => createSession(payload),
    onSuccess: (data) => navigate('/session', { state: { sessionData: data } }),
  })

  const toggleSubject = (subject: string) => {
    if (subject === 'All Subjects') {
      setSelectedSubjects(['All Subjects'])
      return
    }
    const newSubjects = selectedSubjects.filter(s => s !== 'All Subjects')
    if (newSubjects.includes(subject)) {
      setSelectedSubjects(newSubjects.filter(s => s !== subject).length ? newSubjects.filter(s => s !== subject) : ['All Subjects'])
    } else {
      setSelectedSubjects([...newSubjects, subject])
    }
  }

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
    
    // Streak is alive if they studied today OR yesterday
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (sessionDates.has(todayStr) || sessionDates.has(getLocalDateStr(yesterday))) {
      let activeDate = sessionDates.has(todayStr) ? new Date(today) : new Date(yesterday)
      while (sessionDates.has(getLocalDateStr(activeDate))) {
        streak++
        activeDate.setDate(activeDate.getDate() - 1) // Walk backward one day
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

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-64 w-full rounded-3xl" /></div>

  // Daily Goal Logic
  const dailyGoal = 40
  const progressPercent = Math.min((todayAnswered / dailyGoal) * 100, 100)
  const isGoalMet = todayAnswered >= dailyGoal

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* Daily Goal & Quick Actions */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-32 bg-emerald-500/5 blur-3xl rounded-full" />
          <CardContent className="p-8 space-y-6 relative z-10">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Daily Target</h2>
              <p className="text-slate-500">
                {isGoalMet 
                  ? "Outstanding. You have crushed your daily goal." 
                  : `You are ${dailyGoal - todayAnswered} questions away from your daily goal.`}
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-slate-700 dark:text-slate-300">{todayAnswered} Answered</span>
                <span className="text-emerald-600 dark:text-emerald-400">{dailyGoal} Goal</span>
              </div>
              <Progress value={progressPercent} className="h-3 bg-slate-100 dark:bg-slate-800" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
          <CardContent className="p-6 space-y-4">
            <Button 
              onClick={() => sessionMutation.mutate({ 
                qbank: "medqa_usmle", 
                block_size: 40, 
                exam_type: "USMLE Step 1" 
              })}
              disabled={sessionMutation.isPending}
              // Update line below to change the Quick Start color!
              className="w-full h-14 border-green-300 dark:border-green-700 bg-green-200/50 dark:bg-green-700/40 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-600/50"
            >
              <Zap className="w-4 h-4 mr-2" />
              Quick Start
            </Button>
            
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" className="w-full h-14 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                    <Settings2 className="w-4 h-4 mr-2" />
                    Custom Session
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] p-6 sm:p-8 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl">
                    <DialogHeader className="space-y-2 text-left">
                    <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">Configure Session</DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-slate-400">
                        Set up your targeted study parameters.
                    </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-6 space-y-8">
                    {/* Q-Bank Selector */}
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-slate-900 dark:text-slate-200">Question Bank</label>
                      <select 
                        value={selectedQbank}
                        onChange={(e) => setSelectedQbank(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      >
                        <option value="medqa_usmle">USMLE Question Bank (MedQA)</option>
                        <option value="medmcqa">Indian Question Bank (MedMCQA)</option>
                      </select>
                    </div>

                    {/* Block Size Input & Slider */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold text-slate-900 dark:text-slate-200">Num of Questions</label>
                        <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
                            <input 
                            type="number" 
                            min={1} 
                            max={100}
                            step={1}
                            value={blockCount[0]}
                            onChange={(e) => setBlockCount([Number(e.target.value) || 1])}
                            className="w-12 text-center text-sm font-bold bg-transparent text-slate-900 dark:text-white outline-none"
                            />
                            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Qs</span>
                        </div>
                        </div>
                        <Slider 
                        value={blockCount} 
                        max={100} min={1} step={1}
                        onValueChange={setBlockCount}
                        className="py-2"
                        />
                    </div>

                    {/* Unified Target Scope Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-slate-900 dark:text-slate-200">Target Scope</label>
                        {selectedQbank === "medmcqa" && (
                          <span className="text-xs text-slate-500">
                            {selectedSubjects.includes('All Subjects') ? 'All included' : `${selectedSubjects.length} selected`}
                          </span>
                        )}
                      </div>

                      {selectedQbank === "medqa_usmle" ? (
                        /* USMLE: 2 crisp segmented buttons */
                        <div className="grid grid-cols-2 gap-2">
                          {['USMLE Step 1', 'USMLE Step 2 and Step 3'].map(step => (
                            <button
                              key={step}
                              type="button"
                              onClick={() => setExamTarget(step)}
                              className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all cursor-pointer text-center select-none ${
                                examTarget === step
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-600 shadow-sm'
                                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                              }`}
                            >
                              {step}
                            </button>
                          ))}
                        </div>
                      ) : (
                        /* MedMCQA: Searchable dropdown with scrollable checkboxes */
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Filter subjects (e.g. Pathology, Anatomy)..."
                            value={subjectSearch}
                            onChange={(e) => setSubjectSearch(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition-all"
                          />
                          <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border border-slate-100 dark:border-slate-800/80 rounded-lg p-1.5 bg-slate-50/50 dark:bg-slate-900/30">
                            {subjects
                              .filter(sub => sub.toLowerCase().includes(subjectSearch.toLowerCase()))
                              .map(sub => {
                                const isSelected = selectedSubjects.includes(sub)
                                return (
                                  <button
                                    key={sub}
                                    type="button"
                                    onClick={() => toggleSubject(sub)}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-all text-left cursor-pointer ${
                                      isSelected
                                        ? 'bg-emerald-500 text-white shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                                    }`}
                                  >
                                    <span>{sub}</span>
                                    {isSelected && <span>✓</span>}
                                  </button>
                                )
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                    {/* Generate Button Payload Update */}
                    <div className="pt-2">
                      <Button 
                        onClick={() => sessionMutation.mutate({
                          qbank: selectedQbank,
                          block_size: blockCount[0],
                          ...(selectedQbank === "medqa_usmle" ? { exam_type: examTarget } : { subjects: selectedSubjects })
                        })} 
                        disabled={sessionMutation.isPending}
                        className="w-full h-14 text-lg rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
                      >
                        {sessionMutation.isPending ? 'Generating...' : 'Generate & Start'}
                      </Button>
                    </div>
                </DialogContent>
            </Dialog>
            
          </CardContent>
        </Card>
      </section>

      {/* Centered Stats Grid */}
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

    </div>
  )
}