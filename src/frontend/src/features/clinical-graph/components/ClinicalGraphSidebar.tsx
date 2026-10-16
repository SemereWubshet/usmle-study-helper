import React from 'react';
import { X, AlertCircle, ExternalLink } from 'lucide-react';
import { MedGraphIcon } from '@/components/icons/MedGraphIcon';
import { ClueChipBar } from './ClueChipBar';
import { ClinicalGraphCanvas } from './ClinicalGraphCanvas';
import { PathNarrativeList } from './PathNarrativeList';
import type { ClinicalGraphResponse } from '../types';

interface ClinicalGraphSidebarProps {
  options?: string[];
  onClose: () => void;
  clues: string[];
  currentTarget: string;
  graphData: ClinicalGraphResponse | null;
  isExtracting: boolean;
  isLoadingGraph: boolean;
  errorMessage: string | null;
  onExtractClues: () => void;
  onAddClue: (clue: string) => void;
  onRemoveClue: (index: number) => void;
  onSelectTarget: (target: string) => void;
}

export const ClinicalGraphSidebar: React.FC<ClinicalGraphSidebarProps> = ({
  options = [],
  onClose,
  clues,
  currentTarget,
  graphData,
  isExtracting,
  isLoadingGraph,
  errorMessage,
  onExtractClues,
  onAddClue,
  onRemoveClue,
  onSelectTarget,
}) => {
  return (
    <aside className="w-full h-full overflow-y-auto flex-shrink-0 bg-[#EFF4F0] dark:bg-slate-900 rounded-[28px] p-5 sm:p-6 pb-12 lg:pb-6 animate-in fade-in duration-300 border border-[#E3E8E5]/70 dark:border-slate-800 shadow-[0_4px_20px_rgba(30,43,39,0.04)]">
      <div className="space-y-4">
        {/* Top Header: Fraunces Title, DR.KNOWS badge, Subtitle, and Close Button */}
        <div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="w-10 h-10 rounded-full bg-[#E3F2EA] dark:bg-emerald-950/70 text-[#0B7A5A] dark:text-emerald-300 inline-flex items-center justify-center">
                <MedGraphIcon size={20} />
              </span>
              <span className="font-heading font-medium text-2xl text-[#1E2B27] dark:text-white">
                MedGraph
              </span>
              <a
                href="https://github.com/drknows/drknows"
                target="_blank"
                rel="noopener noreferrer"
                title="Knowledge Graph sourced from DR.KNOWS biomedical ontology"
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 text-[#0B5F46] dark:text-emerald-300 border border-[#E3E8E5] dark:border-slate-700 tracking-wider hover:text-emerald-600 transition-colors uppercase select-none"
              >
                <span>DR.KNOWS</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </a>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close panel"
              className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 border border-[#E3E8E5] dark:border-slate-700 text-[#3E4A45] dark:text-slate-300 hover:text-[#1E2B27] hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-1 text-[12px] text-[#4F5C57] dark:text-slate-400 pl-[50px]">
            Knowledge Graph sourced from DR.KNOWS biomedical ontology
          </p>
        </div>

        {/* Target / Differential Switcher */}
        {options.length > 0 && (
          <div className="flex flex-col gap-2 pt-1">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-[#4F5C57] dark:text-slate-400">
              Select Target
            </span>
            <div className="flex flex-wrap gap-2">
              {options.map((opt) => {
                const isSelected = opt === currentTarget;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onSelectTarget(opt)}
                    className={`min-h-[38px] px-4 rounded-full text-[13px] transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#E3F2EA] dark:bg-emerald-950/70 text-[#0B5F46] dark:text-emerald-300 font-semibold border border-[#0B7A5A] shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-[#1E2B27] dark:text-slate-300 font-medium border border-[#E3E8E5] dark:border-slate-700 hover:border-[#0B7A5A]/50'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Clue Chips Bar */}
        <ClueChipBar
          clues={clues}
          onAddClue={onAddClue}
          onRemoveClue={onRemoveClue}
          onAutoExtract={onExtractClues}
          isExtracting={isExtracting}
          isLoadingGraph={isLoadingGraph}
        />

        {/* Status / Loading / Error Notice */}
        {isLoadingGraph && (
          <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 animate-pulse">
            <MedGraphIcon size={16} className="animate-spin shrink-0" />
            <span>Connecting path from clues to <strong>{currentTarget}</strong> via DR.KNOWS graph...</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Graph Visual Stage */}
        {graphData ? (
          <div className="flex flex-col gap-3">
            <ClinicalGraphCanvas
              nodes={graphData.nodes}
              edges={graphData.edges}
              onAddHaloToClues={onAddClue}
            />
            <PathNarrativeList
              paths={graphData.paths}
            />
          </div>
        ) : (
          <div className="h-[280px] rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-6 text-center text-slate-400 gap-3">
            <MedGraphIcon size={48} className="text-slate-300 dark:text-slate-700 animate-pulse" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                Ready to Map Pathophysiology
              </p>
              <p className="text-xs text-slate-500 max-w-xs">
                Click <strong>Auto-Extract</strong> to grab clues from the vignette, or type a custom finding to ignite the constellation!
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
