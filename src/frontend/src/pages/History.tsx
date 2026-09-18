import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { fetchDashboardStats, fetchSessionReview, retrySession } from '../api'
import { RotateCcw, Eye, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export default function History() {
  const navigate = useNavigate()
  const [loadingSessionId, setLoadingSessionId] = useState<number | null>(null)
  const [actionType, setActionType] = useState<'review' | 'retry' | null>(null)

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: fetchDashboardStats,
  })

  // Review mutation: Fetches past session questions + recorded answers and opens Session in Review Mode
  const reviewMutation = useMutation({
    mutationFn: (sessionId: number) => fetchSessionReview(sessionId),
    onSuccess: (data) => {
      navigate('/session', {
        state: {
          sessionData: data.sessionData,
          attempts: data.attempts,
          isReviewMode: true,
        },
      })
    },
    onSettled: () => {
      setLoadingSessionId(null)
      setActionType(null)
    },
  })

  // Retry mutation: Creates a brand-new session with the same questions and starts active test
  const retryMutation = useMutation({
    mutationFn: (sessionId: number) => retrySession(sessionId),
    onSuccess: (data) => {
      navigate('/session', {
        state: {
          sessionData: data,
        },
      })
    },
    onSettled: () => {
      setLoadingSessionId(null)
      setActionType(null)
    },
  })

  const handleReview = (sessionId: number) => {
    setLoadingSessionId(sessionId)
    setActionType('review')
    reviewMutation.mutate(sessionId)
  }

  const handleRetry = (sessionId: number) => {
    setLoadingSessionId(sessionId)
    setActionType('retry')
    retryMutation.mutate(sessionId)
  }

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-64 w-full rounded-3xl" /></div>

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Session History</h1>
        <p className="text-slate-500 mt-2">Review past sessions and re-test on previous blocks</p>
      </div>

      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50">
          <CardTitle className="text-lg">Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
              <TableRow className="hover:bg-transparent border-slate-200 dark:border-slate-800">
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead>Block ID</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Pacing</TableHead>
                <TableHead>Accuracy</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats?.recent_sessions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                    No sessions recorded yet. Start studying to generate data.
                  </TableCell>
                </TableRow>
              ) : (
                stats?.recent_sessions?.map((session: any) => {
                  const isThisLoading = loadingSessionId === session.session_id
                  const isReviewLoading = isThisLoading && actionType === 'review'
                  const isRetryLoading = isThisLoading && actionType === 'retry'

                  return (
                    <TableRow key={session.session_id} className="border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                        {new Date(session.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-slate-500 dark:text-slate-400 font-mono text-xs">
                        #{session.session_id}
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-300 text-xs max-w-[180px] truncate" title={session.scope}>
                        {session.scope || 'All'}
                      </TableCell>
                      <TableCell>
                        {session.questions_answered} Qs
                      </TableCell>
                      <TableCell className="text-slate-500 dark:text-slate-400 text-xs">
                        {session.average_time_seconds}s / Q
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${session.accuracy_percentage >= 70 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                          {session.accuracy_percentage}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Review Button */}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleReview(session.session_id)}
                            disabled={isThisLoading}
                            className="h-8 px-2.5 text-xs rounded-lg border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            {isReviewLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5 mr-1 text-blue-500" />
                                Review
                              </>
                            )}
                          </Button>

                          {/* Retry Button */}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleRetry(session.session_id)}
                            disabled={isThisLoading}
                            className="h-8 px-2.5 text-xs rounded-lg border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                          >
                            {isRetryLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <RotateCcw className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                                Retry
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
    </div>
  )
}