import React, { useState } from 'react';
import { Plus, X, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ClueChipBarProps {
  clues: string[];
  onAddClue: (clue: string) => void;
  onRemoveClue: (index: number) => void;
  onAutoExtract: () => void;
  isExtracting: boolean;
  isLoadingGraph: boolean;
}

export const ClueChipBar: React.FC<ClueChipBarProps> = ({
  clues,
  onAddClue,
  onRemoveClue,
  onAutoExtract,
  isExtracting,
  isLoadingGraph,
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      onAddClue(inputValue.trim());
      setInputValue('');
    }
  };

  const handleAddClick = () => {
    if (inputValue.trim()) {
      onAddClue(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="flex flex-col gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 backdrop-blur-md">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          Vignette Clues ({clues.length})
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={isExtracting || isLoadingGraph}
          onClick={onAutoExtract}
          className="h-7 px-2.5 text-[11px] font-medium gap-1.5 rounded-lg border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 cursor-pointer"
        >
          {isExtracting ? (
            <Loader2 className="w-3 h-3 animate-spin text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          )}
          Auto-Extract
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 min-h-[32px]">
        {clues.map((clue, idx) => (
          <span
            key={`${clue}-${idx}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 shadow-xs animate-in fade-in zoom-in-95 duration-200"
          >
            <span className="max-w-[140px] truncate">{clue}</span>
            <button
              type="button"
              onClick={() => onRemoveClue(idx)}
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-100 rounded-full p-0.5 cursor-pointer transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        <div className="flex items-center gap-1 flex-1 min-w-[150px]">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={clues.length === 0 ? "Add symptom (e.g. fever)..." : "+ add clue..."}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 border border-slate-300 dark:border-slate-700/60 focus:outline-none focus:border-emerald-500 transition-colors shadow-2xs"
          />
          {inputValue.trim() && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleAddClick}
              className="h-7 w-7 p-0 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
