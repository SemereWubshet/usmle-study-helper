import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchNextQuestion, submitAttempt, fetchAnalytics } from './api'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface AttemptResult {
  question_id: string
  selected_option: number
  correct_option: number
  is_correct: bool
  explanation?: string
}

export default function App() {
  const queryClient = useQueryClient()

  // Local interaction states
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [struckOptions, setStruckOptions] = useState<number[]>([])
  const [attemptResult, setAttemptResult] = useState<AttemptResult | null>(null)

  // 1. Fetch Question
  const {
    data: question,
    isLoading: isQuestionLoading,
    isError: isQuestionError,
  } = useQuery({
    queryKey: ['nextQuestion'],
    queryFn: fetchNextQuestion,
    refetchOnWindowFocus: false,
  })

  // 2. Fetch Progress Analytics
  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: fetchAnalytics,
    refetchOnWindowFocus: false,
  })

  // 3. Submit Attempt Mutation
  const attemptMutation = useMutation({
    mutationFn: ({ qId, opt }: { qId: string; opt: number }) => submitAttempt(qId, opt),
    onSuccess: (data: AttemptResult) => {
      setAttemptResult(data)
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
    },
  })

  // Handlers
  const handleSelectOption = (optionIndex: number) => {
    if (attemptResult) return // Locked after submission
    setSelectedOption(optionIndex)
  }

  const handleToggleStrike = (e: React.MouseEvent, optionIndex: number) => {
    e.preventDefault() // Prevent native right-click context menu
    if (attemptResult) return

    setStruckOptions((prev) =>
      prev.includes(optionIndex) ? prev.filter((i) => i !== optionIndex) : [...prev, optionIndex]
    )
  }

  const handleSubmit = () => {
    if (!question || selectedOption === null) return
    attemptMutation.mutate({ qId: question.id, opt: selectedOption })
  }

  const handleNextQuestion = () => {
    setSelectedOption(null)
    setStruckOptions([])
    setAttemptResult(null)
    queryClient.invalidateQueries({ queryKey: ['nextQuestion'] })
  }

  if (isQuestionLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-3xl bg-slate-900 border-slate-800 p-6 space-y-4">
          <Skeleton className="h-6 w-1/3 bg-slate-800" />
          <Skeleton className="h-20 w-full bg-slate-800" />
          <div className="space-y-3 pt-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full bg-slate-800" />
            ))}
          </div>
        </Card>
      </div>
    )
  }

  if (isQuestionError || !question) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-red-400">
        Error loading question. Verify FastAPI is running at localhost:8000.
      </div>
    )
  }

  const options = [question.opa, question.opb, question.opc, question.opd]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-6 space-y-6">
      {/* Top Header & Analytics Banner */}
      <header className="w-full max-w-3xl flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">USMLE Step 1 Helper</h1>
          <p className="text-xs text-slate-400">Right-click option to strike through</p>
        </div>
        {analytics && (
          <div className="flex space-x-3 text-sm">
            <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
              <span className="text-slate-400">Answered: </span>
              <span className="font-semibold text-white">{analytics.total_answered}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
              <span className="text-slate-400">Accuracy: </span>
              <span className="font-semibold text-emerald-400">
                {analytics.accuracy_percentage}%
              </span>
            </div>
          </div>
        )}
      </header>

      {/* Main Question Card */}
      <Card className="w-full max-w-3xl bg-slate-900 border-slate-800 text-slate-100 shadow-xl">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-slate-400 border-slate-700">
              ID: {question.id.substring(0, 8)}
            </Badge>
            {question.subject && (
              <Badge className="bg-emerald-950 text-emerald-400 border border-emerald-800">
                {question.subject}
              </Badge>
            )}
          </div>
          <CardTitle className="text-lg font-normal leading-relaxed text-slate-100 pt-2">
            {question.question}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {options.map((optText, idx) => {
            const optionNumber = idx // 0 for A, 1 for B, 2 for C, 3 for D
            const isSelected = selectedOption === optionNumber
            const isStruck = struckOptions.includes(optionNumber)

            // Dynamic styling based on submission state
            let buttonStyle = 'border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800/80'

            if (attemptResult) {
              if (optionNumber === attemptResult.correct_option) {
                buttonStyle = 'border-emerald-500 bg-emerald-950/40 text-emerald-200 font-medium'
              } else if (isSelected && !attemptResult.is_correct) {
                buttonStyle = 'border-red-500 bg-red-950/40 text-red-200 font-medium'
              } else {
                buttonStyle = 'border-slate-800 bg-slate-950/40 text-slate-500 opacity-60'
              }
            } else if (isSelected) {
              buttonStyle = 'border-blue-500 bg-blue-950/30 text-blue-200 ring-1 ring-blue-500'
            }

            return (
              <button
                key={optionNumber}
                type="button"
                onClick={() => handleSelectOption(optionNumber)}
                onContextMenu={(e) => handleToggleStrike(e, optionNumber)}
                disabled={Boolean(attemptResult)}
                className={`w-full text-left p-4 rounded-lg border transition-all flex items-start space-x-3 cursor-pointer select-none ${buttonStyle} ${
                  isStruck && !attemptResult ? 'line-through opacity-40 text-slate-500' : ''
                }`}
              >
                <span className="font-semibold text-xs tracking-wider uppercase mt-0.5 text-slate-400">
                  {String.fromCharCode(65 + idx)}.
                </span>
                <span className="flex-1 text-sm leading-relaxed">{optText}</span>
              </button>
            )
          })}
        </CardContent>

        <CardFooter className="flex justify-end border-t border-slate-800/80 pt-4">
          {!attemptResult ? (
            <Button
              onClick={handleSubmit}
              disabled={selectedOption === null || attemptMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
            >
              {attemptMutation.isPending ? 'Checking...' : 'Submit Answer'}
            </Button>
          ) : (
            <Button
              onClick={handleNextQuestion}
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium"
            >
              Next Question →
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Rationale / Explanation Card */}
      {attemptResult && (
        <Card className="w-full max-w-3xl bg-slate-900 border-slate-800 text-slate-200">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <span
                className={`text-sm font-semibold px-2.5 py-1 rounded ${
                  attemptResult.is_correct
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-red-950 text-red-400 border border-red-800'
                }`}
              >
                {attemptResult.is_correct ? 'Correct' : 'Incorrect'}
              </span>
              <span className="text-sm text-slate-400">
                Correct choice was ({String.fromCharCode(65 + attemptResult.correct_option)})
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-300">Explanation & Rationale:</h3>
            <p className="text-sm leading-relaxed text-slate-400 whitespace-pre-wrap">
              {attemptResult.explanation || 'No rationale provided in dataset for this question.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}