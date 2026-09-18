import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { 
  fetchDashboardStats, 
  createSession, 
  fetchAvailableSubjects,
  type SessionPayload, 
  type SubjectItem 
} from '../api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { 
  Zap, 
  SlidersHorizontal, 
  BookOpen, 
  GraduationCap, 
  Layers, 
  ArrowRight,
  BarChart3
} from 'lucide-react'

export default function Dashboard() {
  const navigate = useNavigate()

  // Session Generator State
  const [selectedQbank, setSelectedQbank] = useState("medqa_usmle")
  const [examTarget, setExamTarget] = useState("USMLE Step 1")
  const [blockCount, setBlockCount] = useState([40])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['All Subjects'])
  const [subjectSearch, setSubjectSearch] = useState('')

  // Configurable Review Benchmarks
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [passingThreshold, setPassingThreshold] = useState(60)
  const [excellenceThreshold, setExcellenceThreshold] = useState(80)
  const [targetSeconds, setTargetSeconds] = useState(90)

  // Lightweight summary stats for header
  const { data: stats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: fetchDashboardStats,
  })

  // Dynamic subjects query from local engine backend
  const { data: availableSubjects = [], isLoading: isLoadingSubjects } = useQuery({
    queryKey: ['availableSubjects', selectedQbank, examTarget],
    queryFn: () => fetchAvailableSubjects(
      selectedQbank, 
      selectedQbank === "medqa_usmle" ? examTarget : undefined
    ),
  })

  const sessionMutation = useMutation({
    mutationFn: async (payload: SessionPayload & { customConfig?: { passingThreshold: number; excellenceThreshold: number; targetSeconds: number } }) => {
      const { customConfig, ...backendPayload } = payload
      const data = await createSession(backendPayload)
      return {
        ...data,
        customConfig: customConfig || {
          passingThreshold: 60,
          excellenceThreshold: 80,
          targetSeconds: 90,
        },
      }
    },
    onSuccess: (data) => navigate('/session', { state: { sessionData: data } }),
  })

  // Subject Selection Logic
  const handleToggleSubject = (subjectName: string) => {
    if (subjectName === 'All Subjects') {
      setSelectedSubjects(['All Subjects'])
      return
    }

    const withoutAll = selectedSubjects.filter(s => s !== 'All Subjects')
    if (withoutAll.includes(subjectName)) {
      const next = withoutAll.filter(s => s !== subjectName)
      setSelectedSubjects(next.length > 0 ? next : ['All Subjects'])
    } else {
      setSelectedSubjects([...withoutAll, subjectName])
    }
  }

  const handleSelectAll = () => {
    setSelectedSubjects(['All Subjects'])
  }

  // Filtered Subject List
  const filteredSubjects = useMemo(() => {
    if (!subjectSearch.trim()) return availableSubjects
    return availableSubjects.filter((s: SubjectItem) => 
      s.subject.toLowerCase().includes(subjectSearch.toLowerCase())
    )
  }, [availableSubjects, subjectSearch])

  // Total questions in active filter scope
  const totalAvailableInSelection = useMemo(() => {
    if (!availableSubjects.length) return 0
    if (selectedSubjects.includes('All Subjects')) {
      return availableSubjects.reduce((acc, s) => acc + s.count, 0)
    }
    return availableSubjects
      .filter(s => selectedSubjects.includes(s.subject))
      .reduce((acc, s) => acc + s.count, 0)
  }, [availableSubjects, selectedSubjects])

  const handleStartSession = () => {
    const payload: SessionPayload = {
      qbank: selectedQbank,
      block_size: blockCount[0],
      ...(selectedQbank === "medqa_usmle" ? { exam_type: examTarget } : {}),
      ...(!selectedSubjects.includes('All Subjects') ? { subjects: selectedSubjects } : {})
    }

    sessionMutation.mutate({
      ...payload,
      customConfig: {
        passingThreshold,
        excellenceThreshold,
        targetSeconds,
      }
    })
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
      
      {/* Top Banner: Welcome & Fast Launch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Create Study Session
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Build customized practice blocks or launch an instant drill
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/analytics">
            <Button variant="outline" size="sm" className="rounded-xl border-slate-200 dark:border-slate-700 text-xs">
              <BarChart3 className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              {stats?.total_answered || 0} Answered ({stats?.global_accuracy || 0}%)
            </Button>
          </Link>

          <Button 
            onClick={() => sessionMutation.mutate({ 
              qbank: "medqa_usmle", 
              block_size: 40, 
              exam_type: "USMLE Step 1" 
            })}
            disabled={sessionMutation.isPending}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md shadow-emerald-500/20 text-xs px-3.5 h-9"
          >
            <Zap className="w-3.5 h-3.5 mr-1.5 fill-current" />
            Quick Start (Step 1)
          </Button>
        </div>
      </div>

      {/* Main Interactive Session Creator Card */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardContent className="p-6 sm:p-8 space-y-8">
          
          {/* Step 1: Select Question Bank & Target Exam */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">1</span>
              <label className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                Exam & Question Bank
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* USMLE Step 1 */}
              <button
                type="button"
                onClick={() => {
                  setSelectedQbank("medqa_usmle")
                  setExamTarget("USMLE Step 1")
                  setSelectedSubjects(['All Subjects'])
                }}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  selectedQbank === "medqa_usmle" && examTarget === "USMLE Step 1"
                    ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-sm ring-1 ring-emerald-500"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  {selectedQbank === "medqa_usmle" && examTarget === "USMLE Step 1" && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </div>
                <div>
                  <div className="font-semibold text-sm text-slate-900 dark:text-white">USMLE Step 1</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Foundational basic sciences</div>
                </div>
              </button>

              {/* USMLE Step 2 & 3 */}
              <button
                type="button"
                onClick={() => {
                  setSelectedQbank("medqa_usmle")
                  setExamTarget("USMLE Step 2 and Step 3")
                  setSelectedSubjects(['All Subjects'])
                }}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  selectedQbank === "medqa_usmle" && examTarget === "USMLE Step 2 and Step 3"
                    ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-sm ring-1 ring-emerald-500"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <GraduationCap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  {selectedQbank === "medqa_usmle" && examTarget === "USMLE Step 2 and Step 3" && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </div>
                <div>
                  <div className="font-semibold text-sm text-slate-900 dark:text-white">USMLE Step 2 & 3</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Clinical management & specialties</div>
                </div>
              </button>

              {/* MedMCQA */}
              <button
                type="button"
                onClick={() => {
                  setSelectedQbank("medmcqa")
                  setSelectedSubjects(['All Subjects'])
                }}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  selectedQbank === "medmcqa"
                    ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-sm ring-1 ring-emerald-500"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  {selectedQbank === "medmcqa" && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </div>
                <div>
                  <div className="font-semibold text-sm text-slate-900 dark:text-white">MedMCQA Bank</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Comprehensive Indian exam bank</div>
                </div>
              </button>
            </div>
          </div>

          {/* Step 2: Subject Discipline Filtering */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">2</span>
                <label className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                  Target Disciplines & Subjects
                </label>
                <span className="text-xs text-slate-400">
                  ({selectedSubjects.includes('All Subjects') ? 'All Subjects' : `${selectedSubjects.length} selected`})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                    selectedSubjects.includes('All Subjects')
                      ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-semibold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  All Subjects
                </button>
                {selectedSubjects.length > 0 && !selectedSubjects.includes('All Subjects') && (
                  <button
                    type="button"
                    onClick={() => setSelectedSubjects([])}
                    className="text-xs text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    Clear selection
                  </button>
                )}
              </div>
            </div>

            {/* Search filter for subjects */}
            {availableSubjects.length > 8 && (
              <input
                type="text"
                placeholder="Filter subjects (e.g. Pathology, Pharmacology, Surgery)..."
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            )}

            {/* Subject Chips Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {isLoadingSubjects ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
                ))
              ) : filteredSubjects.length === 0 ? (
                <div className="col-span-full py-4 text-center text-xs text-slate-400">
                  No subjects match your filter.
                </div>
              ) : (
                filteredSubjects.map((sub: SubjectItem) => {
                  const isExplicit = selectedSubjects.includes(sub.subject)

                  return (
                    <button
                      key={sub.subject}
                      type="button"
                      onClick={() => handleToggleSubject(sub.subject)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs transition-all cursor-pointer text-left select-none ${
                        isExplicit
                          ? 'border-emerald-500 bg-emerald-500 text-white font-medium shadow-xs'
                          : selectedSubjects.includes('All Subjects')
                          ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 hover:border-emerald-400'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <span className="truncate pr-2">{sub.subject}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                        isExplicit
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {sub.count}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Step 3: Block Size / Question Count */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">3</span>
                <label className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                  Block Size
                </label>
              </div>

              <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800/80 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <input 
                  type="number" 
                  min={1} 
                  max={Math.min(totalAvailableInSelection || 100, 100)}
                  step={1}
                  value={blockCount[0]}
                  onChange={(e) => setBlockCount([Math.max(1, Math.min(100, Number(e.target.value) || 1))])}
                  className="w-12 text-center text-sm font-bold bg-transparent text-slate-900 dark:text-white outline-none"
                />
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Questions</span>
              </div>
            </div>

            <Slider 
              value={blockCount} 
              max={Math.min(totalAvailableInSelection || 100, 100)} 
              min={1} 
              step={1}
              onValueChange={setBlockCount}
              className="py-1"
            />

            {/* Quick preset pills */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-slate-400">Presets:</span>
              {[10, 20, 40].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setBlockCount([preset])}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                    blockCount[0] === preset
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {preset} Qs
                </button>
              ))}
            </div>
          </div>

          {/* Collapsible Advanced Benchmarks */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center space-x-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{showAdvanced ? "Hide Pacing & Review Targets" : "Configure Pacing & Review Benchmarks"}</span>
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 animate-in fade-in duration-300">
                {/* Passing Threshold */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Passing</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{passingThreshold}%</span>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={90}
                    step={5}
                    value={passingThreshold}
                    onChange={(e) => setPassingThreshold(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400">Pass cutoff for summary</p>
                </div>

                {/* Mastery Threshold */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Mastery</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{excellenceThreshold}%</span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={100}
                    step={5}
                    value={excellenceThreshold}
                    onChange={(e) => setExcellenceThreshold(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400">Gold standard benchmark</p>
                </div>

                {/* Target Pace */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Pace</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{targetSeconds}s</span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={180}
                    step={5}
                    value={targetSeconds}
                    onChange={(e) => setTargetSeconds(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <p className="text-[10px] text-slate-400">{Math.floor(targetSeconds / 60)}m {targetSeconds % 60}s / Q</p>
                </div>
              </div>
            )}
          </div>

          {/* Launch Button */}
          <div className="pt-2">
            <Button
              onClick={handleStartSession}
              disabled={sessionMutation.isPending || totalAvailableInSelection === 0}
              className="w-full h-14 text-base font-semibold rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              {sessionMutation.isPending ? (
                'Generating Session...'
              ) : (
                <span className="flex items-center justify-center">
                  Start {blockCount[0]}-Question Session
                  <ArrowRight className="w-5 h-5 ml-2" />
                </span>
              )}
            </Button>
          </div>

        </CardContent>
      </Card>

    </div>
  )
}