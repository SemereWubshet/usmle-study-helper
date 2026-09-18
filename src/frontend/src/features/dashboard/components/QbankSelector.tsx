import { BookOpen, GraduationCap, Layers } from 'lucide-react'

interface QbankSelectorProps {
  selectedQbank: string;
  examTarget: string;
  onSelectStep1: () => void;
  onSelectStep2And3: () => void;
  onSelectMedMCQA: () => void;
}

export function QbankSelector({
  selectedQbank,
  examTarget,
  onSelectStep1,
  onSelectStep2And3,
  onSelectMedMCQA,
}: QbankSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">1</span>
        <label className="text-sm font-semibold text-slate-900 dark:text-slate-200">
          Exam & Question Bank
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* USMLE Step 1 */}
        <button
          type="button"
          onClick={onSelectStep1}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
            selectedQbank === "medqa_usmle" && examTarget === "USMLE Step 1"
              ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-sm ring-1 ring-emerald-500"
              : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            {selectedQbank === "medqa_usmle" && examTarget === "USMLE Step 1" && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </div>
          <div>
            <div className="font-semibold text-lg text-slate-900 dark:text-white">USMLE Step 1</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Foundational Basic Sciences</div>
          </div>
        </button>

        {/* USMLE Step 2 & 3 */}
        <button
          type="button"
          onClick={onSelectStep2And3}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
            selectedQbank === "medqa_usmle" && examTarget === "USMLE Step 2 and Step 3"
              ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-sm ring-1 ring-emerald-500"
              : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <GraduationCap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            {selectedQbank === "medqa_usmle" && examTarget === "USMLE Step 2 and Step 3" && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </div>
          <div>
            <div className="font-semibold text-lg text-slate-900 dark:text-white">USMLE Step 2 & 3</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Clinical Management & Specialties</div>
          </div>
        </button>

        {/* MedMCQA */}
        <button
          type="button"
          onClick={onSelectMedMCQA}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
            selectedQbank === "medmcqa"
              ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-sm ring-1 ring-emerald-500"
              : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            {selectedQbank === "medmcqa" && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </div>
          <div>
            <div className="font-semibold text-lg text-slate-900 dark:text-white">MedMCQA Bank</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Global High-Yield Question Bank</div>
          </div>
        </button>
      </div>
    </div>
  )
}

