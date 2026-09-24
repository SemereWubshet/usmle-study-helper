import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Target, 
  Activity, 
  Zap, 
  BookOpen, 
  GraduationCap, 
  Layers
} from 'lucide-react'

interface SubjectStat {
  subject: string;
  totalAnswered: number;
  accuracy: number;
}

const STEP1_SUBJECTS: SubjectStat[] = [
  { subject: 'Pathology', totalAnswered: 84, accuracy: 82.1 },
  { subject: 'Pharmacology', totalAnswered: 62, accuracy: 79.0 },
  { subject: 'Microbiology', totalAnswered: 40, accuracy: 85.0 },
  { subject: 'Behavioral Sciences', totalAnswered: 32, accuracy: 68.8 },
  { subject: 'Biochemistry', totalAnswered: 28, accuracy: 71.4 },
]

const STEP2_SUBJECTS: SubjectStat[] = [
  { subject: 'Medicine', totalAnswered: 110, accuracy: 78.2 },
  { subject: 'Surgery', totalAnswered: 74, accuracy: 71.6 },
  { subject: 'Pediatrics', totalAnswered: 42, accuracy: 83.3 },
  { subject: 'Obstetrics & Gynecology', totalAnswered: 36, accuracy: 75.0 },
  { subject: 'Psychiatry', totalAnswered: 24, accuracy: 87.5 },
]

const MEDMCQA_SUBJECTS: SubjectStat[] = [
  { subject: 'Pharmacology', totalAnswered: 55, accuracy: 76.4 },
  { subject: 'Pathology', totalAnswered: 48, accuracy: 81.3 },
  { subject: 'Ophthalmology', totalAnswered: 30, accuracy: 70.0 },
  { subject: 'Forensic Medicine', totalAnswered: 22, accuracy: 86.4 },
  { subject: 'Preventive & Social Medicine', totalAnswered: 20, accuracy: 65.0 },
]

export function PreviewAnalytics() {
  const [selectedExamScope, setSelectedExamScope] = useState<'USMLE Step 1' | 'USMLE Step 2 & 3' | 'MedMCQA'>('USMLE Step 1')

  const subjects = selectedExamScope === 'USMLE Step 1'
    ? STEP1_SUBJECTS
    : selectedExamScope === 'USMLE Step 2 & 3'
    ? STEP2_SUBJECTS
    : MEDMCQA_SUBJECTS

  const dailyGoal = 40
  const todayAnswered = 28
  const progressPercent = (todayAnswered / dailyGoal) * 100

  return (
    <div className="space-y-4 select-text">
      {/* Daily Target Card matching Analytics.tsx */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 p-16 bg-emerald-500/5 blur-2xl rounded-full" />
        <CardContent className="p-4 space-y-3 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Daily Target</h4>
              <p className="text-xs text-slate-500">
                You are 12 questions away from your daily goal of {dailyGoal}.
              </p>
            </div>
            <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 text-xs">
              70% Complete
            </Badge>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-700 dark:text-slate-300">{todayAnswered} Answered Today</span>
              <span className="text-emerald-600 dark:text-emerald-400">{dailyGoal} Goal</span>
            </div>
            <Progress value={progressPercent} className="h-2 bg-slate-100 dark:bg-slate-800" />
          </div>
        </CardContent>
      </Card>

      {/* Global 3-Metric Mini Row */}
      <div className="grid grid-cols-3 gap-2.5">
        <Card className="p-3 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-center">
          <Target className="w-4 h-4 mx-auto mb-1 text-blue-600 dark:text-blue-400" />
          <p className="text-[10px] text-slate-500">Total Answered</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">420</p>
        </Card>

        <Card className="p-3 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-center">
          <Activity className="w-4 h-4 mx-auto mb-1 text-emerald-600 dark:text-emerald-400" />
          <p className="text-[10px] text-slate-500">Accuracy</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">76.2%</p>
        </Card>

        <Card className="p-3 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-center">
          <Zap className="w-4 h-4 mx-auto mb-1 text-orange-600 dark:text-orange-400" />
          <p className="text-[10px] text-slate-500">Streak</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">8 Days</p>
        </Card>
      </div>

      {/* Scope Readiness Card with Exam Scope Selector */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Scope Selector Header Tabs */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedExamScope('USMLE Step 1')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedExamScope === 'USMLE Step 1'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <BookOpen className="w-3 h-3 text-emerald-500" />
              <span>USMLE Step 1</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedExamScope('USMLE Step 2 & 3')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedExamScope === 'USMLE Step 2 & 3'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <GraduationCap className="w-3 h-3 text-emerald-500" />
              <span>USMLE Step 2 & 3</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedExamScope('MedMCQA')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedExamScope === 'MedMCQA'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Layers className="w-3 h-3 text-indigo-500" />
              <span>MedMCQA</span>
            </button>
          </div>
        </div>

        {/* Discipline Readiness Bars */}
        <CardContent className="p-3.5 space-y-2.5">
          {subjects.map((s) => {
            const isPassing = s.accuracy >= 65
            return (
              <div key={s.subject} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{s.subject}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] text-slate-400">{s.totalAnswered} q</span>
                    <span className={`font-bold ${isPassing ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {s.accuracy.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${s.accuracy}%` }}
                    className={`h-full rounded-full transition-all ${
                      s.accuracy >= 80 ? 'bg-emerald-500' : s.accuracy >= 70 ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
