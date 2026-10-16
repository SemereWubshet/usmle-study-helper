import { QuestionExplanationCard } from './QuestionExplanationCard'
import type { QuestionExportData } from '@/utils/promptTemplates'
import type { Question, AttemptOut } from '@/api'

interface ActiveQuestionCardProps {
  question?: Question;
  options: string[];
  selectedOption: number | null;
  struckOptions: number[];
  attemptResult: AttemptOut | null;
  isSubmitting: boolean;
  isLastQuestion: boolean;
  examMode?: 'tutor' | 'mock_exam';
  onSelectOption: (idx: number) => void;
  onToggleStrike: (e: React.MouseEvent, idx: number) => void;
  onSubmit: () => void;
  onNext: () => void;
}

export function ActiveQuestionCard({
  question,
  options,
  selectedOption,
  struckOptions,
  attemptResult,
  isSubmitting,
  isLastQuestion,
  examMode = 'tutor',
  onSelectOption,
  onToggleStrike,
  onSubmit,
  onNext,
}: ActiveQuestionCardProps) {
  const optionsRecord: Record<string, string> = {}
  options.forEach((opt, idx) => {
    optionsRecord[String.fromCharCode(65 + idx)] = opt
  })

  const exportData: QuestionExportData = {
    questionText: question?.question || '',
    options: optionsRecord,
    correctOption: attemptResult ? `${String.fromCharCode(65 + attemptResult.correct_option)}) ${options[attemptResult.correct_option] || ''}` : undefined,
    selectedOption: selectedOption !== null ? `${String.fromCharCode(65 + selectedOption)}) ${options[selectedOption] || ''}` : undefined,
    isCorrect: attemptResult?.is_correct,
    subject: question?.subject || undefined,
    rationale: question?.explanation || undefined,
  }

  return (
    <>
      <div className="w-full bg-white dark:bg-slate-900 border border-[#E3E8E5] dark:border-slate-800 shadow-[0_1px_3px_rgba(30,43,39,0.06)] rounded-[28px] p-6 sm:p-10 space-y-7">
        {/* Subject Tag */}
        <div>
          {question?.subject && (
            <span className="inline-block px-3.5 py-1.5 rounded-full bg-[#E3F2EA] dark:bg-emerald-950/70 text-[#0B5F46] dark:text-emerald-300 text-[13px] font-semibold">
              {question.subject}
            </span>
          )}

          {/* Vignette Text in Fraunces editorial serif */}
          <p className="mt-4 font-heading font-normal text-lg sm:text-[20px] leading-[1.75] text-[#1E2B27] dark:text-slate-100 select-text">
            {question?.question}
          </p>
        </div>

        {/* Options list */}
        <div className="space-y-3">
          {options.map((optText: string, idx: number) => {
            const isSelected = selectedOption === idx
            const isStruck = struckOptions.includes(idx)

            let buttonStyle = 'border border-[#E3E8E5] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#1E2B27] dark:text-slate-200 hover:border-[#0B7A5A]/50 shadow-[0_1px_2px_rgba(30,43,39,0.04)]'
            let badgeStyle = 'bg-[#EDF0EE] dark:bg-slate-800 text-[#1E2B27] dark:text-white'
            let statusBadge = null

            if (attemptResult && examMode === 'tutor') {
              if (idx === attemptResult.correct_option) {
                buttonStyle = 'border-2 border-[#0B7A5A] bg-[#E3F2EA] dark:bg-emerald-950/60 text-[#0B5F46] dark:text-emerald-200 font-medium'
                badgeStyle = 'bg-white dark:bg-slate-900 text-[#0B5F46] dark:text-emerald-300'
                statusBadge = (
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#0B5F46] dark:text-emerald-300 shrink-0">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                    Correct answer
                  </span>
                )
              } else if (isSelected && !attemptResult.is_correct) {
                buttonStyle = 'border-2 border-[#C9573A] bg-[#FCEDE8] dark:bg-rose-950/40 text-[#8A2F16] dark:text-rose-200 font-medium'
                badgeStyle = 'bg-white dark:bg-slate-900 text-[#8A2F16] dark:text-rose-300'
                statusBadge = (
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#8A2F16] dark:text-rose-300 shrink-0">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                    Your answer
                  </span>
                )
              } else {
                buttonStyle = 'border border-[#E3E8E5] dark:border-slate-800 bg-white dark:bg-slate-950/40 text-slate-400 dark:text-slate-500 opacity-60'
              }
            } else if (isSelected) {
              buttonStyle = 'border-2 border-[#0B7A5A] bg-[#E3F2EA]/40 dark:bg-emerald-950/30 text-[#0B5F46] dark:text-emerald-300 font-medium'
              badgeStyle = 'bg-[#0B7A5A] text-white'
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectOption(idx)}
                onContextMenu={(e) => onToggleStrike(e, idx)}
                disabled={Boolean(attemptResult && examMode === 'tutor')}
                className={`w-full text-left p-3.5 sm:p-4 rounded-[18px] transition-all flex items-center justify-between gap-3.5 cursor-pointer min-h-[58px] ${buttonStyle} ${
                  isStruck && !attemptResult ? 'line-through opacity-40 text-slate-400' : ''
                }`}
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[13px] shrink-0 select-none shadow-2xs ${badgeStyle}`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-[16px] font-medium leading-relaxed select-text truncate">
                    {optText}
                  </span>
                </div>
                {statusBadge}
              </button>
            )
          })}
        </div>

        {/* Footer Action Buttons */}
        <div className="flex items-center justify-between border-t border-[#E3E8E5] dark:border-slate-800 pt-5 flex-wrap gap-4">
          <span className="text-[13px] text-[#4F5C57] dark:text-slate-400">
            Press Enter to continue
          </span>

          {examMode === 'mock_exam' ? (
            <button
              onClick={onSubmit}
              disabled={selectedOption === null || isSubmitting}
              className="min-h-[48px] px-7 rounded-full bg-[#0B7A5A] hover:bg-[#0B7A5A]/90 text-white font-semibold text-[15px] shadow-[0_8px_20px_rgba(11,122,90,0.2)] transition-all cursor-pointer disabled:opacity-40"
            >
              {isSubmitting ? 'Saving...' : isLastQuestion ? 'Finish & review block →' : 'Next question →'}
            </button>
          ) : !attemptResult ? (
            <button
              onClick={onSubmit}
              disabled={selectedOption === null || isSubmitting}
              className="min-h-[48px] px-7 rounded-full bg-[#0B7A5A] hover:bg-[#0B7A5A]/90 text-white font-semibold text-[15px] shadow-[0_8px_20px_rgba(11,122,90,0.2)] transition-all cursor-pointer disabled:opacity-40"
            >
              {isSubmitting ? 'Checking...' : 'Submit answer'}
            </button>
          ) : (
            <button
              onClick={onNext}
              className="min-h-[48px] px-7 rounded-full bg-[#0B7A5A] hover:bg-[#0B7A5A]/90 text-white font-semibold text-[15px] shadow-[0_8px_20px_rgba(11,122,90,0.2)] transition-all cursor-pointer"
            >
              {isLastQuestion ? 'Finish & review block →' : 'Next question →'}
            </button>
          )}
        </div>
      </div>

      {/* Unified Explanation & AI Rationale Card when answered in tutor mode */}
      {attemptResult && examMode === 'tutor' && (
        <QuestionExplanationCard
          questionId={question?.id || 'active-q'}
          questionText={question?.question || ''}
          options={options}
          correctAnswerText={question?.correct_text || options[attemptResult.correct_option] || ''}
          correctOptionIndex={attemptResult.correct_option}
          selectedOptionIndex={selectedOption}
          officialExplanation={question?.explanation}
          subject={question?.subject || undefined}
          isCorrect={attemptResult.is_correct}
          exportData={exportData}
          isReviewView={false}
        />
      )}
    </>
  )
}
