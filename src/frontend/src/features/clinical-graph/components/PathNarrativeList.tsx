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
      <div className="flex items-center justify-between">
        <span className="font-heading font-medium text-[16px] text-[#1E2B27] dark:text-white">
          Pathophysiological Reasoning
        </span>
        <span className="text-[12px] font-medium text-[#4F5C57] dark:text-slate-400 bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-[#E3E8E5] dark:border-slate-700">
          {paths.filter((p) => p.found).length} of {paths.length} connected
        </span>
      </div>

      <div className="space-y-2.5">
        {paths.map((p, idx) => (
          <div
            key={`${p.clue}-${idx}`}
            className="p-3.5 rounded-[18px] bg-white dark:bg-slate-900 border border-[#E3E8E5] dark:border-slate-800 text-xs flex flex-col gap-2.5 shadow-[0_1px_3px_rgba(30,43,39,0.04)]"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-[14px] text-[#1E2B27] dark:text-white flex items-center gap-2">
                {p.found ? (
                  <CheckCircle2 className="w-4 h-4 text-[#0B7A5A] dark:text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
                )}
                {p.clue}
              </span>
              <span className="text-[12px] text-[#4F5C57] dark:text-slate-400 font-medium">
                {p.found ? `${p.steps.length} steps to target` : 'No connection found'}
              </span>
            </div>

            {p.found && p.steps.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-[#1E2B27] dark:text-slate-200 leading-normal pt-1">
                {p.steps.map((step, sIdx) => (
                  <React.Fragment key={`${step.from_id}-${sIdx}`}>
                    <span className="px-3 py-1 rounded-full bg-[#FAF9F6] dark:bg-slate-800 border border-[#E3E8E5] dark:border-slate-700 font-medium shadow-2xs">
                      {step.from_name}
                    </span>
                    <span className="text-[12px] text-[#0B5F46] dark:text-emerald-300 font-medium bg-[#E3F2EA] dark:bg-emerald-950/60 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <span>{formatRelation(step.relation)}</span>
                      <span className="text-[10px] opacity-70">→</span>
                    </span>
                    {sIdx === p.steps.length - 1 && (
                      <span className="px-3 py-1 rounded-full bg-[#E3F2EA] text-[#0B5F46] dark:bg-emerald-950/90 dark:text-emerald-200 font-semibold border border-[#0B7A5A]/30 shadow-2xs">
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
