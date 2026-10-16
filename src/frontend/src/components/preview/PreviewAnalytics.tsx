import { useState } from 'react'
import { BookOpen, GraduationCap, Layers } from 'lucide-react'

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
    <div className="space-y-6 select-text">
      {/* 1. Header with Daily Target Meter matching Analytics.tsx */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-3 border-b border-[#E3E8E5] dark:border-slate-800">
        <div>
          <div className="text-[11px] tracking-[0.08em] uppercase text-[#4F5C57] dark:text-slate-400 font-semibold">
            Study Analytics Demo
          </div>
          <h2 className="font-heading font-medium text-2xl text-[#1E2B27] dark:text-white mt-0.5">
            Your progress
          </h2>
        </div>

        <div className="w-full sm:w-56 pb-0.5">
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="text-[#3E4A45] dark:text-slate-400 font-medium">Daily target</span>
            <span className="font-heading font-medium text-[16px] text-[#1E2B27] dark:text-white">
              {todayAnswered} <span className="text-xs font-normal text-[#4F5C57]">of {dailyGoal} today</span>
            </span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-[#EDF0EE] dark:bg-slate-800 overflow-hidden">
            <div 
              className="h-full rounded-full bg-[#0B7A5A] transition-all duration-500" 
              style={{ width: `${progressPercent}%` }} 
            />
          </div>
        </div>
      </div>

      {/* 2. Floating Fraunces KPI Stats Row */}
      <div className="grid grid-cols-3 gap-4 py-1">
        <div>
          <div className="font-heading font-medium text-2xl sm:text-3xl text-[#1E2B27] dark:text-white leading-[1.1]">
            420
          </div>
          <div className="mt-1 text-[13px] font-semibold text-[#1E2B27] dark:text-slate-200">
            Total answered
          </div>
          <div className="mt-0.5 text-[11px] text-[#4F5C57] dark:text-slate-400 leading-tight">
            6.0% of question bank
          </div>
        </div>

        <div>
          <div className="font-heading font-medium text-2xl sm:text-3xl text-[#1E2B27] dark:text-white leading-[1.1]">
            76.2%
          </div>
          <div className="mt-1 text-[13px] font-semibold text-[#1E2B27] dark:text-slate-200">
            Global accuracy
          </div>
          <div className="mt-0.5 text-[11px] text-[#4F5C57] dark:text-slate-400 leading-tight">
            Goal: 80% mastery
          </div>
        </div>

        <div>
          <div className="font-heading font-medium text-2xl sm:text-3xl text-[#1E2B27] dark:text-white leading-[1.1]">
            8 days
          </div>
          <div className="mt-1 text-[13px] font-semibold text-[#1E2B27] dark:text-slate-200">
            Current streak
          </div>
          <div className="mt-0.5 text-[11px] text-[#4F5C57] dark:text-slate-400 leading-tight">
            Keep momentum rolling
          </div>
        </div>
      </div>

      {/* 3. Scope Readiness Breakdown Card */}
      <div className="w-full bg-[#FAF9F6] dark:bg-slate-900/60 border border-[#E3E8E5] dark:border-slate-800 rounded-[24px] p-5 space-y-4">
        {/* Scope Pill Switcher */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedExamScope('USMLE Step 1')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              selectedExamScope === 'USMLE Step 1'
                ? 'bg-[#1E2B27] text-white dark:bg-white dark:text-[#1E2B27] shadow-2xs'
                : 'bg-white dark:bg-slate-800 border border-[#E3E8E5] dark:border-slate-700 text-[#4F5C57] dark:text-slate-300 hover:text-[#1E2B27]'
            }`}
          >
            <BookOpen className="w-3 h-3 text-[#0B7A5A]" />
            <span>USMLE Step 1</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedExamScope('USMLE Step 2 & 3')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              selectedExamScope === 'USMLE Step 2 & 3'
                ? 'bg-[#1E2B27] text-white dark:bg-white dark:text-[#1E2B27] shadow-2xs'
                : 'bg-white dark:bg-slate-800 border border-[#E3E8E5] dark:border-slate-700 text-[#4F5C57] dark:text-slate-300 hover:text-[#1E2B27]'
            }`}
          >
            <GraduationCap className="w-3 h-3 text-[#0B7A5A]" />
            <span>USMLE Step 2 & 3</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedExamScope('MedMCQA')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              selectedExamScope === 'MedMCQA'
                ? 'bg-[#1E2B27] text-white dark:bg-white dark:text-[#1E2B27] shadow-2xs'
                : 'bg-white dark:bg-slate-800 border border-[#E3E8E5] dark:border-slate-700 text-[#4F5C57] dark:text-slate-300 hover:text-[#1E2B27]'
            }`}
          >
            <Layers className="w-3 h-3 text-[#434575]" />
            <span>MedMCQA</span>
          </button>
        </div>

        {/* Discipline Bars */}
        <div className="space-y-3 pt-1">
          {subjects.map((s) => {
            const isMastery = s.accuracy >= 80
            const isPassing = s.accuracy >= 65
            return (
              <div key={s.subject} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#1E2B27] dark:text-slate-200">{s.subject}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#4F5C57] dark:text-slate-400">{s.totalAnswered} questions</span>
                    <span className={`font-semibold ${isMastery ? 'text-[#0A5A43] dark:text-emerald-300' : isPassing ? 'text-[#0B7A5A] dark:text-emerald-400' : 'text-[#8A2F16] dark:text-rose-300'}`}>
                      {s.accuracy.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-[#EDF0EE] dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${s.accuracy}%` }}
                    className={`h-full rounded-full transition-all duration-300 ${
                      isMastery ? 'bg-[#0B7A5A]' : isPassing ? 'bg-[#10B981]' : 'bg-[#C9573A]'
                    }`}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
