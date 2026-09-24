import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { PreviewSession } from './preview/PreviewSession'
import { PreviewAnalytics } from './preview/PreviewAnalytics'

interface EngineGatePreviewProps {
  isSidebarOpen?: boolean
  onToggleSidebar?: () => void
}

export function EngineGatePreview({ isSidebarOpen, onToggleSidebar }: EngineGatePreviewProps) {
  const [activeTab, setActiveTab] = useState<'session' | 'analytics'>('session')

  return (
    <div className="w-full flex flex-col rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
      {/* Mock Browser Title Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-100/80 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-rose-400 dark:bg-rose-500 inline-block" />
          <span className="w-3 h-3 rounded-full bg-amber-400 dark:bg-amber-500 inline-block" />
          <span className="w-3 h-3 rounded-full bg-emerald-400 dark:bg-emerald-500 inline-block" />
          <span className="ml-2 text-xs font-medium text-slate-500 dark:text-slate-400 hidden sm:inline">
            USMLE Study Helper • Live Preview
          </span>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('session')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
              activeTab === 'session'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Practice
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Analytics
          </button>
        </div>
      </div>

      {/* Preview Content Area */}
      <div className="p-4 sm:p-5 select-text overflow-hidden">
        {activeTab === 'session' ? (
          <PreviewSession isSidebarOpen={isSidebarOpen} onToggleSidebar={onToggleSidebar} />
        ) : (
          <PreviewAnalytics />
        )}
      </div>

      {/* Footer Highlight */}
      <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Full board simulation with MedlinePlus integration</span>
        </div>
        <span className="font-medium text-slate-600 dark:text-slate-400">12,700+ Questions</span>
      </div>
    </div>
  )
}
