import { useState, useMemo, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { 
  fetchDashboardStats, 
  createSession, 
  fetchAvailableSubjects,
  type SessionPayload, 
  type SubjectItem 
} from '../api'
import { Button } from '@/components/ui/button'
import { Zap, BarChart3, BookOpen, GraduationCap } from 'lucide-react'

import { QbankSelector } from '@/features/dashboard/components/QbankSelector'
import { SubjectSelector } from '@/features/dashboard/components/SubjectSelector'
import { BlockSizeSelector } from '@/features/dashboard/components/BlockSizeSelector'
import { ExamTimeSelector } from '@/features/dashboard/components/ExamTimeSelector'
import { GoalsModal } from '@/features/dashboard/components/GoalsModal'
import { PresetModal } from '@/features/dashboard/components/PresetModal'
import { getStoredGoals, saveStoredGoals, type UserGoals } from '@/utils/goalsStorage'
import { getStoredPreset } from '@/utils/presetStorage'

export default function Dashboard() {
  const navigate = useNavigate()

  // Initialize from saved browser preset
  const initialPreset = useMemo(() => getStoredPreset(), [])

  // Session Generator State
  const [selectedQbank, setSelectedQbank] = useState<string>(initialPreset.selectedQbank)
  const [examTarget, setExamTarget] = useState<string>(initialPreset.examTarget)
  const [blockCount, setBlockCount] = useState<number[]>([initialPreset.blockCount])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(initialPreset.selectedSubjects)
  const [subjectSearch, setSubjectSearch] = useState('')

  // Exam Time in minutes (stepper like block size)
  const [examDurationMinutes, setExamDurationMinutes] = useState<number>(initialPreset.examDurationMinutes)

  // Goals modal & preset modal states
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false)
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false)
  const [goals, setGoals] = useState<UserGoals>(getStoredGoals)

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
    mutationFn: async (payload: SessionPayload & { customConfig?: { passingThreshold: number; excellenceThreshold: number; targetSeconds: number; examMode?: 'tutor' | 'mock_exam'; timeLimitSeconds?: number } }) => {
      const { customConfig, ...backendPayload } = payload
      const data = await createSession(backendPayload)
      return {
        ...data,
        customConfig: customConfig || {
          passingThreshold: 60,
          excellenceThreshold: 80,
          targetSeconds: 90,
          examMode: 'tutor',
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

  // Keep goals synchronized with global changes
  useEffect(() => {
    const handleGoalsChanged = (e: any) => {
      if (e.detail) setGoals(e.detail)
    }
    window.addEventListener('usmle_goals_changed', handleGoalsChanged)
    return () => window.removeEventListener('usmle_goals_changed', handleGoalsChanged)
  }, [])

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
        passingThreshold: goals.passingThreshold,
        excellenceThreshold: goals.excellenceThreshold,
        targetSeconds: goals.targetSeconds,
        examMode: 'tutor',
      }
    })
  }

  const handleStartMockExam = () => {
    // Standard mock exam is 40 questions (or capped by available if filtered)
    const effectiveBlockSize = Math.min(blockCount[0], totalAvailableInSelection || blockCount[0])
    const payload: SessionPayload = {
      qbank: selectedQbank,
      block_size: effectiveBlockSize,
      ...(selectedQbank === "medqa_usmle" ? { exam_type: examTarget } : {}),
      ...(!selectedSubjects.includes('All Subjects') ? { subjects: selectedSubjects } : {})
    }

    sessionMutation.mutate({
      ...payload,
      customConfig: {
        passingThreshold: goals.passingThreshold,
        excellenceThreshold: goals.excellenceThreshold,
        targetSeconds: goals.targetSeconds,
        examMode: 'mock_exam',
        timeLimitSeconds: examDurationMinutes * 60,
      }
    })
  }

  // Target bank display label
  const qbankDisplayLabel = useMemo(() => {
    if (selectedQbank === "medmcqa") return "MedMCQA"
    if (examTarget === "USMLE Step 2 and Step 3") return "USMLE Step 2 & 3"
    return examTarget
  }, [selectedQbank, examTarget])

  // Subjects display label
  const subjectsDisplayLabel = useMemo(() => {
    if (selectedSubjects.includes('All Subjects')) return 'All subjects'
    if (selectedSubjects.length === 1) return selectedSubjects[0]
    return `${selectedSubjects.length} subjects selected`
  }, [selectedSubjects])

  return (
    <div className="animate-in fade-in duration-500">
      {/* Top Header: Fraunces Display Title & Quick Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-4 pb-10">
        <div>
          <h1 className="font-heading font-medium text-4xl sm:text-5xl md:text-[48px] text-[#1E2B27] dark:text-white tracking-tight leading-[1.1]">
            Create session
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/analytics">
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-full border-[#E3E8E5] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#1E2B27] dark:text-slate-200 text-xs px-4 h-10 shadow-[0_1px_2px_rgba(30,43,39,0.05)]"
            >
              <BarChart3 className="w-3.5 h-3.5 mr-1.5 text-[#4F5C57]" />
              {stats?.total_answered || 0} Answered ({stats?.global_accuracy || 0}%)
            </Button>
          </Link>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-10 lg:gap-14 items-start">
        {/* Left Column: Sequential Flow Steps */}
        <div className="flex flex-col gap-10">
          <QbankSelector
            selectedQbank={selectedQbank}
            examTarget={examTarget}
            onSelectStep1={() => {
              setSelectedQbank("medqa_usmle")
              setExamTarget("USMLE Step 1")
              setSelectedSubjects(['All Subjects'])
            }}
            onSelectStep2And3={() => {
              setSelectedQbank("medqa_usmle")
              setExamTarget("USMLE Step 2 and Step 3")
              setSelectedSubjects(['All Subjects'])
            }}
            onSelectMedMCQA={() => {
              setSelectedQbank("medmcqa")
              setSelectedSubjects(['All Subjects'])
            }}
          />

          <SubjectSelector
            availableSubjects={availableSubjects}
            isLoadingSubjects={isLoadingSubjects}
            selectedSubjects={selectedSubjects}
            subjectSearch={subjectSearch}
            onSubjectSearchChange={setSubjectSearch}
            onToggleSubject={handleToggleSubject}
            onSelectAll={() => setSelectedSubjects(['All Subjects'])}
            filteredSubjects={filteredSubjects}
            totalAvailableInSelection={totalAvailableInSelection}
          />

          <section className="space-y-6">
            <BlockSizeSelector
              blockCount={blockCount}
              setBlockCount={setBlockCount}
              maxAvailable={totalAvailableInSelection}
            />

            <ExamTimeSelector
              durationMinutes={examDurationMinutes}
              setDurationMinutes={setExamDurationMinutes}
            />
          </section>
        </div>

        {/* Right Column: Floating Summary Card & Action Buttons */}
        {/* Right Column: Floating Summary Card & Action Buttons */}
        <aside className="lg:sticky lg:top-24 bg-[#EFF4F0] dark:bg-slate-900 border border-[#E3E8E5]/60 dark:border-slate-800 rounded-[28px] p-7 sm:p-8 flex flex-col gap-6 shadow-[0_4px_20px_rgba(30,43,39,0.04)]">
          <div>
            {/* Header: Quick start as title with Zap icon, Your session as subtitle with Edit goals */}
            <div className="flex items-center gap-2 text-[#0B7A5A] dark:text-emerald-400 font-heading font-medium text-[22px]">
              <Zap className="w-5 h-5 fill-current shrink-0" />
              <span>Quick start</span>
            </div>

            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-[12px] tracking-[0.08em] uppercase text-[#35433E] dark:text-slate-300 font-semibold">
                Your session
              </span>
              <button
                type="button"
                onClick={() => setIsPresetModalOpen(true)}
                className="text-[13px] font-semibold text-[#0B7A5A] dark:text-emerald-400 hover:underline cursor-pointer bg-transparent border-0 p-0"
              >
                Edit preset
              </button>
            </div>
            
            <div className="mt-5 flex flex-col gap-3.5">
              <div>
                <div className="text-[13px] text-[#35433E] dark:text-slate-300 font-medium">Bank</div>
                <div className="text-[17px] font-semibold text-[#1E2B27] dark:text-white mt-0.5">
                  {qbankDisplayLabel}
                </div>
              </div>

              <div>
                <div className="text-[13px] text-[#35433E] dark:text-slate-300 font-medium">Subjects</div>
                <div className="text-[17px] font-semibold text-[#1E2B27] dark:text-white mt-0.5 truncate">
                  {subjectsDisplayLabel}
                </div>
              </div>

              <div>
                <div className="text-[13px] text-[#35433E] dark:text-slate-300 font-medium">Questions</div>
                <div className="text-[17px] font-semibold text-[#1E2B27] dark:text-white mt-0.5">
                  {blockCount[0]} in this block
                </div>
              </div>

              <div>
                <div className="text-[13px] text-[#35433E] dark:text-slate-300 font-medium">Timed exam</div>
                <div className="text-[17px] font-semibold text-[#1E2B27] dark:text-white mt-0.5">
                  {examDurationMinutes} min
                </div>
              </div>
            </div>
          </div>

          {/* Action Launch Buttons */}
          <div className="flex flex-col gap-3 pt-1">
            <button
              onClick={handleStartSession}
              disabled={sessionMutation.isPending || totalAvailableInSelection === 0}
              className="w-full min-h-[54px] rounded-2xl bg-[#0B7A5A] hover:bg-[#0B7A5A]/90 text-white font-semibold text-[16px] shadow-[0_10px_24px_rgba(11,122,90,0.22)] transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {sessionMutation.isPending ? (
                'Generating Session...'
              ) : (
                <>
                  <BookOpen className="w-4 h-4" />
                  <span>Start practice</span>
                </>
              )}
            </button>

            <button
              onClick={handleStartMockExam}
              disabled={sessionMutation.isPending || totalAvailableInSelection === 0}
              className="w-full min-h-[54px] rounded-2xl bg-[#434575] hover:bg-[#393A64] text-white font-semibold text-[15px] shadow-[0_4px_14px_rgba(67,69,117,0.22)] transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {sessionMutation.isPending ? (
                'Preparing Exam...'
              ) : (
                <>
                  <GraduationCap className="w-4 h-4" />
                  <span>Start exam</span>
                </>
              )}
            </button>
          </div>
        </aside>
      </div>

      <GoalsModal
        isOpen={isGoalsModalOpen}
        onClose={() => setIsGoalsModalOpen(false)}
        onGoalsUpdated={(newGoals) => setGoals(newGoals)}
      />

      <PresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        onPresetSaved={(newPreset) => {
          setSelectedQbank(newPreset.selectedQbank);
          setExamTarget(newPreset.examTarget);
          setBlockCount([newPreset.blockCount]);
          setSelectedSubjects(newPreset.selectedSubjects);
          setExamDurationMinutes(newPreset.examDurationMinutes);
          if (newPreset.paceTargetSeconds) {
            const updatedGoals = { ...goals, targetSeconds: newPreset.paceTargetSeconds };
            setGoals(updatedGoals);
            saveStoredGoals(updatedGoals);
          }
        }}
      />
    </div>
  )
}