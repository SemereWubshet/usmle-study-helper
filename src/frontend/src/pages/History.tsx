import { useQuery } from '@tanstack/react-query'
import { fetchDashboardStats } from '../api'
import { RotateCcw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'

export default function History() {
  // Using the dashboard stats API for now. 
  // Later, the backend can be updated to provide a dedicated /history endpoint with pagination.
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: fetchDashboardStats,
  })

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-64 w-full rounded-3xl" /></div>

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Session History</h1>
        <p className="text-slate-500 mt-2">Review past sessions and track your progress</p>
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
                <TableHead>Questions</TableHead>
                <TableHead>Pacing (seconds/Q)</TableHead>
                <TableHead>Accuracy</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats?.recent_sessions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                    No sessions recorded yet. Start studying to generate data.
                  </TableCell>
                </TableRow>
              ) : (
                stats?.recent_sessions?.map((session: any) => (
                  <TableRow key={session.session_id} className="border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                      {new Date(session.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-slate-500 dark:text-slate-400">
                      #{session.session_id}
                    </TableCell>
                    <TableCell>
                      {session.questions_answered} Qs
                    </TableCell>
                    <TableCell className="text-slate-500 dark:text-slate-400">
                      {session.average_time_seconds}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${session.accuracy_percentage >= 70 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                        {session.accuracy_percentage}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        None
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Subject-Level Readiness  */}
      {stats?.subject_performance && stats.subject_performance.length > 0 && (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50">
            <CardTitle className="text-lg">Subject Readiness</CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {stats.subject_performance.map((sub: any) => (
              <div key={sub.subject} className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{sub.subject}</span>
                  <span className="text-slate-500">
                    <span className={sub.accuracy_percentage >= 70 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-orange-600 dark:text-orange-400 font-bold'}>
                      {sub.accuracy_percentage}%
                    </span>
                    <span className="ml-1 text-xs">({sub.total_answered} Qs)</span>
                  </span>
                </div>
                <Progress value={sub.accuracy_percentage} className="h-2 bg-slate-100 dark:bg-slate-800" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      
    </div>
  )
}