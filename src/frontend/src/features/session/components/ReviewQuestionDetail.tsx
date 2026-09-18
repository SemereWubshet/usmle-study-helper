import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Clock } from 'lucide-react'
import { ExportPromptButton } from '@/components/ExportPromptButton'
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
    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Badge className="px-2.5 py-1 text-xs bg-slate-900 text-white dark:bg-white dark:text-slate-900">
              Question {questionIndex + 1} of {totalQuestions}
            </Badge>
            {question?.subject && (
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800 text-xs">
                {question.subject}
              </Badge>
            )}
            {attempt && (
              <Badge className={`text-xs ${attempt.isCorrect ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                {attempt.isCorrect ? 'Correct Attempt' : 'Missed Question'}
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {attempt && (
              <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                <span>Time: <strong className="text-slate-700 dark:text-slate-300">{attempt.timeSpent}s</strong></span>
              </div>
            )}

            <ExportPromptButton questionData={exportPromptData} />
          </div>
        </div>

        <CardTitle className="text-base font-normal leading-relaxed text-slate-900 dark:text-slate-100 pt-4">
          {currentQuestionText}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 pt-4">
        {rawOptions.map((optText: string, optIdx: number) => {
          const wasChosen = attempt?.selectedOption === optIdx
          const wasCorrect = attempt?.correctOption === optIdx

          let optStyle = 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300'
          if (wasCorrect) {
            optStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 ring-1 ring-emerald-500'
          } else if (wasChosen && !wasCorrect) {
            optStyle = 'border-rose-500 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200 ring-1 ring-rose-500'
          }

          return (
            <div
              key={optIdx}
              className={`p-3.5 rounded-xl border flex items-start space-x-3 text-sm transition-all ${optStyle}`}
            >
              <span className="font-semibold text-xs tracking-wider uppercase mt-0.5 opacity-70">
                {String.fromCharCode(65 + optIdx)}.
              </span>
              <div className="flex-1 select-text">
                <span>{optText}</span>
              </div>
              {wasCorrect && (
                <Badge className="bg-emerald-600 text-white border-none text-[10px] uppercase tracking-wider ml-2">
                  Correct Answer
                </Badge>
              )}
              {wasChosen && !wasCorrect && (
                <Badge className="bg-rose-600 text-white border-none text-[10px] uppercase tracking-wider ml-2">
                  Your Choice
                </Badge>
              )}
            </div>
          )
        })}

        {explanation && (
          <div className="mt-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Official Educational Explanation</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 select-text whitespace-pre-wrap">
              {explanation}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
