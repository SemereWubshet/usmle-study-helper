import React, { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'

import { useActiveExam } from '@/features/session/hooks/useActiveExam'
import { useSessionReview } from '@/features/session/hooks/useSessionReview'
import { useEncyclopediaSearch } from '@/features/session/hooks/useEncyclopediaSearch'

import { SessionHeader } from '@/features/session/components/SessionHeader'
import type { ActiveSidePanel } from '@/features/session/components/SessionHeader'
import { ActiveQuestionCard } from '@/features/session/components/ActiveQuestionCard'
import { ExecutiveScorecard } from '@/features/session/components/ExecutiveScorecard'
import { QuestionNavigator } from '@/features/session/components/QuestionNavigator'
import { ReviewQuestionDetail } from '@/features/session/components/ReviewQuestionDetail'
import { EncyclopediaSidebar } from '@/features/session/components/EncyclopediaSidebar'
import { ClinicalGraphSidebar } from '@/features/clinical-graph/components/ClinicalGraphSidebar'
import { useClinicalGraphSession } from '@/features/clinical-graph/hooks/useClinicalGraphSession'

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

  // Mutually exclusive sidepanel state: 'none' | 'medsearch' | 'graph'
  const [activeSidePanel, setActiveSidePanel] = useState<ActiveSidePanel>('none')

  // Responsive check for desktop (lg breakpoint: >= 1024px)
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  })

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Draggable sidebar width state (stored in percentage: 28% to 60%)
  const [sidebarWidthPercent, setSidebarWidthPercent] = useState<number>(() => {
    const saved = localStorage.getItem('usmle_sidebar_width_percent')
    return saved ? Math.max(28, Math.min(60, parseFloat(saved))) : 40
  })

  const isResizingRef = useRef(false)

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault()
    isResizingRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return
      const containerWidth = window.innerWidth
      const newWidthPx = containerWidth - moveEvent.clientX
      const newPercent = Math.max(28, Math.min(60, (newWidthPx / containerWidth) * 100))
      setSidebarWidthPercent(newPercent)
    }

    const handleMouseUp = () => {
      isResizingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      setSidebarWidthPercent(curr => {
        localStorage.setItem('usmle_sidebar_width_percent', curr.toString())
        return curr
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

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
    if (!sessionData) {
      navigate('/')
    }
  }, [sessionData, navigate])

  // Active Exam Hook
  const {
    currentIndex,
    timeSpent,
    examMode,
    timeRemaining,
    isPaused,
    togglePause,
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

  const effectiveAttempts = location.state?.attempts || attempts
  const activeReviewQuestion = sessionData?.questions?.[review.selectedReviewIndex]
  const activeReviewAttempt = effectiveAttempts[review.selectedReviewIndex]

  // Currently displayed question for graph/clue extraction
  const currentExamQuestion = isReviewMode ? activeReviewQuestion : question
  const currentCorrectAnswer = currentExamQuestion?.correct_text || (
    currentExamQuestion?.options && currentExamQuestion.options.length > 0 ? currentExamQuestion.options[0] : ''
  )
  const currentOptions = currentExamQuestion?.options || options || []

  // Persistent Clinical Graph State across sidebar toggles (Must be called unconditionally!)
  const clinicalGraph = useClinicalGraphSession(
    currentExamQuestion?.question || '',
    currentCorrectAnswer || '',
    currentOptions
  )

  const handleFinishReview = () => {
    if (sessionData?.session_id) {
      localStorage.removeItem('usmle_active_session')
      localStorage.removeItem(`usmle_session_progress_${sessionData.session_id}`)
      localStorage.removeItem(`usmle_session_attempts_${sessionData.session_id}`)
      localStorage.removeItem(`usmle_session_is_review_${sessionData.session_id}`)
      localStorage.removeItem(`usmle_session_notes_${sessionData.session_id}`)
      localStorage.removeItem(`usmle_session_timer_${sessionData.session_id}`)
    }
    navigate('/')
  }

  if (!sessionData) return null

  if (isLoadingQuestion && !isReviewMode) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Skeleton className="h-[400px] w-full max-w-4xl bg-slate-200 dark:bg-slate-800/50 rounded-2xl" />
      </div>
    )
  }

  // During mock exam active testing, sidebar is locked closed to preserve exam conditions
  const showSidebar = (isReviewMode || examMode !== 'mock_exam') && activeSidePanel !== 'none'

  return (
    <div className="h-full w-full overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row">
      {/* Main scrolling stage */}
      <div 
        style={{ width: (showSidebar && isDesktop) ? `${100 - sidebarWidthPercent}%` : '100%' }}
        className="w-full lg:h-full lg:overflow-y-auto pr-0 transition-[width] duration-75"
      >
        <div className={`w-full py-2 px-3 sm:px-6 flex flex-col space-y-6 animate-in fade-in duration-500 ${!showSidebar ? 'max-w-5xl mx-auto' : ''}`}>
          <SessionHeader
            isReviewMode={isReviewMode}
            qbank={sessionData.qbank}
            sessionTitle={sessionTitle}
            currentIndex={currentIndex}
            totalQuestions={totalQuestions}
            timeSpent={timeSpent}
            examMode={examMode}
            timeRemaining={timeRemaining}
            isPaused={isPaused}
            onTogglePause={togglePause}
            activePanel={activeSidePanel}
            onTogglePanel={(panel) => setActiveSidePanel(panel)}
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
              examMode={examMode}
              onSelectOption={handleSelectOption}
              onToggleStrike={handleToggleStrike}
              onSubmit={handleSubmit}
              onNext={handleNext}
            />
          )}
        </div>
      </div>

      {/* 🎚️ Draggable Splitter Handle between Question Stage and Sidebar */}
      {showSidebar && (
        <div
          onMouseDown={handleMouseDownResize}
          className="hidden lg:flex w-2.5 hover:w-3.5 hover:bg-indigo-500/20 active:bg-indigo-500/30 transition-all cursor-col-resize items-center justify-center relative group z-20 select-none -mx-1"
          title="Drag to resize panel"
        >
          <div className="w-1 h-12 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-indigo-500 transition-colors" />
        </div>
      )}

      {/* Mutually Exclusive Right Sidebar with dynamic draggable width */}
      {showSidebar && (
        <div 
          style={{ width: isDesktop ? `${sidebarWidthPercent}%` : '100%' }}
          className="w-full lg:h-full flex-shrink-0 transition-[width] duration-75 relative"
        >
          {activeSidePanel === 'medsearch' && (
            <EncyclopediaSidebar
              searchInput={encyclopedia.searchInput}
              onSearchInputChange={encyclopedia.setSearchInput}
              submittedQuery={encyclopedia.submittedQuery}
              onSearchSubmit={encyclopedia.handleSearchSubmit}
              onClearSearch={encyclopedia.handleClearSearch}
              onCloseSidebar={() => setActiveSidePanel('none')}
              isLoading={encyclopedia.isLoadingEncyclopedia}
              isFetched={encyclopedia.isFetchedEncyclopedia}
              entries={encyclopedia.encyclopediaEntries}
              provider={encyclopedia.provider}
              onProviderChange={encyclopedia.setProvider}
            />
          )}

          {activeSidePanel === 'graph' && (
            <ClinicalGraphSidebar
              options={currentOptions}
              onClose={() => setActiveSidePanel('none')}
              clues={clinicalGraph.clues}
              currentTarget={clinicalGraph.currentTarget}
              graphData={clinicalGraph.graphData}
              isExtracting={clinicalGraph.isExtracting}
              isLoadingGraph={clinicalGraph.isLoadingGraph}
              errorMessage={clinicalGraph.errorMessage}
              onExtractClues={clinicalGraph.handleExtractClues}
              onAddClue={clinicalGraph.handleAddClue}
              onRemoveClue={clinicalGraph.handleRemoveClue}
              onSelectTarget={clinicalGraph.handleSelectTarget}
            />
          )}
        </div>
      )}
    </div>
  )
}
