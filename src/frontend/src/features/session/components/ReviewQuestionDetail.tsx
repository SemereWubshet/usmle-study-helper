import { Clock } from 'lucide-react'
import { QuestionExplanationCard } from './QuestionExplanationCard'
import type { QuestionExportData } from '@/utils/promptTemplates'
import type { StoredAttempt } from '../types'
import type { Question } from '@/api'

interface ReviewQuestionDetailProps {
  questionIndex: number;
  totalQuestions: number;
  question?: Question;
  attempt?: StoredAttempt;
  fallbackQuestionId?: string;
}

export function ReviewQuestionDetail({
  questionIndex,
  totalQuestions,
  question,
  attempt,
  fallbackQuestionId,
}: ReviewQuestionDetailProps) {
  const currentQuestionText = question?.question || attempt?.questionText || `Question ID: ${fallbackQuestionId}`
  const rawOptions: string[] = question?.options || attempt?.options || []
  const optionsRecord: Record<string, string> = {}
  rawOptions.forEach((opt, idx) => {
    const letter = String.fromCharCode(65 + idx)
    optionsRecord[letter] = opt
  })

  let correctKey = ''
  if (attempt?.correctOption !== undefined && attempt.correctOption >= 0) {
    correctKey = `${String.fromCharCode(65 + attempt.correctOption)}) ${rawOptions[attempt.correctOption] || ''}`
  } else if (attempt?.correctText) {
    correctKey = attempt.correctText
  }

  let selectedKey = ''
  if (attempt?.selectedOption !== undefined && attempt.selectedOption >= 0) {
    selectedKey = `${String.fromCharCode(65 + attempt.selectedOption)}) ${rawOptions[attempt.selectedOption] || ''}`
  }

  const exportPromptData: QuestionExportData = {
    questionText: currentQuestionText,
    options: optionsRecord,
    correctOption: correctKey,
    selectedOption: selectedKey,
    isCorrect: attempt?.isCorrect,
    subject: question?.subject || attempt?.subject || undefined,
    rationale: question?.explanation || attempt?.explanation || undefined,
  }

  const explanation = question?.explanation || attempt?.explanation

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-[#E3E8E5] dark:border-slate-800 shadow-[0_1px_3px_rgba(30,43,39,0.06)] rounded-[28px] p-6 sm:p-10 space-y-7">
      {/* Top Meta Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3E8E5] dark:border-slate-800 pb-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#1E2B27] text-white dark:bg-white dark:text-[#1E2B27]">
            Question {questionIndex + 1} of {totalQuestions}
          </span>
          {question?.subject && (
            <span className="px-3.5 py-1 rounded-full bg-[#E3F2EA] dark:bg-emerald-950/70 text-[#0B5F46] dark:text-emerald-300 text-[13px] font-semibold">
              {question.subject}
            </span>
          )}
        </div>

        {attempt && (
          <div className="flex items-center gap-1.5 text-xs text-[#35433E] dark:text-slate-300">
            <Clock className="w-3.5 h-3.5 text-[#35433E] dark:text-slate-300" />
            <span>Time spent: <strong className="text-[#1E2B27] dark:text-white font-semibold">{attempt.timeSpent}s</strong></span>
          </div>
        )}
      </div>

      {/* Vignette in Fraunces editorial serif */}
      <p className="font-heading font-normal text-lg sm:text-[20px] leading-[1.75] text-[#1E2B27] dark:text-slate-100 select-text">
        {currentQuestionText}
      </p>

      {/* Options List with Soft Pill Badges */}
      <div className="space-y-3">
        {rawOptions.map((optText: string, optIdx: number) => {
          const wasChosen = attempt?.selectedOption === optIdx
          const wasCorrect = attempt?.correctOption === optIdx

          let buttonStyle = 'border border-[#E3E8E5] dark:border-slate-800 bg-white dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 opacity-60'
          let badgeStyle = 'bg-[#EDF0EE] dark:bg-slate-800 text-[#1E2B27] dark:text-white'
          let statusBadge = null

          if (wasCorrect) {
            buttonStyle = 'border-2 border-[#0B7A5A] bg-[#E3F2EA] dark:bg-emerald-950/60 text-[#0B5F46] dark:text-emerald-200 font-medium'
            badgeStyle = 'bg-white dark:bg-slate-900 text-[#0B5F46] dark:text-emerald-300 shadow-2xs'
            statusBadge = (
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#0B5F46] dark:text-emerald-300 shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5 9-10" />
                </svg>
                Correct answer
              </span>
            )
          } else if (wasChosen && !wasCorrect) {
            buttonStyle = 'border-2 border-[#C9573A] bg-[#FCEDE8] dark:bg-rose-950/40 text-[#8A2F16] dark:text-rose-200 font-medium'
            badgeStyle = 'bg-white dark:bg-slate-900 text-[#8A2F16] dark:text-rose-300 shadow-2xs'
            statusBadge = (
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#8A2F16] dark:text-rose-300 shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
                Your answer
              </span>
            )
          }

          return (
            <div
              key={optIdx}
              className={`w-full text-left p-3.5 sm:p-4 rounded-[18px] transition-all flex items-center justify-between gap-3.5 min-h-[58px] ${buttonStyle}`}
            >
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[13px] shrink-0 select-none ${badgeStyle}`}>
                  {String.fromCharCode(65 + optIdx)}
                </span>
                <span className="text-[16px] leading-relaxed select-text truncate">
                  {optText}
                </span>
              </div>
              {statusBadge}
            </div>
          )
        })}
      </div>

      {/* Unified Explanation & AI Rationale Card */}
      <div className="mt-8 pt-4">
        <QuestionExplanationCard
          questionId={question?.id || attempt?.questionId || fallbackQuestionId || `rev-${questionIndex}`}
          questionText={currentQuestionText}
          options={rawOptions}
          correctAnswerText={question?.correct_text || attempt?.correctText || rawOptions[attempt?.correctOption ?? 0] || ''}
          correctOptionIndex={attempt?.correctOption ?? 0}
          selectedOptionIndex={attempt?.selectedOption ?? null}
          officialExplanation={explanation}
          subject={question?.subject || attempt?.subject || undefined}
          isCorrect={attempt?.isCorrect}
          exportData={exportPromptData}
          isReviewView={true}
        />
      </div>
    </div>
  )
}

