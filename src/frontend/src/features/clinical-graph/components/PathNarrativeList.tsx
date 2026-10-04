import React from 'react';
import type { CluePath } from '../types';
import { CheckCircle2, XCircle } from 'lucide-react';

interface PathNarrativeListProps {
  paths: CluePath[];
}

export const PathNarrativeList: React.FC<PathNarrativeListProps> = ({
  paths,
}) => {
  if (paths.length === 0) return null;

  // Format relation strings cleanly: e.g. "isa" -> "is a", "cause_of" -> "cause of"
  const formatRelation = (rel: string) => {
    const clean = rel.trim().toLowerCase();
    if (clean === 'isa') return 'is a';
    return clean.replace(/_/g, ' ');
  };

  return (
    <div className="flex flex-col gap-2.5 pt-2">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
        Pathophysiological Reasoning ({paths.filter(p => p.found).length}/{paths.length} connected)
      </span>

      <div className="space-y-2">
        {paths.map((p, idx) => (
          <div
            key={`${p.clue}-${idx}`}
            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs flex flex-col gap-2 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                {p.found ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                {p.clue}
              </span>
              <span className="text-[11px] text-slate-500 font-mono font-medium">
                {p.found ? `${p.steps.length} hops to target` : 'no path found'}
              </span>
            </div>

            {p.found && p.steps.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200 leading-normal pt-1">
                {p.steps.map((step, sIdx) => (
                  <React.Fragment key={`${step.from_id}-${sIdx}`}>
                    <span className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium shadow-2xs">
                      {step.from_name}
                    </span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold px-1 flex items-center">
                      ──[{formatRelation(step.relation)}]──►
                    </span>
                    {sIdx === p.steps.length - 1 && (
                      <span className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                        {step.to_name}
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
