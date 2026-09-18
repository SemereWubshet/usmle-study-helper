import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { StoredAttempt } from '../types'

interface QuestionNavigatorProps {
  totalQuestions: number;
  attempts: Record<number, StoredAttempt>;
  selectedReviewIndex: number;
  onSelectReviewIndex: (index: number) => void;
  reviewFilter: 'all' | 'incorrect' | 'correct';
  onChangeReviewFilter: (filter: 'all' | 'incorrect' | 'correct') => void;
  filteredIndexes: number[];
}

export function QuestionNavigator({
  totalQuestions,
  attempts,
  selectedReviewIndex,
  onSelectReviewIndex,
  reviewFilter,
  onChangeReviewFilter,
  filteredIndexes,
}: QuestionNavigatorProps) {
  const attemptsList = Object.values(attempts)
  const correctCount = attemptsList.filter(a => a.isCorrect).length
  const incorrectCount = attemptsList.filter(a => !a.isCorrect).length

  return (
    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
              Question Navigator
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Click any question tile to inspect your answer, time spent, and learning pearls.
            </CardDescription>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700/60 text-xs font-medium">
            <button
              type="button"
              onClick={() => onChangeReviewFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${reviewFilter === 'all' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
            >
              All ({totalQuestions})
            </button>
            <button
              type="button"
              onClick={() => onChangeReviewFilter('incorrect')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${reviewFilter === 'incorrect' ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'}`}
            >
              <span>Incorrect</span>
              <span className="bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                {incorrectCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onChangeReviewFilter('correct')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${reviewFilter === 'correct' ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'}`}
            >
              <span>Correct</span>
              <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                {correctCount}
              </span>
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {filteredIndexes.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            {reviewFilter === 'incorrect' ? '🎉 Amazing! Zero incorrect questions in this block.' : 'No questions found for this filter.'}
          </div>
        ) : (
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2.5">
            {filteredIndexes.map((qIdx) => {
              const att = attempts[qIdx]
              const isSelected = selectedReviewIndex === qIdx
              const isCorrect = att?.isCorrect === true
              const isAnswered = Boolean(att)

              let tileStyle = 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100'

              if (isAnswered) {
                if (isCorrect) {
                  tileStyle = 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/60'
                } else {
                  tileStyle = 'border-rose-300 dark:border-rose-800/80 bg-rose-50/80 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 hover:bg-rose-100/60'
                }
              }

              const ringStyle = isSelected ? 'ring-2 ring-indigo-600 ring-offset-2 dark:ring-offset-slate-900 font-bold shadow-sm scale-105 z-10' : ''

              return (
                <button
                  key={qIdx}
                  type="button"
                  onClick={() => onSelectReviewIndex(qIdx)}
                  className={`h-11 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer relative ${tileStyle} ${ringStyle}`}
                >
                  <span className="text-xs">{qIdx + 1}</span>
                  {att && (
                    <span className="text-[9px] opacity-70">
                      {att.timeSpent}s
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

