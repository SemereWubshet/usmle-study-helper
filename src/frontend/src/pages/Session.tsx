import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'

import { useActiveExam } from '@/features/session/hooks/useActiveExam'
import { useSessionReview } from '@/features/session/hooks/useSessionReview'
import { useEncyclopediaSearch } from '@/features/session/hooks/useEncyclopediaSearch'

import { SessionHeader } from '@/features/session/components/SessionHeader'
import { ActiveQuestionCard } from '@/features/session/components/ActiveQuestionCard'
import { ExecutiveScorecard } from '@/features/session/components/ExecutiveScorecard'
import { QuestionNavigator } from '@/features/session/components/QuestionNavigator'
import { ReviewQuestionDetail } from '@/features/session/components/ReviewQuestionDetail'
import { EncyclopediaSidebar } from '@/features/session/components/EncyclopediaSidebar'

export {
  PASSING_ACCURACY_THRESHOLD,
  EXCELLENT_ACCURACY_THRESHOLD,
  TARGET_SECONDS_PER_QUESTION,
} from '@/features/session/types'
export type { StoredAttempt } from '@/features/session/types'

export default function Session() {
  const location = useLocation()
  const navigate = useNavigate()

  // Retrieve session block from location.state or localStorage
  const [sessionData] = useState(() => {
    if (location.state?.sessionData) {
      localStorage.setItem('usmle_active_session', JSON.stringify(location.state.sessionData))
      return location.state.sessionData
    }
    const cached = localStorage.getItem('usmle_active_session')
    return cached ? JSON.parse(cached) : null
  })

  // Review mode state
  const [isReviewMode, setIsReviewMode] = useState<boolean>(() => {
    if (location.state?.isReviewMode !== undefined) {
      if (sessionData?.session_id) {
        localStorage.setItem(`usmle_session_is_review_${sessionData.session_id}`, String(location.state.isReviewMode))
      }
      return location.state.isReviewMode
    }
    if (!sessionData?.session_id) return false
    return localStorage.getItem(`usmle_session_is_review_${sessionData.session_id}`) === 'true'
  })

  // Prevent accidental close during active session
  useEffect(() => {
    if (!sessionData || isReviewMode) return
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [sessionData, isReviewMode])

  // Redirect if no session exists
  useEffect(() => {
    if (!sessionData) navigate('/')
  }, [sessionData, navigate])

  // Active Exam Hook
  const {
    currentIndex,
    timeSpent,
    selectedOption,
    struckOptions,
    attemptResult,
    attempts,
    question,
    options,
    isLoadingQuestion,
    isSubmitting,
    sessionTitle,
    handleSelectOption,
    handleToggleStrike,
    handleSubmit,
    handleNext,
  } = useActiveExam({
    sessionData,
    isReviewMode,
    onEnterReviewMode: () => setIsReviewMode(true),
  })

  // Review Hook
  const totalQuestions = sessionData?.question_ids?.length || 0
  const review = useSessionReview({
    totalQuestions,
    attempts: location.state?.attempts || attempts,
    customConfig: sessionData?.customConfig,
  })

  // Encyclopedia Sidebar Hook
  const encyclopedia = useEncyclopediaSearch()

  if (!sessionData) return null

  const handleFinishReview = () => {
    if (sessionData?.session_id) {
      localStorage.removeItem('usmle_active_session')
      localStorage.removeItem(`usmle_session_progress_${sessionData.session_id}`)
      localStorage.removeItem(`usmle_session_attempts_${sessionData.session_id}`)
      localStorage.removeItem(`usmle_session_is_review_${sessionData.session_id}`)
      localStorage.removeItem(`usmle_session_notes_${sessionData.session_id}`)
    }
    navigate('/')
  }

  if (isLoadingQuestion && !isReviewMode) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Skeleton className="h-[400px] w-full max-w-4xl bg-slate-200 dark:bg-slate-800/50 rounded-2xl" />
      </div>
    )
  }

  const effectiveAttempts = location.state?.attempts || attempts
  const activeReviewQuestion = sessionData?.questions?.[review.selectedReviewIndex]
  const activeReviewAttempt = effectiveAttempts[review.selectedReviewIndex]

  return (
    <div className="h-full w-full overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row gap-6">
      {/* Main scrolling stage */}
      <div className={`w-full ${encyclopedia.isSidebarOpen ? 'lg:w-[65%] xl:w-[68%]' : 'max-w-5xl mx-auto'} lg:h-full lg:overflow-y-auto pr-0 ${encyclopedia.isSidebarOpen ? 'lg:pr-2' : ''} transition-all duration-300`}>
        <div className="w-full py-2 flex flex-col space-y-6 animate-in fade-in duration-500">
          <SessionHeader
            isReviewMode={isReviewMode}
            qbank={sessionData.qbank}
            sessionTitle={sessionTitle}
            currentIndex={currentIndex}
            totalQuestions={totalQuestions}
            timeSpent={timeSpent}
            isSidebarOpen={encyclopedia.isSidebarOpen}
            onToggleSidebar={() => encyclopedia.setIsSidebarOpen(prev => !prev)}
            onFinishReview={handleFinishReview}
            onQuitSession={() => navigate('/')}
          />

          {isReviewMode ? (
            <>
              <ExecutiveScorecard
                accuracyPercentage={review.accuracyPercentage}
                correctCount={review.correctCount}
                answeredCount={review.answeredCount}
                totalQuestions={totalQuestions}
                averageSecondsPerQuestion={review.averageSecondsPerQuestion}
                totalTimeSeconds={review.totalTimeSeconds}
                fastestSeconds={review.fastestSeconds}
                passingThreshold={review.passingThreshold}
                excellenceThreshold={review.excellenceThreshold}
                targetSeconds={review.targetSeconds}
              />

              <QuestionNavigator
                totalQuestions={totalQuestions}
                attempts={effectiveAttempts}
                selectedReviewIndex={review.selectedReviewIndex}
                onSelectReviewIndex={review.setSelectedReviewIndex}
                reviewFilter={review.reviewFilter}
                onChangeReviewFilter={review.setReviewFilter}
                filteredIndexes={review.filteredQuestionIndexes}
              />

              <ReviewQuestionDetail
                questionIndex={review.selectedReviewIndex}
                totalQuestions={totalQuestions}
                question={activeReviewQuestion}
                attempt={activeReviewAttempt}
                fallbackQuestionId={sessionData.question_ids[review.selectedReviewIndex]}
              />
            </>
          ) : (
            <ActiveQuestionCard
              question={question}
              options={options}
              selectedOption={selectedOption}
              struckOptions={struckOptions}
              attemptResult={attemptResult}
              isSubmitting={isSubmitting}
              isLastQuestion={currentIndex + 1 >= totalQuestions}
              onSelectOption={handleSelectOption}
              onToggleStrike={handleToggleStrike}
              onSubmit={handleSubmit}
              onNext={handleNext}
            />
          )}
        </div>
      </div>

      {/* Persistent Right Sidebar (MedSearch Encyclopedia) */}
      {encyclopedia.isSidebarOpen && (
        <EncyclopediaSidebar
          searchInput={encyclopedia.searchInput}
          onSearchInputChange={encyclopedia.setSearchInput}
          submittedQuery={encyclopedia.submittedQuery}
          onSearchSubmit={encyclopedia.handleSearchSubmit}
          onClearSearch={encyclopedia.handleClearSearch}
          onCloseSidebar={() => encyclopedia.setIsSidebarOpen(false)}
          isLoading={encyclopedia.isLoadingEncyclopedia}
          isFetched={encyclopedia.isFetchedEncyclopedia}
          entries={encyclopedia.encyclopediaEntries}
          provider={encyclopedia.provider}
          onProviderChange={encyclopedia.setProvider}
        />
      )}
    </div>
  )
}