import { ChevronDown } from 'lucide-react'

interface AdvancedBenchmarksProps {
  showAdvanced: boolean;
  setShowAdvanced: (val: boolean) => void;
  passingThreshold: number;
  setPassingThreshold: (val: number) => void;
  excellenceThreshold: number;
  setExcellenceThreshold: (val: number) => void;
  targetSeconds: number;
  setTargetSeconds: (val: number) => void;
  examDurationMinutes?: number;
  setExamDurationMinutes?: (val: number) => void;
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
  examDurationMinutes = 60,
  setExamDurationMinutes,
}: AdvancedBenchmarksProps) {
  return (
    <div className="pt-2">
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2.5 text-[15px] font-medium text-[#3E4A45] hover:text-[#1E2B27] dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer select-none"
      >
        <span>Advanced</span>
        <ChevronDown 
          className={`w-4 h-4 transition-transform duration-200 ${showAdvanced ? 'rotate-180 text-[#0B7A5A]' : 'text-[#3E4A45]'}`} 
        />
      </button>

      {showAdvanced && (
        <div className="mt-4 p-6 sm:p-7 bg-white dark:bg-slate-900 border border-[#E3E8E5] dark:border-slate-800 rounded-[24px] shadow-[0_1px_3px_rgba(30,43,39,0.06)] grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 animate-in fade-in duration-200">
          {/* Passing score */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="rPas" className="text-[15px] font-semibold text-[#1E2B27] dark:text-white">
                Passing score
              </label>
              <span className="font-heading font-medium text-[22px] text-[#0B7A5A]">
                {passingThreshold}%
              </span>
            </div>
            <input
              id="rPas"
              type="range"
              min={30}
              max={95}
              step={5}
              value={passingThreshold}
              onChange={(e) => {
                const val = Number(e.target.value)
                setPassingThreshold(val)
                if (val > excellenceThreshold) {
                  setExcellenceThreshold(val)
                }
              }}
              className="w-full h-2 accent-[#0B7A5A] cursor-pointer"
            />
            <div className="text-[13px] text-[#4F5C57] dark:text-slate-400">
              The cutoff shown on your summary.
            </div>
          </div>

          {/* Mastery goal */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="rMas" className="text-[15px] font-semibold text-[#1E2B27] dark:text-white">
                Mastery goal
              </label>
              <span className="font-heading font-medium text-[22px] text-[#4B3FD6]">
                {excellenceThreshold}%
              </span>
            </div>
            <input
              id="rMas"
              type="range"
              min={30}
              max={100}
              step={5}
              value={excellenceThreshold}
              onChange={(e) => {
                const val = Number(e.target.value)
                setExcellenceThreshold(val)
                if (val < passingThreshold) {
                  setPassingThreshold(val)
                }
              }}
              className="w-full h-2 accent-[#4B3FD6] cursor-pointer"
            />
            <div className="text-[13px] text-[#4F5C57] dark:text-slate-400">
              Your gold standard benchmark.
            </div>
          </div>

          {/* Pace per question */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="rPac" className="text-[15px] font-semibold text-[#1E2B27] dark:text-white">
                Pace per question
              </label>
              <span className="font-heading font-medium text-[22px] text-[#2F6FEB]">
                {targetSeconds}s
              </span>
            </div>
            <input
              id="rPac"
              type="range"
              min={30}
              max={180}
              step={5}
              value={targetSeconds}
              onChange={(e) => setTargetSeconds(Number(e.target.value))}
              className="w-full h-2 accent-[#2F6FEB] cursor-pointer"
            />
            <div className="text-[13px] text-[#4F5C57] dark:text-slate-400">
              About {Math.floor(targetSeconds / 60)} min {targetSeconds % 60 ? `${targetSeconds % 60} seconds` : ''} each.
            </div>
          </div>

          {/* Exam time */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="rExa" className="text-[15px] font-semibold text-[#1E2B27] dark:text-white">
                Exam time
              </label>
              <span className="font-heading font-medium text-[22px] text-[#E08A00]">
                {examDurationMinutes} min
              </span>
            </div>
            <input
              id="rExa"
              type="range"
              min={10}
              max={180}
              step={5}
              value={examDurationMinutes}
              onChange={(e) => setExamDurationMinutes && setExamDurationMinutes(Number(e.target.value))}
              className="w-full h-2 accent-[#E08A00] cursor-pointer"
            />
            <div className="text-[13px] text-[#4F5C57] dark:text-slate-400">
              How long the exam countdown runs.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

