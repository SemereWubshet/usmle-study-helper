import { useState, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  fetchQuestion, 
  submitSessionAttempt, 
  completeSession, 
  fetchEncyclopedia, 
  type EncyclopediaEntry 
} from '../api'
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Trophy, Clock, BookOpen, AlertTriangle, Check, X,
  Award, Sparkles, LayoutDashboard, BarChart3,
  Search, PanelRightClose, PanelRightOpen
} from 'lucide-react'

// ============================================================================
// CONFIGURABLE REVIEW DISPLAY SETTINGS & THRESHOLDS
// (Edit these values to customize the scorecard & pacing indicators)
// ============================================================================
export const PASSING_ACCURACY_THRESHOLD = 60; // Standard USMLE passing score (default: 60%)
export const EXCELLENT_ACCURACY_THRESHOLD = 80; // High-yield mastery threshold (default: 80%)
export const TARGET_SECONDS_PER_QUESTION = 90; // Standard USMLE time allotment per question (default: 90s)

export interface StoredAttempt {
  questionId: string;
  questionIndex: number; // 0-based
  selectedOption: number;
  correctOption: number;
  isCorrect: boolean;
  timeSpent: number;
  explanation?: string | null;
  subject?: string | null;
  questionText?: string;
  options?: string[];
  correctText?: string | null;
}

