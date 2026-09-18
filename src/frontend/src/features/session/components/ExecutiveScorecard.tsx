import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Check, AlertTriangle, Clock, Trophy, Award, Sparkles } from 'lucide-react'

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
  const incorrectCount = answeredCount - correctCount

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* Card 1: Score & Mastery */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardDescription className="text-xs uppercase font-semibold tracking-wider text-slate-500">
              Block Accuracy
            </CardDescription>
            <div className={`p-2 rounded-xl ${isPassing ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'}`}>
              {isExcellent ? <Trophy className="w-5 h-5" /> : <Award className="w-5 h-5" />}
            </div>
          </div>
          <div className="flex items-baseline space-x-2 pt-2">
            <span className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {accuracyPercentage.toFixed(1)}%
            </span>
            <span className="text-sm font-medium text-slate-500">
              ({correctCount} / {answeredCount || totalQuestions} correct)
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex items-center space-x-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            {isExcellent ? (
              <Badge className="bg-emerald-600 text-white border-none text-xs gap-1">
                <Sparkles className="w-3 h-3" /> High-Yield Mastery (≥{excellenceThreshold}%)
              </Badge>
            ) : isPassing ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 text-xs gap-1">
                <Check className="w-3 h-3" /> Passing Standard (≥{passingThreshold}%)
              </Badge>
            ) : (
              <Badge className="bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300 text-xs gap-1">
                <AlertTriangle className="w-3 h-3" /> Needs Review (&lt;{passingThreshold}%)
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Time & Pacing Analytics */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardDescription className="text-xs uppercase font-semibold tracking-wider text-slate-500">
              Pacing Analytics
            </CardDescription>
            <div className={`p-2 rounded-xl ${isOnPace ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'}`}>
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2 pt-2">
            <span className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {averageSecondsPerQuestion}s
            </span>
            <span className="text-sm font-medium text-slate-500">
              / question avg
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-slate-500">
              Total: <strong className="text-slate-700 dark:text-slate-300">{Math.floor(totalTimeSeconds / 60)}m {totalTimeSeconds % 60}s</strong>
            </span>
            {isOnPace ? (
              <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:text-emerald-400 dark:border-emerald-800">
                Target Pace (≤{targetSeconds}s)
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-400 dark:border-amber-800">
                +{averageSecondsPerQuestion - targetSeconds}s Over Target ({targetSeconds}s)
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Block Breakdown Distribution */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardDescription className="text-xs uppercase font-semibold tracking-wider text-slate-500">
              Performance Spread
            </CardDescription>
            <span className="text-xs font-semibold text-slate-400">
              {totalQuestions} Questions
            </span>
          </div>
          <div className="pt-3">
            <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`Correct: ${correctCount}`}
              />
              <div
                style={{ width: `${totalQuestions > 0 ? (incorrectCount / totalQuestions) * 100 : 0}%` }}
                className="bg-rose-500 h-full transition-all"
                title={`Incorrect: ${incorrectCount}`}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span className="text-slate-600 dark:text-slate-400 font-medium">{correctCount} Correct</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              <span className="text-slate-600 dark:text-slate-400 font-medium">{incorrectCount} Incorrect</span>
            </div>
            {fastestSeconds > 0 && (
              <span className="text-slate-400 text-[11px]">
                Fastest: {fastestSeconds}s
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
