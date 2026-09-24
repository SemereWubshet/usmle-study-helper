import type { EncyclopediaEntry } from '@/api'
import { AlertTriangle, ExternalLink } from 'lucide-react'

interface EncyclopediaCardProps {
  entry: EncyclopediaEntry;
}

export function EncyclopediaCard({ entry }: EncyclopediaCardProps) {
  const isBoxedWarning = entry.badge?.toLowerCase().includes('boxed') || entry.badge?.toLowerCase().includes('warning')

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden p-4 space-y-3">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
              {entry.title}
            </h4>
            {entry.badge && (
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  isBoxedWarning
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                }`}
              >
                {isBoxedWarning && <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />}
                {entry.badge}
              </span>
            )}
          </div>

          {entry.url && (
            <a
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 shrink-0 pt-0.5"
            >
              <span>Source</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {entry.alt_titles && entry.alt_titles.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {entry.alt_titles.slice(0, 4).map((alt, idx) => (
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

      <div className="space-y-2 text-xs">
        {entry.sections && entry.sections.length > 0 ? (
          entry.sections.map((sec, idx) => (
            <details
              key={idx}
              open={idx === 0}
              className="group border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50/50 dark:bg-slate-800/30"
            >
              <summary className="cursor-pointer font-medium p-2.5 bg-slate-100/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between">
                <span>{sec.heading}</span>
                <span className="text-[10px] text-slate-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div
                className="p-3 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_li]:mb-1 [&_p]:my-1.5 [&_a]:text-indigo-600 dark:[&_a]:text-indigo-400 [&_a]:underline font-normal"
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

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[10px] text-slate-400 flex items-center justify-between">
        <span>Source: {entry.source_label || 'Medical Reference'}</span>
        {entry.source && <span className="uppercase tracking-wider font-mono text-[9px]">{entry.source}</span>}
      </div>
    </div>
  )
}

