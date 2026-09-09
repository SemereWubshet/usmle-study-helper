import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { fetchDashboardStats, createSession } from '../api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export default function Dashboard() {
  const navigate = useNavigate()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: fetchDashboardStats,
  })

  const sessionMutation = useMutation({
    mutationFn: () => createSession("medmcqa", 40),
    onSuccess: (data) => {
      // Pass the session data directly to the Session route through memory
      navigate('/session', { state: { sessionData: data } })
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 space-y-6">
        <Skeleton className="h-32 w-full max-w-2xl bg-slate-900 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center py-12 px-4 space-y-8">
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-white">USMLE Study Engine</h1>
        <p className="text-slate-400">Targeted blocks. Measurable progression.</p>
      </header>

      {/* Global Metrics */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats?.total_answered || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Global Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-400">{stats?.global_accuracy || 0}%</div>
          </CardContent>
        </Card>
      </div>

      <Button 
        onClick={() => sessionMutation.mutate()} 
        disabled={sessionMutation.isPending}
        className="w-full max-w-2xl h-14 text-lg bg-emerald-600 hover:bg-emerald-500 text-white"
      >
        {sessionMutation.isPending ? 'Generating Block...' : 'Start 40-Question Block'}
      </Button>

      {/* Session History */}
      <div className="w-full max-w-2xl space-y-4">
        <h3 className="text-lg font-semibold text-slate-300 border-b border-slate-800 pb-2">Recent Blocks</h3>
        {stats?.recent_sessions?.length === 0 && (
          <p className="text-slate-500 text-sm">No sessions completed yet.</p>
        )}
        <div className="space-y-3">
          {stats?.recent_sessions?.map((session: any) => (
            <div key={session.session_id} className="flex items-center justify-between p-4 rounded-lg bg-slate-900/50 border border-slate-800">
              <div>
                <div className="text-sm font-medium text-slate-200">Session #{session.session_id}</div>
                <div className="text-xs text-slate-500">{new Date(session.created_at).toLocaleDateString()}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-emerald-400">{session.accuracy_percentage}%</div>
                <div className="text-xs text-slate-500">{session.questions_answered} answered</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}