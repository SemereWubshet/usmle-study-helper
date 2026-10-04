import React from 'react';
import { X, Network, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    <div className="w-full h-full overflow-y-auto flex-shrink-0 bg-white dark:bg-slate-900 rounded-2xl lg:rounded-none pb-12 lg:pb-6 animate-in fade-in duration-300">
      <div className="p-4 space-y-4">
        {/* Sidebar Header with DR.KNOWS citation badge */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center">
              <Network className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                MedGraph
              </h3>
              <a
                href="https://github.com/drknows/drknows"
                target="_blank"
                rel="noopener noreferrer"
                title="Knowledge Graph sourced from DR.KNOWS biomedical ontology"
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors select-none"
              >
                <span>DR.KNOWS</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </a>
            </div>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
            title="Close MedGraph"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Target / Differential Switcher */}
        {options.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Select Diagnosis Target / Option
            </span>
            <div className="flex flex-wrap gap-1.5">
              {options.map((opt) => {
                const isSelected = opt === currentTarget;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onSelectTarget(opt)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs font-semibold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
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
            <Network className="w-4 h-4 animate-spin shrink-0" />
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
            <Network className="w-12 h-12 text-slate-300 dark:text-slate-700 animate-pulse" />
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
    </div>
  );
};
