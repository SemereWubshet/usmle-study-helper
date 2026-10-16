import { Check, AlertTriangle, Sparkles, Clock, Target } from 'lucide-react'

interface ExecutiveScorecardProps {
  accuracyPercentage: number;
  correctCount: number;
  answeredCount: number;
  totalQuestions: number;
  averageSecondsPerQuestion: number;
  totalTimeSeconds: number;
  fastestSeconds: number;
  passingThreshold: number;
  excellenceThreshold: number;
  targetSeconds: number;
}

export function ExecutiveScorecard({
  accuracyPercentage,
  correctCount,
  answeredCount,
  totalQuestions,
  averageSecondsPerQuestion,
  totalTimeSeconds,
  fastestSeconds,
  passingThreshold,
  excellenceThreshold,
  targetSeconds,
}: ExecutiveScorecardProps) {
  const isPassing = accuracyPercentage >= passingThreshold
  const isExcellent = accuracyPercentage >= excellenceThreshold
  const isOnPace = averageSecondsPerQuestion <= targetSeconds
  const diffSeconds = averageSecondsPerQuestion - targetSeconds

  const formatTotalTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-[#E3E8E5] dark:border-slate-800 rounded-[28px] p-6 sm:p-8 shadow-[0_1px_3px_rgba(30,43,39,0.06)]">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 divide-y md:divide-y-0 md:divide-x divide-[#E3E8E5] dark:divide-slate-800">
        {/* Floating Stat 1: Block Accuracy */}
        <div className="flex flex-col justify-between pt-0 md:pt-0">
          <div>
            <div className="text-[12px] tracking-[0.08em] uppercase text-[#4F5C57] dark:text-slate-400 font-semibold">
              Block Accuracy
            </div>
            <div className="mt-2 flex items-baseline gap-2.5">
              <span className="font-heading font-medium text-4xl sm:text-5xl text-[#1E2B27] dark:text-white tracking-tight">
                {accuracyPercentage.toFixed(1)}%
              </span>
              <span className="text-[14px] font-medium text-[#4F5C57] dark:text-slate-400">
                ({correctCount} / {answeredCount || totalQuestions})
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            {isExcellent ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E3F2EA] dark:bg-emerald-950/70 text-[#0B5F46] dark:text-emerald-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" /> High-Yield Mastery (≥{excellenceThreshold}%)
              </span>
            ) : isPassing ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E3F2EA] dark:bg-emerald-950/70 text-[#0B5F46] dark:text-emerald-300 text-xs font-semibold">
                <Check className="w-3.5 h-3.5" /> Passing Standard (≥{passingThreshold}%)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FCEDE8] dark:bg-rose-950/70 text-[#8A2F16] dark:text-rose-300 text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" /> Needs Review (&lt;{passingThreshold}%)
              </span>
            )}
          </div>
        </div>

        {/* Floating Stat 2: Pacing Analytics */}
        <div className="flex flex-col justify-between pt-6 md:pt-0 md:pl-8">
          <div>
            <div className="text-[12px] tracking-[0.08em] uppercase text-[#4F5C57] dark:text-slate-400 font-semibold">
              Pacing Analytics
            </div>
            <div className="mt-2 flex items-baseline gap-2.5">
              <span className="font-heading font-medium text-4xl sm:text-5xl text-[#1E2B27] dark:text-white tracking-tight">
                {averageSecondsPerQuestion}s
              </span>
              <span className="text-[14px] font-medium text-[#4F5C57] dark:text-slate-400">
                / question avg
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            {isOnPace ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E3F2EA] dark:bg-emerald-950/70 text-[#0B5F46] dark:text-emerald-300 text-xs font-semibold">
                <Clock className="w-3.5 h-3.5" /> On Target Pace (≤{targetSeconds}s)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                <Clock className="w-3.5 h-3.5" /> +{diffSeconds}s over target ({targetSeconds}s)
              </span>
            )}
          </div>
        </div>

        {/* Floating Stat 3: Session Duration & Speed */}
        <div className="flex flex-col justify-between pt-6 md:pt-0 md:pl-8">
          <div>
            <div className="text-[12px] tracking-[0.08em] uppercase text-[#4F5C57] dark:text-slate-400 font-semibold">
              Total Elapsed Time
            </div>
            <div className="mt-2 flex items-baseline gap-2.5">
              <span className="font-heading font-medium text-4xl sm:text-5xl text-[#1E2B27] dark:text-white tracking-tight">
                {formatTotalTime(totalTimeSeconds)}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            {fastestSeconds > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDF0EE] dark:bg-slate-800 text-[#3E4A45] dark:text-slate-300 text-xs font-medium">
                <Target className="w-3.5 h-3.5 text-[#0B7A5A] dark:text-emerald-400" />
                Fastest response: {fastestSeconds}s
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDF0EE] dark:bg-slate-800 text-[#3E4A45] dark:text-slate-300 text-xs font-medium">
                {totalQuestions} questions completed
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

