import { useState, useMemo } from 'react'
import type { StoredAttempt, SessionCustomConfig } from '../types'
import {
  PASSING_ACCURACY_THRESHOLD,
  EXCELLENT_ACCURACY_THRESHOLD,
  TARGET_SECONDS_PER_QUESTION,
} from '../types'

interface UseSessionReviewProps {
  totalQuestions: number;
  attempts: Record<number, StoredAttempt>;
  customConfig?: SessionCustomConfig;
}

export function useSessionReview({ totalQuestions, attempts, customConfig }: UseSessionReviewProps) {
  const [reviewFilter, setReviewFilter] = useState<'all' | 'incorrect' | 'correct'>('all')
  const [selectedReviewIndex, setSelectedReviewIndex] = useState<number>(0)

  const attemptsList = useMemo(() => Object.values(attempts), [attempts])
  const answeredCount = attemptsList.length
  const correctCount = useMemo(() => attemptsList.filter(a => a.isCorrect).length, [attemptsList])
  const incorrectCount = useMemo(() => attemptsList.filter(a => !a.isCorrect).length, [attemptsList])
  const accuracyPercentage = answeredCount > 0 ? (correctCount / answeredCount) * 100 : 0

  const totalTimeSeconds = useMemo(() => attemptsList.reduce((acc, a) => acc + (a.timeSpent || 0), 0), [attemptsList])
  const averageSecondsPerQuestion = answeredCount > 0 ? Math.round(totalTimeSeconds / answeredCount) : 0
  const fastestSeconds = useMemo(() => {
    const correctAttempts = attemptsList.filter(a => a.isCorrect)
    if (!correctAttempts.length) return 0
    return Math.min(...correctAttempts.map(a => a.timeSpent))
  }, [attemptsList])

  const filteredQuestionIndexes = useMemo(() => {
    const allIndexes = Array.from({ length: totalQuestions }, (_, i) => i)
    if (reviewFilter === 'all') return allIndexes
    if (reviewFilter === 'correct') {
      return allIndexes.filter(i => attempts[i]?.isCorrect === true)
    }
    if (reviewFilter === 'incorrect') {
      return allIndexes.filter(i => attempts[i] && !attempts[i]?.isCorrect)
    }
    return allIndexes
  }, [totalQuestions, reviewFilter, attempts])

  const passingThreshold = customConfig?.passingThreshold ?? PASSING_ACCURACY_THRESHOLD
  const excellenceThreshold = customConfig?.excellenceThreshold ?? EXCELLENT_ACCURACY_THRESHOLD
  const targetSeconds = customConfig?.targetSeconds ?? TARGET_SECONDS_PER_QUESTION

  return {
    reviewFilter,
    setReviewFilter,
    selectedReviewIndex,
    setSelectedReviewIndex,
    filteredQuestionIndexes,
    answeredCount,
    correctCount,
    incorrectCount,
    accuracyPercentage,
    totalTimeSeconds,
    averageSecondsPerQuestion,
    fastestSeconds,
    passingThreshold,
    excellenceThreshold,
    targetSeconds,
  }
}

