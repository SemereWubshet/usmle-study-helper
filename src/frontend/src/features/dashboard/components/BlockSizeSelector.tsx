
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
  const currentVal = blockCount[0] || 40

  const handleStep = (delta: number) => {
    const next = Math.max(5, Math.min(maxLimit, currentVal + delta))
    setBlockCount([next])
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val === '') {
      setBlockCount([1])
      return
    }
    const num = parseInt(val, 10)
    if (!isNaN(num)) {
      setBlockCount([Math.max(1, Math.min(maxLimit, num))])
    }
  }

  const handleBlur = () => {
    const clamped = Math.max(5, Math.min(maxLimit, currentVal))
    setBlockCount([clamped])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const clamped = Math.max(5, Math.min(maxLimit, currentVal))
      setBlockCount([clamped])
      e.currentTarget.blur()
    }
  }

  return (
    <div className="space-y-4 pt-6 border-t border-[#E8ECE9] dark:border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <span className="text-[17px] font-semibold text-[#1E2B27] dark:text-white">
            Block size
          </span>
          <span className="text-[13px] text-[#4F5C57] dark:text-slate-400">
            up to {maxLimit}
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Stepper Controls */}
          <button
            type="button"
            onClick={() => handleStep(-5)}
            disabled={currentVal <= 5}
            aria-label="Fewer questions"
            className="w-10 h-10 rounded-full border-0 bg-transparent text-[22px] font-medium text-[#3E4A45] hover:text-[#1E2B27] hover:bg-[#E3F2EA]/60 dark:text-slate-300 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer"
          >
            −
          </button>

          <label htmlFor="block-size-input" className="sr-only">Number of questions</label>
          <input
            id="block-size-input"
            type="text"
            inputMode="numeric"
            value={currentVal}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-14 h-11 text-center border-0 border-b-2 border-[#0B7A5A] bg-transparent font-heading font-medium text-[26px] text-[#1E2B27] dark:text-white p-0 focus:outline-none"
          />

          <button
            type="button"
            onClick={() => handleStep(5)}
            disabled={currentVal >= maxLimit}
            aria-label="More questions"
            className="w-10 h-10 rounded-full border-0 bg-transparent text-[22px] font-medium text-[#3E4A45] hover:text-[#1E2B27] hover:bg-[#E3F2EA]/60 dark:text-slate-300 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer"
          >
            +
          </button>

          {/* Vertical Divider */}
          <span className="w-px h-6 bg-[#E3E8E5] dark:bg-slate-700 mx-1 sm:mx-2" />

          {/* Quick Presets */}
          <div className="flex items-center gap-1">
            {[10, 20, 40].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setBlockCount([preset])}
                className={`min-w-[40px] h-9 px-2.5 rounded-full text-[14px] font-medium transition-all cursor-pointer ${
                  currentVal === preset
                    ? 'bg-[#E3F2EA] text-[#0B5F46] font-semibold dark:bg-emerald-950/70 dark:text-emerald-300'
                    : 'bg-transparent text-[#3E4A45] hover:text-[#1E2B27] hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

