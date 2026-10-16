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
    <div className="w-full flex flex-col rounded-[32px] border border-[#E3E8E5] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_4px_24px_rgba(30,43,39,0.06)] overflow-hidden">
      {/* Mock Browser Title Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#FAF9F6] dark:bg-slate-950/60 border-b border-[#E3E8E5] dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FCEDE8] border border-[#C9573A]/40 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FEF7D6] border border-amber-400/40 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#E3F2EA] border border-[#0B7A5A]/40 inline-block" />
          <span className="ml-2 text-[12px] font-medium text-[#4F5C57] dark:text-slate-400 hidden sm:inline">
            USMLE Study Helper
          </span>
        </div>

        {/* Tab Controls */}
        <div className="inline-flex gap-1 p-1 bg-[#EDF0EE] dark:bg-slate-800/80 rounded-full border border-[#E3E8E5]/70 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('session')}
            className={`min-h-[30px] px-3.5 rounded-full text-[12px] font-medium transition-all cursor-pointer ${
              activeTab === 'session'
                ? 'bg-white dark:bg-slate-900 text-[#1E2B27] dark:text-white font-semibold shadow-[0_1px_3px_rgba(30,43,39,0.08)]'
                : 'bg-transparent text-[#3E4A45] dark:text-slate-400 hover:text-[#1E2B27]'
            }`}
          >
            Practice Session
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`min-h-[30px] px-3.5 rounded-full text-[12px] font-medium transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-white dark:bg-slate-900 text-[#1E2B27] dark:text-white font-semibold shadow-[0_1px_3px_rgba(30,43,39,0.08)]'
                : 'bg-transparent text-[#3E4A45] dark:text-slate-400 hover:text-[#1E2B27]'
            }`}
          >
            Analytics Progress
          </button>
        </div>
      </div>

      {/* Preview Content Area */}
      <div className="p-5 sm:p-7 select-text overflow-hidden">
        {activeTab === 'session' ? (
          <PreviewSession isSidebarOpen={isSidebarOpen} onToggleSidebar={onToggleSidebar} />
        ) : (
          <PreviewAnalytics />
        )}
      </div>

      {/* Footer Highlight */}
      <div className="px-5 py-3 bg-[#FAF9F6] dark:bg-slate-950/60 border-t border-[#E3E8E5] dark:border-slate-800 flex items-center justify-between text-[12px] text-[#4F5C57] dark:text-slate-400">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#0B7A5A] dark:text-emerald-400" />
          <span>Full simulation with search, charts, and study tools</span>
        </div>
        <span className="font-semibold text-[#1E2B27] dark:text-slate-300">12,700+ Questions</span>
      </div>
    </div>
  )
}
