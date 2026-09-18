import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ExportPromptButton } from '@/components/ExportPromptButton'
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
      <Card className="w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            {question?.subject ? (
              <Badge className="w-fit bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
                {question.subject}
              </Badge>
            ) : <div />}

            <ExportPromptButton questionData={exportData} />
          </div>

          <CardTitle className="text-lg font-normal leading-relaxed text-slate-900 dark:text-slate-100 pt-2">
            {question?.question}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {options.map((optText: string, idx: number) => {
            const isSelected = selectedOption === idx
            const isStruck = struckOptions.includes(idx)

            let buttonStyle = 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'

            if (attemptResult) {
              if (idx === attemptResult.correct_option) {
                buttonStyle = 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 ring-1 ring-emerald-500'
              } else if (isSelected && !attemptResult.is_correct) {
                buttonStyle = 'border-red-500 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200 ring-1 ring-red-500'
              } else {
                buttonStyle = 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/40 text-slate-400 dark:text-slate-500 opacity-60'
              }
            } else if (isSelected) {
              buttonStyle = 'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200 ring-1 ring-blue-500'
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectOption(idx)}
                onContextMenu={(e) => onToggleStrike(e, idx)}
                disabled={Boolean(attemptResult)}
                className={`w-full text-left p-4 rounded-lg border transition-all flex items-start space-x-3 cursor-pointer ${buttonStyle} ${
                  isStruck && !attemptResult ? 'line-through opacity-40 text-slate-400 dark:text-slate-600' : ''
                }`}
              >
                <span className="font-semibold text-xs tracking-wider uppercase mt-0.5 opacity-70 select-none">
                  {String.fromCharCode(65 + idx)}.
                </span>
                <span className="flex-1 text-sm leading-relaxed select-text">{optText}</span>
              </button>
            )
          })}
        </CardContent>

        <CardFooter className="flex justify-end border-t border-slate-100 dark:border-slate-800/80 pt-4">
          {!attemptResult ? (
            <Button onClick={onSubmit} disabled={selectedOption === null || isSubmitting} className="bg-emerald-600 hover:bg-emerald-500 text-white">
              {isSubmitting ? 'Checking...' : 'Submit Answer'}
            </Button>
          ) : (
            <Button onClick={onNext} className="bg-blue-600 hover:bg-blue-500 text-white">
              {isLastQuestion ? 'Finish & Review Block →' : 'Next Question →'}
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Explanation Banner when answered */}
      {attemptResult && (
        <Card className="w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-semibold px-2.5 py-1 rounded ${attemptResult.is_correct ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800' : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800'}`}>
                {attemptResult.is_correct ? 'Correct' : 'Incorrect'}
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Correct choice was ({String.fromCharCode(65 + attemptResult.correct_option)})
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {question?.explanation ? (
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 whitespace-pre-wrap select-text">
                {question.explanation}
              </p>
            ) : (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700/50 space-y-1">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Correct Answer: {String.fromCharCode(65 + attemptResult.correct_option)} {question?.correct_text ? `— ${question.correct_text}` : ''}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  This official dataset does not provide extended rationales.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  )
}
