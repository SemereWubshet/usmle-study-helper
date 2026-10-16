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
  const answeredCount = attemptsList.length

  const correctPct = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0
  const incorrectPct = totalQuestions > 0 ? (incorrectCount / totalQuestions) * 100 : 0

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-[#E3E8E5] dark:border-slate-800 rounded-[28px] p-6 sm:p-8 shadow-[0_1px_3px_rgba(30,43,39,0.06)] space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[12px] tracking-[0.08em] uppercase text-[#4F5C57] dark:text-slate-400 font-semibold">
            Question Navigator
          </div>
          <h2 className="text-xl font-semibold text-[#1E2B27] dark:text-white mt-1">
            Review Block Questions
          </h2>
        </div>

        {/* Quick Filter Pill Group */}
        <div className="inline-flex gap-1 p-1 bg-[#EDF0EE] dark:bg-slate-800/80 rounded-full border border-[#E3E8E5]/70 dark:border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onChangeReviewFilter('all')}
            className={`min-h-[36px] px-3.5 rounded-full text-[13px] font-medium transition-all cursor-pointer ${
              reviewFilter === 'all'
                ? 'bg-white dark:bg-slate-900 text-[#1E2B27] dark:text-white font-semibold shadow-[0_1px_3px_rgba(30,43,39,0.08)]'
                : 'bg-transparent text-[#3E4A45] dark:text-slate-400 hover:text-[#1E2B27]'
            }`}
          >
            All ({totalQuestions})
          </button>
          <button
            type="button"
            onClick={() => onChangeReviewFilter('incorrect')}
            className={`min-h-[36px] px-3.5 rounded-full text-[13px] font-medium transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              reviewFilter === 'incorrect'
                ? 'bg-[#FCEDE8] text-[#8A2F16] dark:bg-rose-950/70 dark:text-rose-300 font-semibold shadow-[0_1px_3px_rgba(30,43,39,0.08)]'
                : 'bg-transparent text-[#3E4A45] dark:text-slate-400 hover:text-[#8A2F16]'
            }`}
          >
            <span>Incorrect</span>
            <span className="w-5 h-5 rounded-full bg-[#8A2F16]/10 text-[#8A2F16] dark:bg-rose-950 dark:text-rose-300 inline-flex items-center justify-center text-[11px] font-bold">
              {incorrectCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onChangeReviewFilter('correct')}
            className={`min-h-[36px] px-3.5 rounded-full text-[13px] font-medium transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              reviewFilter === 'correct'
                ? 'bg-[#E3F2EA] text-[#0B5F46] dark:bg-emerald-950/70 dark:text-emerald-300 font-semibold shadow-[0_1px_3px_rgba(30,43,39,0.08)]'
                : 'bg-transparent text-[#3E4A45] dark:text-slate-400 hover:text-[#0B5F46]'
            }`}
          >
            <span>Correct</span>
            <span className="w-5 h-5 rounded-full bg-[#0B5F46]/10 text-[#0B5F46] dark:bg-emerald-950 dark:text-emerald-300 inline-flex items-center justify-center text-[11px] font-bold">
              {correctCount}
            </span>
          </button>
        </div>
      </div>

      {/* Integrated Performance Spread Bar */}
      <div className="pt-1 space-y-2">
        <div className="flex items-center justify-between text-xs text-[#4F5C57] dark:text-slate-400">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 font-medium text-[#0B5F46] dark:text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-[#0B7A5A]" />
              {correctCount} Correct ({correctPct.toFixed(0)}%)
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-[#8A2F16] dark:text-rose-300">
              <span className="w-2 h-2 rounded-full bg-[#C9573A]" />
              {incorrectCount} Missed ({incorrectPct.toFixed(0)}%)
            </span>
          </div>
          <span>{answeredCount} of {totalQuestions} answered</span>
        </div>

        <div className="h-2.5 w-full bg-[#EDF0EE] dark:bg-slate-800 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${correctPct}%` }}
            className="bg-[#0B7A5A] h-full transition-all duration-300"
            title={`Correct: ${correctCount}`}
          />
          <div
            style={{ width: `${incorrectPct}%` }}
            className="bg-[#C9573A] h-full transition-all duration-300"
            title={`Incorrect: ${incorrectCount}`}
          />
        </div>
      </div>

      {/* Tiles Grid */}
      <div>
        {filteredIndexes.length === 0 ? (
          <div className="py-8 text-center text-sm text-[#4F5C57] dark:text-slate-400">
            {reviewFilter === 'incorrect' ? '🎉 Flawless! Zero incorrect questions in this block.' : 'No questions found for this filter.'}
          </div>
        ) : (
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2.5">
            {filteredIndexes.map((qIdx) => {
              const att = attempts[qIdx]
              const isSelected = selectedReviewIndex === qIdx
              const isCorrect = att?.isCorrect === true
              const isAnswered = Boolean(att)

              let tileStyle = 'border border-[#E3E8E5] dark:border-slate-800 bg-[#FAF9F6] dark:bg-slate-800/40 text-[#4F5C57] dark:text-slate-400 hover:bg-[#EDF0EE]'

              if (isAnswered) {
                if (isCorrect) {
                  tileStyle = 'border border-[#0B7A5A]/30 bg-[#E3F2EA] dark:bg-emerald-950/40 text-[#0B5F46] dark:text-emerald-300 hover:bg-[#D4EBDD]'
                } else {
                  tileStyle = 'border border-[#C9573A]/30 bg-[#FCEDE8] dark:bg-rose-950/40 text-[#8A2F16] dark:text-rose-300 hover:bg-[#F9DCD3]'
                }
              }

              const ringStyle = isSelected
                ? 'ring-2 ring-[#0B7A5A] ring-offset-2 dark:ring-offset-slate-900 font-bold shadow-sm scale-105 z-10'
                : 'hover:scale-[1.02]'

              return (
                <button
                  key={qIdx}
                  type="button"
                  onClick={() => onSelectReviewIndex(qIdx)}
                  className={`h-12 rounded-[14px] flex flex-col items-center justify-center transition-all cursor-pointer relative select-none ${tileStyle} ${ringStyle}`}
                >
                  <span className="text-xs font-semibold">{qIdx + 1}</span>
                  {att && (
                    <span className="text-[10px] opacity-75">
                      {att.timeSpent}s
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}


