import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchQuestion, submitSessionAttempt, completeSession, type Question, type AttemptOut } from '@/api'
import type { StoredAttempt } from '../types'

interface UseActiveExamProps {
  sessionData: any;
  isReviewMode: boolean;
  onEnterReviewMode: () => void;
}

export function useActiveExam({ sessionData, isReviewMode, onEnterReviewMode }: UseActiveExamProps) {
  const queryClient = useQueryClient()

  const [currentIndex, setCurrentIndex] = useState(() => {
    if (!sessionData?.session_id) return 0
    const savedIdx = localStorage.getItem(`usmle_session_progress_${sessionData.session_id}`)
    return savedIdx !== null ? parseInt(savedIdx, 10) : 0
  })
  const [timeSpent, setTimeSpent] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [struckOptions, setStruckOptions] = useState<number[]>([])
  const [attemptResult, setAttemptResult] = useState<AttemptOut | null>(null)

  const [attempts, setAttempts] = useState<Record<number, StoredAttempt>>(() => {
    if (!sessionData?.session_id) return {}
    const saved = localStorage.getItem(`usmle_session_attempts_${sessionData.session_id}`)
    return saved ? JSON.parse(saved) : {}
  })

  // Save progress
  useEffect(() => {
    if (sessionData?.session_id && !isReviewMode) {
      localStorage.setItem(`usmle_session_progress_${sessionData.session_id}`, currentIndex.toString())
    }
  }, [sessionData?.session_id, currentIndex, isReviewMode])

  // Timer
  useEffect(() => {
    if (isReviewMode || attemptResult) return
    const timer = setInterval(() => setTimeSpent(prev => prev + 1), 1000)
    return () => clearInterval(timer)
  }, [attemptResult, currentIndex, isReviewMode])

  const currentQuestionId = sessionData?.question_ids?.[currentIndex]

  // Query Question
  const { data: question, isLoading: isLoadingQuestion } = useQuery<Question>({
    queryKey: ['question', currentQuestionId],
    queryFn: () => fetchQuestion(currentQuestionId!),
    enabled: !!currentQuestionId && !isReviewMode,
    refetchOnWindowFocus: false,
  })

  const rawOptions = question?.options || (question ? [question.opa, question.opb, question.opc, question.opd] : [])
  const options = rawOptions.filter((opt: unknown): opt is string => typeof opt === 'string' && opt.length > 0)

  // Submit Mutation
  const attemptMutation = useMutation({
    mutationFn: (opt: number) => submitSessionAttempt(sessionData.session_id, currentQuestionId!, opt, timeSpent),
    onSuccess: (data: AttemptOut, selectedOpt: number) => {
      setAttemptResult(data)
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })

      const newRecord: StoredAttempt = {
        questionId: currentQuestionId!,
        questionIndex: currentIndex,
        selectedOption: selectedOpt,
        correctOption: data.correct_option,
        isCorrect: data.is_correct,
        timeSpent: timeSpent,
        explanation: data.explanation || question?.explanation,
        subject: question?.subject,
        questionText: question?.question,
        options: options,
        correctText: question?.correct_text,
      }

      setAttempts(prev => {
        const updated = { ...prev, [currentIndex]: newRecord }
        if (sessionData?.session_id) {
          localStorage.setItem(`usmle_session_attempts_${sessionData.session_id}`, JSON.stringify(updated))
        }
        return updated
      })
    },
  })

  const handleSelectOption = (index: number) => {
    if (!attemptResult) setSelectedOption(index)
  }

  const handleToggleStrike = (e: React.MouseEvent, index: number) => {
    e.preventDefault()
    if (!attemptResult) {
      setStruckOptions(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index])
    }
  }

  const handleSubmit = () => {
    if (selectedOption !== null) attemptMutation.mutate(selectedOption)
  }

  const handleNext = () => {
    if (currentIndex + 1 >= (sessionData?.question_ids?.length || 0)) {
      if (sessionData?.session_id) {
        completeSession(sessionData.session_id).catch(() => {})
        localStorage.setItem(`usmle_session_is_review_${sessionData.session_id}`, 'true')
      }
      onEnterReviewMode()
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
    } else {
      setSelectedOption(null)
      setStruckOptions([])
      setAttemptResult(null)
      setTimeSpent(0)
      setCurrentIndex(prev => prev + 1)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    if (isReviewMode) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      if (targetTag === 'input' || targetTag === 'textarea') return

      const key = e.key.toUpperCase()

      if (!attemptResult) {
        if (key === 'A' || key === '1') {
          e.preventDefault()
          handleSelectOption(0)
        } else if (key === 'B' || key === '2') {
          e.preventDefault()
          handleSelectOption(1)
        } else if (key === 'C' || key === '3') {
          e.preventDefault()
          handleSelectOption(2)
        } else if (key === 'D' || key === '4') {
          e.preventDefault()
          handleSelectOption(3)
        } else if (key === 'ENTER') {
          if (selectedOption !== null && !attemptMutation.isPending) {
            e.preventDefault()
            handleSubmit()
          }
        }
      } else {
        if (key === ' ' || key === 'ENTER') {
          e.preventDefault()
          handleNext()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [attemptResult, selectedOption, attemptMutation.isPending, currentIndex, sessionData, isReviewMode])

  const sessionTitle = sessionData?.qbank === 'medqa_usmle' 
    ? (question?.exam_type || 'USMLE Practice')
    : (question?.subject ? `MedMCQA • ${question.subject}` : 'MedMCQA • Custom Block')

  return {
    currentIndex,
    timeSpent,
    selectedOption,
    struckOptions,
    attemptResult,
    attempts,
    setAttempts,
    question,
    options,
    isLoadingQuestion,
    isSubmitting: attemptMutation.isPending,
    sessionTitle,
    handleSelectOption,
    handleToggleStrike,
    handleSubmit,
    handleNext,
  }
}
