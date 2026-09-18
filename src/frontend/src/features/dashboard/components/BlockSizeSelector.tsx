import { Slider } from '@/components/ui/slider'

interface BlockSizeSelectorProps {
  blockCount: number[];
  setBlockCount: (val: number[]) => void;
  maxAvailable: number;
}

export function BlockSizeSelector({
  blockCount,
  setBlockCount,
  maxAvailable,
}: BlockSizeSelectorProps) {
  const maxLimit = Math.min(maxAvailable || 100, 100)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">3</span>
          <label className="text-sm font-semibold text-slate-900 dark:text-slate-200">
            Block Size
          </label>
        </div>

        <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800/80 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <input 
            type="number" 
            min={1} 
            max={maxLimit}
            step={1}
            value={blockCount[0]}
            onChange={(e) => setBlockCount([Math.max(1, Math.min(100, Number(e.target.value) || 1))])}
            className="w-12 text-center text-sm font-bold bg-transparent text-slate-900 dark:text-white outline-none"
          />
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Questions</span>
        </div>
      </div>

      <Slider 
        value={blockCount} 
        max={maxLimit} 
        min={1} 
        step={1}
        onValueChange={setBlockCount}
        className="py-1"
      />

      {/* Quick preset pills */}
      <div className="flex items-center gap-2 pt-1">
        <span className="text-xs text-slate-400">Presets:</span>
        {[10, 20, 40].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setBlockCount([preset])}
            className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
              blockCount[0] === preset
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            {preset} Qs
          </button>
        ))}
      </div>
    </div>
  )
}

