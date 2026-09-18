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
import { Zap, ArrowRight, BarChart3 } from 'lucide-react'

import { QbankSelector } from '@/features/dashboard/components/QbankSelector'
import { SubjectSelector } from '@/features/dashboard/components/SubjectSelector'
import { BlockSizeSelector } from '@/features/dashboard/components/BlockSizeSelector'
import { AdvancedBenchmarks } from '@/features/dashboard/components/AdvancedBenchmarks'

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
            Create Session
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Build customized practice sessions or launch an instant one
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

          <BlockSizeSelector
            blockCount={blockCount}
            setBlockCount={setBlockCount}
            maxAvailable={totalAvailableInSelection}
          />

          <AdvancedBenchmarks
            showAdvanced={showAdvanced}
            setShowAdvanced={setShowAdvanced}
            passingThreshold={passingThreshold}
            setPassingThreshold={setPassingThreshold}
            excellenceThreshold={excellenceThreshold}
            setExcellenceThreshold={setExcellenceThreshold}
            targetSeconds={targetSeconds}
            setTargetSeconds={setTargetSeconds}
          />

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