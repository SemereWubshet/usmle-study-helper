import { SlidersHorizontal } from 'lucide-react'

interface AdvancedBenchmarksProps {
  showAdvanced: boolean;
  setShowAdvanced: (val: boolean) => void;
  passingThreshold: number;
  setPassingThreshold: (val: number) => void;
  excellenceThreshold: number;
  setExcellenceThreshold: (val: number) => void;
  targetSeconds: number;
  setTargetSeconds: (val: number) => void;
}

export function AdvancedBenchmarks({
  showAdvanced,
  setShowAdvanced,
  passingThreshold,
  setPassingThreshold,
  excellenceThreshold,
  setExcellenceThreshold,
  targetSeconds,
  setTargetSeconds,
}: AdvancedBenchmarksProps) {
  return (
    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center space-x-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span>{showAdvanced ? "Hide Pacing & Review Targets" : "Configure Pacing & Review Benchmarks"}</span>
      </button>

      {showAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 animate-in fade-in duration-300">
          {/* Passing Threshold */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Passing</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{passingThreshold}%</span>
            </div>
            <input
              type="range"
              min={40}
              max={90}
              step={5}
              value={passingThreshold}
              onChange={(e) => setPassingThreshold(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <p className="text-[10px] text-slate-400">Pass cutoff for summary</p>
          </div>

          {/* Mastery Threshold */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Mastery</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{excellenceThreshold}%</span>
            </div>
            <input
              type="range"
              min={60}
              max={100}
              step={5}
              value={excellenceThreshold}
              onChange={(e) => setExcellenceThreshold(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <p className="text-[10px] text-slate-400">Gold standard benchmark</p>
          </div>

          {/* Target Pace */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Pace</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{targetSeconds}s</span>
            </div>
            <input
              type="range"
              min={30}
              max={180}
              step={5}
              value={targetSeconds}
              onChange={(e) => setTargetSeconds(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <p className="text-[10px] text-slate-400">{Math.floor(targetSeconds / 60)}m {targetSeconds % 60}s / Q</p>
          </div>
        </div>
      )}
    </div>
  )
}