export default function Session() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  // Retrieve the session block from location.state or restore from localStorage on refresh
  const [sessionData] = useState(() => {
    if (location.state?.sessionData) {
      localStorage.setItem('usmle_active_session', JSON.stringify(location.state.sessionData))
      return location.state.sessionData
    }
    const cached = localStorage.getItem('usmle_active_session')
    return cached ? JSON.parse(cached) : null
  })
  
  // State for review mode
  const [isReviewMode, setIsReviewMode] = useState<boolean>(() => {
    if (!sessionData?.session_id) return false
    return localStorage.getItem(`usmle_session_is_review_${sessionData.session_id}`) === 'true'
  })

  // Track all attempts accumulated throughout this session block
  const [attempts, setAttempts] = useState<Record<number, StoredAttempt>>(() => {
    if (!sessionData?.session_id) return {}
    const saved = localStorage.getItem(`usmle_session_attempts_${sessionData.session_id}`)
    return saved ? JSON.parse(saved) : {}
  })

  // State for review filter and selected question in review mode
  const [reviewFilter, setReviewFilter] = useState<'all' | 'incorrect' | 'correct'>('all')
  const [selectedReviewIndex, setSelectedReviewIndex] = useState<number>(0)

  // Review Mode: MedSearch state (query executes on Enter or button click)
  const [searchInput, setSearchInput] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')

  // MedlinePlus Query via React Query (triggers on submittedQuery)
  const { data: encyclopediaEntries = [], isLoading: isLoadingEncyclopedia, isFetched: isFetchedEncyclopedia } = useQuery<EncyclopediaEntry[]>({
    queryKey: ['encyclopedia', submittedQuery],
    queryFn: () => fetchEncyclopedia(submittedQuery),
    enabled: submittedQuery.trim().length >= 2,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes in memory
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  // State for block progression and timing, restored from localStorage if available
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (!sessionData?.session_id) return 0
    const savedIdx = localStorage.getItem(`usmle_session_progress_${sessionData.session_id}`)
    return savedIdx !== null ? parseInt(savedIdx, 10) : 0
  })
  const [timeSpent, setTimeSpent] = useState(0)
  
  // State for current question interactions
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [struckOptions, setStruckOptions] = useState<number[]>([])
  const [attemptResult, setAttemptResult] = useState<any>(null)
  
  // Update progress in localStorage whenever currentIndex changes
  useEffect(() => {
    if (sessionData?.session_id && !isReviewMode) {
      localStorage.setItem(`usmle_session_progress_${sessionData.session_id}`, currentIndex.toString())
    }
  }, [sessionData?.session_id, currentIndex, isReviewMode])

  // Boot user back to dashboard only if there is genuinely no active session
  useEffect(() => {
    if (!sessionData) navigate('/')
  }, [sessionData, navigate])

  // Timer logic for the active question
  useEffect(() => {
    if (isReviewMode || attemptResult) return // Stop timer during review or when answer is submitted
    const timer = setInterval(() => setTimeSpent(prev => prev + 1), 1000)
    return () => clearInterval(timer)
  }, [attemptResult, currentIndex, isReviewMode])

  // Guard against accidental refresh or tab closure during an active session (disabled in review mode)
  useEffect(() => {
    if (!sessionData || isReviewMode) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [sessionData, isReviewMode])

  const currentQuestionId = sessionData?.question_ids?.[currentIndex]

  // Fetch the active question
  const { data: question, isLoading } = useQuery({
    queryKey: ['question', currentQuestionId],
    queryFn: () => fetchQuestion(currentQuestionId!),
    enabled: !!currentQuestionId && !isReviewMode,
    refetchOnWindowFocus: false,
  })

  const sessionTitle = sessionData?.qbank === 'medqa_usmle' 
    ? (question?.exam_type || 'USMLE Practice')
    : (question?.subject ? `MedMCQA • ${question.subject}` : 'MedMCQA • Custom Block');

  const options = question?.options || [question?.opa, question?.opb, question?.opc, question?.opd]

  // Submit attempt mutation
  const attemptMutation = useMutation({
    mutationFn: (opt: number) => submitSessionAttempt(sessionData.session_id, currentQuestionId!, opt, timeSpent),
    onSuccess: (data, selectedOpt) => {
      setAttemptResult(data)
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })

      // Record this attempt in our accumulated session attempts
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

  if (!sessionData) return null

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
    if (currentIndex + 1 >= sessionData.question_ids.length) {
      // Transition to Review Mode & mark session completed in backend
      if (sessionData?.session_id) {
        completeSession(sessionData.session_id).catch(() => {})
        localStorage.setItem(`usmle_session_is_review_${sessionData.session_id}`, 'true')
      }
      setIsReviewMode(true)
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
    } else {
      // Reset state for the next question in the queue
      setSelectedOption(null)
      setStruckOptions([])
      setAttemptResult(null)
      setTimeSpent(0)
      setCurrentIndex(prev => prev + 1)
    }
  }



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

  // Keyboard Shortcuts (A-D, 1-4, Enter to submit/advance, Space to advance)
  useEffect(() => {
    if (isReviewMode) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if focus is inside an input or textarea
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      if (targetTag === 'input' || targetTag === 'textarea') return

      const key = e.key.toUpperCase()

      // 1. If question is NOT yet submitted: A, B, C, D (or 1, 2, 3, 4) to pick answers
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
        // 2. If question IS submitted: Space or Enter moves to Next Question
        if (key === ' ' || key === 'ENTER') {
          e.preventDefault()
          handleNext()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [attemptResult, selectedOption, attemptMutation.isPending, currentIndex, sessionData, isReviewMode])

  // ==========================================================================
  // REVIEW MODE CALCULATIONS (Tier 1 & Tier 2 Metrics)
  // ==========================================================================
  const totalQuestions = sessionData.question_ids?.length || 0
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

  // Filtered question indexes for the review grid
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

  // Selected question in review mode (retrieved from sessionData.questions or attempts record)
  const activeReviewQuestion = sessionData?.questions?.[selectedReviewIndex]
  const activeReviewAttempt = attempts[selectedReviewIndex]

  // Configurable thresholds (customized from session maker or defaults)
  const passingThreshold = sessionData?.customConfig?.passingThreshold ?? PASSING_ACCURACY_THRESHOLD
  const excellenceThreshold = sessionData?.customConfig?.excellenceThreshold ?? EXCELLENT_ACCURACY_THRESHOLD
  const targetSeconds = sessionData?.customConfig?.targetSeconds ?? TARGET_SECONDS_PER_QUESTION





  // ==========================================================================
  // UNIFIED RENDER: APP SHELL WITH RIGHT SIDEBAR
  // ==========================================================================
  const isPassing = accuracyPercentage >= passingThreshold
  const isExcellent = accuracyPercentage >= excellenceThreshold
  const isOnPace = averageSecondsPerQuestion <= targetSeconds

  if (isLoading && !isReviewMode) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Skeleton className="h-[400px] w-full max-w-4xl bg-slate-200 dark:bg-slate-800/50 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row gap-6">
      
      {/* MAIN SCROLLING STAGE */}
      <div className={`w-full ${isSidebarOpen ? 'lg:w-[65%] xl:w-[68%]' : 'max-w-5xl mx-auto'} lg:h-full lg:overflow-y-auto pr-0 ${isSidebarOpen ? 'lg:pr-2' : ''} transition-all duration-300`}>
        <div className="w-full py-2 flex flex-col space-y-6 animate-in fade-in duration-500">
          
          {isReviewMode ? (
            <>
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
                Block Completed
              </Badge>
              <span className="text-xs text-slate-500 font-medium capitalize">
                {sessionData.qbank === 'medqa_usmle' ? 'USMLE Practice' : 'MedMCQA Bank'}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Session Review
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Review question rationales, pacing metrics, and explore high-yield concept cards.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              size="sm"
              variant={isSidebarOpen ? "secondary" : "outline"}
              onClick={() => setIsSidebarOpen(prev => !prev)}
              className="h-11 px-4 text-xs font-medium rounded-xl gap-2 cursor-pointer border-slate-200 dark:border-slate-800"
              title={isSidebarOpen ? "Collapse Review Cards" : "Show Review Cards"}
            >
              {isSidebarOpen ? <PanelRightClose className="w-4 h-4 text-slate-500" /> : <PanelRightOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
              <span>{isSidebarOpen ? "Hide Cards" : "Show Cards"}</span>
            </Button>

            <Button 
              onClick={handleFinishReview}
              className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 text-white rounded-xl shadow-sm gap-2 h-11 px-5 cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" />
              Done • Back to Dashboard
            </Button>
          </div>
        </div>


        {/* TIER 1: THE EXECUTIVE SCORECARD                                    */}
        {/* ================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Card 1: Score & Mastery */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs uppercase font-semibold tracking-wider text-slate-500">
                  Block Accuracy
                </CardDescription>
                <div className={`p-2 rounded-xl ${isPassing ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'}`}>
                  {isExcellent ? <Trophy className="w-5 h-5" /> : <Award className="w-5 h-5" />}
                </div>
              </div>
              <div className="flex items-baseline space-x-2 pt-2">
                <span className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {accuracyPercentage.toFixed(1)}%
                </span>
                <span className="text-sm font-medium text-slate-500">
                  ({correctCount} / {answeredCount || totalQuestions} correct)
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex items-center space-x-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                {isExcellent ? (
                  <Badge className="bg-emerald-600 text-white border-none text-xs gap-1">
                    <Sparkles className="w-3 h-3" /> High-Yield Mastery (≥{excellenceThreshold}%)
                  </Badge>
                ) : isPassing ? (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 text-xs gap-1">
                    <Check className="w-3 h-3" /> Passing Standard (≥{passingThreshold}%)
                  </Badge>
                ) : (
                  <Badge className="bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300 text-xs gap-1">
                    <AlertTriangle className="w-3 h-3" /> Needs Review (&lt;{passingThreshold}%)
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Time & Pacing Analytics */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs uppercase font-semibold tracking-wider text-slate-500">
                  Pacing Analytics
                </CardDescription>
                <div className={`p-2 rounded-xl ${isOnPace ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'}`}>
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2 pt-2">
                <span className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {averageSecondsPerQuestion}s
                </span>
                <span className="text-sm font-medium text-slate-500">
                  / question avg
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-500">
                  Total: <strong className="text-slate-700 dark:text-slate-300">{Math.floor(totalTimeSeconds / 60)}m {totalTimeSeconds % 60}s</strong>
                </span>
                {isOnPace ? (
                  <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:text-emerald-400 dark:border-emerald-800">
                    Target Pace (≤{targetSeconds}s)
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-400 dark:border-amber-800">
                    +{averageSecondsPerQuestion - targetSeconds}s Over Target ({targetSeconds}s)
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Block Breakdown Distribution */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs uppercase font-semibold tracking-wider text-slate-500">
                  Question Distribution
                </CardDescription>
                <div className="p-2 rounded-xl bg-slate-50 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>
              <div className="w-full pt-3">
                {/* Segmented Bar */}
                <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                  <div 
                    style={{ width: `${totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0}%` }}
                    className="bg-emerald-500 h-full transition-all"
                    title={`Correct: ${correctCount}`}
                  />
                  <div 
                    style={{ width: `${totalQuestions > 0 ? (incorrectCount / totalQuestions) * 100 : 0}%` }}
                    className="bg-rose-500 h-full transition-all"
                    title={`Incorrect: ${incorrectCount}`}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  <span className="text-slate-600 dark:text-slate-400 font-medium">{correctCount} Correct</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                  <span className="text-slate-600 dark:text-slate-400 font-medium">{incorrectCount} Incorrect</span>
                </div>
                {fastestSeconds > 0 && (
                  <span className="text-slate-400 text-[11px]">
                    Fastest: {fastestSeconds}s
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

        </div>


        {/* TIER 2: FILTER TABS & INTERACTIVE QUESTION MATRIX                  */}
        {/* ================================================================== */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  Question Navigator
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Click any question tile to inspect your answer, time spent, and learning pearls.
                </CardDescription>
              </div>

              {/* Quick Filter Tabs */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700/60 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setReviewFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${reviewFilter === 'all' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
                >
                  All ({totalQuestions})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter('incorrect')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${reviewFilter === 'incorrect' ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'}`}
                >
                  <span>Incorrect</span>
                  <span className="bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                    {incorrectCount}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter('correct')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${reviewFilter === 'correct' ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'}`}
                >
                  <span>Correct</span>
                  <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                    {correctCount}
                  </span>
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {filteredQuestionIndexes.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                {reviewFilter === 'incorrect' ? '🎉 Amazing! Zero incorrect questions in this block.' : 'No questions found for this filter.'}
              </div>
            ) : (
              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2.5">
                {filteredQuestionIndexes.map((qIdx) => {
                  const att = attempts[qIdx]
                  const isSelected = selectedReviewIndex === qIdx
                  const isCorrect = att?.isCorrect === true
                  const isAnswered = Boolean(att)

                  let tileStyle = 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100'

                  if (isAnswered) {
                    if (isCorrect) {
                      tileStyle = 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/60'
                    } else {
                      tileStyle = 'border-rose-300 dark:border-rose-800/80 bg-rose-50/80 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 hover:bg-rose-100/60'
                    }
                  }

                  const ringStyle = isSelected ? 'ring-2 ring-indigo-600 ring-offset-2 dark:ring-offset-slate-900 font-bold shadow-sm scale-105 z-10' : ''

                  return (
                    <button
                      key={qIdx}
                      type="button"
                      onClick={() => setSelectedReviewIndex(qIdx)}
                      className={`relative flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${tileStyle} ${ringStyle}`}
                    >
                      <span className="font-semibold">{qIdx + 1}</span>
                      <span className="mt-0.5">
                        {isAnswered ? (
                          isCorrect ? (
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <X className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                          )
                        ) : (
                          <span className="text-[9px] text-slate-400">—</span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>


              <div className="space-y-6">
                          {/* LEFT COLUMN: Question Details & Educational Rationale (7 cols) */}
          <div>
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <Badge className="px-2.5 py-1 text-xs bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                      Question {selectedReviewIndex + 1} of {totalQuestions}
                    </Badge>
                    {activeReviewQuestion?.subject && (
                      <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800 text-xs">
                        {activeReviewQuestion.subject}
                      </Badge>
                    )}
                    {activeReviewAttempt && (
                      <Badge className={`text-xs ${activeReviewAttempt.isCorrect ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                        {activeReviewAttempt.isCorrect ? 'Correct Attempt' : 'Missed Question'}
                      </Badge>
                    )}
                  </div>

                  {activeReviewAttempt && (
                    <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Time spent: <strong className="text-slate-700 dark:text-slate-300">{activeReviewAttempt.timeSpent}s</strong></span>
                    </div>
                  )}
                </div>

                {/* Question Vignette */}
                <CardTitle className="text-base font-normal leading-relaxed text-slate-900 dark:text-slate-100 pt-4">
                  {activeReviewQuestion?.question || activeReviewAttempt?.questionText || `Question ID: ${sessionData.question_ids[selectedReviewIndex]}`}
                </CardTitle>
              </CardHeader>

              {/* Answer Options Breakdown */}
              <CardContent className="space-y-3 pt-4">
                {activeReviewQuestion?.options?.map((optText: string, optIdx: number) => {
                  const wasChosen = activeReviewAttempt?.selectedOption === optIdx
                  const wasCorrect = activeReviewAttempt?.correctOption === optIdx

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

                {/* Explanation section if available */}
                {(activeReviewQuestion?.explanation || activeReviewAttempt?.explanation) && (
                  <div className="mt-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 space-y-2">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Official Educational Explanation</span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 select-text whitespace-pre-wrap">
                      {activeReviewQuestion?.explanation || activeReviewAttempt?.explanation}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
              </div>
            </>
          ) : (
            <>
      {/* Session Header */}
      <header className="w-full flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{sessionTitle}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
              <span>Keys: <kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px]">A-D</kbd> select</span>
              <span>•</span>
              <span><kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px]">Enter</kbd> submit / next</span>
              <span>•</span>
              <span>Right-click strike</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-3 text-sm">
          <Badge variant="outline" className="px-3 py-1 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 bg-transparent">
            {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
          </Badge>
          <Badge className="px-3 py-1 bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-none">
            Question {currentIndex + 1} of {sessionData.question_ids.length}
          </Badge>
          <Button
            size="sm"
            variant={isSidebarOpen ? "secondary" : "outline"}
            onClick={() => setIsSidebarOpen(prev => !prev)}
            className="h-8 px-2.5 text-xs font-medium rounded-lg gap-1.5 cursor-pointer border-slate-200 dark:border-slate-800"
            title={isSidebarOpen ? "Collapse MedSearch" : "Show MedSearch"}
          >
            {isSidebarOpen ? <PanelRightClose className="w-3.5 h-3.5 text-slate-500" /> : <PanelRightOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
            <span>{isSidebarOpen ? "Hide MedSearch" : "Show MedSearch"}</span>
          </Button>
        </div>
      </header>

      {/* Main Question Card */}
      <Card className="w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="space-y-2">
          {question?.subject && (
            <Badge className="w-fit bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
              {question.subject}
            </Badge>
          )}
          <CardTitle className="text-lg font-normal leading-relaxed text-slate-900 dark:text-slate-100 pt-2">
            {question?.question}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {options.map((optText: string, idx: number) => {
            const optionNumber = idx
            const isSelected = selectedOption === optionNumber
            const isStruck = struckOptions.includes(optionNumber)

            let buttonStyle = 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'

            if (attemptResult) {
              if (optionNumber === attemptResult.correct_option) {
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
                key={optionNumber}
                type="button"
                onClick={() => handleSelectOption(optionNumber)}
                onContextMenu={(e) => handleToggleStrike(e, optionNumber)}
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
            <Button onClick={handleSubmit} disabled={selectedOption === null || attemptMutation.isPending} className="bg-emerald-600 hover:bg-emerald-500 text-white">
              {attemptMutation.isPending ? 'Checking...' : 'Submit Answer'}
            </Button>
          ) : (
            <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-500 text-white">
              {currentIndex + 1 >= sessionData.question_ids.length ? 'Finish & Review Block →' : 'Next Question →'}
            </Button>
          )}
        </CardFooter>
      </Card>

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
          )}
        </div>
      </div>

      {/* PERSISTENT RIGHT SIDEBAR */}
      {isSidebarOpen && (
        <div className="w-full lg:w-[35%] xl:w-[32%] border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 lg:h-full lg:overflow-y-auto flex-shrink-0 bg-white dark:bg-slate-900 rounded-2xl lg:rounded-none pb-10 lg:pb-0 animate-in fade-in duration-300">
          <div className="p-4 space-y-4">
            {/* RIGHT COLUMN: MEDSEARCH WORKSPACE */}
            <div>
              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                        <Search className="w-5 h-5" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                          MedSearch
                        </CardTitle>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                          🏛️ MedlinePlus • NIH
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsSidebarOpen(false)}
                        className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title="Collapse sidebar"
                      >
                        <PanelRightClose className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Interactive Search Bar - triggers on Enter or clicking Search */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (searchInput.trim()) {
                        setSubmittedQuery(searchInput.trim())
                      }
                    }}
                    className="relative mt-4 flex items-center gap-2"
                  >
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search conditions, diseases, symptoms (press Enter)..."
                        className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                      {searchInput && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchInput('')
                            setSubmittedQuery('')
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!searchInput.trim() || isLoadingEncyclopedia}
                      className="text-xs h-8 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer"
                    >
                      Search
                    </Button>
                  </form>
                </CardHeader>

                <CardContent className="p-4 space-y-3.5 max-h-[calc(100vh-220px)] overflow-y-auto">
                  {/* Loading indicator */}
                  {isLoadingEncyclopedia && (
                    <div className="p-6 text-xs text-slate-500 flex flex-col items-center justify-center gap-2 text-center">
                      <Sparkles className="w-5 h-5 animate-spin text-indigo-500" />
                      <span>Consulting National Library of Medicine...</span>
                    </div>
                  )}

                  {/* Search results */}
                  {!isLoadingEncyclopedia && encyclopediaEntries.length > 0 && (
                    <div className="space-y-3">
                      {encyclopediaEntries.map((entry, idx) => (
                        <EncyclopediaCard key={idx} entry={entry} />
                      ))}
                    </div>
                  )}

                  {/* Empty state when query was submitted but no topic was found */}
                  {!isLoadingEncyclopedia && isFetchedEncyclopedia && submittedQuery && encyclopediaEntries.length === 0 && (
                    <div className="py-12 text-center space-y-2">
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                        No MedlinePlus topics found for "{submittedQuery}".
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Try searching for the official disease name, pathogen, or clinical concept (e.g. "Kawasaki disease", "Aortic stenosis", "Chlamydia").
                      </p>
                    </div>
                  )}

                  {/* Initial prompt state before searching */}
                  {!submittedQuery && !isLoadingEncyclopedia && (
                    <div className="py-14 text-center space-y-2 px-4">
                      <div className="w-10 h-10 mx-auto rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <Search className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Quick Medical Topic Search
                      </p>
                      <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                        Type any disease, condition, or clinical term and press <strong>Enter</strong> to fetch official NIH topic overviews, symptoms, causes, and treatments.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

        </div>
      </div>
      )}

    </div>
  )
}

interface EncyclopediaCardProps {
  entry: EncyclopediaEntry;
}

function EncyclopediaCard({ entry }: EncyclopediaCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden p-4 space-y-3">
      {/* Header: Title on Left, Official Link on Right */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
            {entry.title}
          </h4>
          <a
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 shrink-0"
          >
            Official Topic &rarr;
          </a>
        </div>
        {entry.alt_titles && entry.alt_titles.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {entry.alt_titles.slice(0, 3).map((alt, idx) => (
              <span
                key={idx}
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              >
                {alt}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Sections Accordion */}
      <div className="space-y-2 text-xs">
        {entry.sections && entry.sections.length > 0 ? (
          entry.sections.map((sec, idx) => (
            <details
              key={idx}
              open={idx === 0}
              className="group border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50/50 dark:bg-slate-800/30"
            >
              <summary className="cursor-pointer font-medium p-2.5 bg-slate-100/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                {sec.heading}
              </summary>
              <div 
                className="p-3 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_li]:mb-1 [&_p]:my-1.5 [&_a]:text-indigo-600 dark:[&_a]:text-indigo-400 [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: sec.body }}
              />
            </details>
          ))
        ) : (
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            {entry.summary}
          </p>
        )}
      </div>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[10px] text-slate-400">
        Source: U.S. National Library of Medicine
      </div>
    </div>
  );
}