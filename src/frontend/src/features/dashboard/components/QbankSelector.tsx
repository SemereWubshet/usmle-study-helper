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
    <section className="space-y-4">
      <div>
        <div className="text-[12px] tracking-[0.08em] uppercase text-[#4F5C57] dark:text-slate-400 font-semibold">
          Step 1
        </div>
        <h2 className="text-xl font-semibold text-[#1E2B27] dark:text-white mt-1">
          Which question bank?
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* USMLE Step 1 */}
        <button
          type="button"
          onClick={onSelectStep1}
          className={`text-left p-5 rounded-[20px] transition-all cursor-pointer flex flex-col justify-between min-h-[108px] ${
            selectedQbank === "medqa_usmle" && examTarget === "USMLE Step 1"
              ? "bg-white dark:bg-slate-900 border-2 border-[#0B7A5A] text-[#1E2B27] dark:text-white shadow-[0_8px_24px_rgba(11,122,90,0.12)]"
              : "bg-white dark:bg-slate-900/60 border border-[#E3E8E5] dark:border-slate-800 text-[#1E2B27] dark:text-slate-200 hover:border-[#0B7A5A]/50 shadow-[0_1px_3px_rgba(30,43,39,0.06)]"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <BookOpen className={`w-5 h-5 ${selectedQbank === "medqa_usmle" && examTarget === "USMLE Step 1" ? "text-[#0B7A5A]" : "text-[#4F5C57] dark:text-slate-400"}`} />
            {selectedQbank === "medqa_usmle" && examTarget === "USMLE Step 1" && (
              <span className="w-2.5 h-2.5 rounded-full bg-[#0B7A5A]" />
            )}
          </div>
          <div>
            <div className="font-semibold text-base text-[#1E2B27] dark:text-white">USMLE Step 1</div>
            <div className="text-[12px] text-[#4F5C57] dark:text-slate-400 mt-0.5">Foundational Basic Sciences</div>
          </div>
        </button>

        {/* USMLE Step 2 & 3 */}
        <button
          type="button"
          onClick={onSelectStep2And3}
          className={`text-left p-5 rounded-[20px] transition-all cursor-pointer flex flex-col justify-between min-h-[108px] ${
            selectedQbank === "medqa_usmle" && examTarget === "USMLE Step 2 and Step 3"
              ? "bg-white dark:bg-slate-900 border-2 border-[#0B7A5A] text-[#1E2B27] dark:text-white shadow-[0_8px_24px_rgba(11,122,90,0.12)]"
              : "bg-white dark:bg-slate-900/60 border border-[#E3E8E5] dark:border-slate-800 text-[#1E2B27] dark:text-slate-200 hover:border-[#0B7A5A]/50 shadow-[0_1px_3px_rgba(30,43,39,0.06)]"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <GraduationCap className={`w-5 h-5 ${selectedQbank === "medqa_usmle" && examTarget === "USMLE Step 2 and Step 3" ? "text-[#0B7A5A]" : "text-[#4F5C57] dark:text-slate-400"}`} />
            {selectedQbank === "medqa_usmle" && examTarget === "USMLE Step 2 and Step 3" && (
              <span className="w-2.5 h-2.5 rounded-full bg-[#0B7A5A]" />
            )}
          </div>
          <div>
            <div className="font-semibold text-base text-[#1E2B27] dark:text-white">USMLE Step 2 & 3</div>
            <div className="text-[12px] text-[#4F5C57] dark:text-slate-400 mt-0.5">Clinical Management & Specialties</div>
          </div>
        </button>

        {/* MedMCQA */}
        <button
          type="button"
          onClick={onSelectMedMCQA}
          className={`text-left p-5 rounded-[20px] transition-all cursor-pointer flex flex-col justify-between min-h-[108px] ${
            selectedQbank === "medmcqa"
              ? "bg-white dark:bg-slate-900 border-2 border-[#0B7A5A] text-[#1E2B27] dark:text-white shadow-[0_8px_24px_rgba(11,122,90,0.12)]"
              : "bg-white dark:bg-slate-900/60 border border-[#E3E8E5] dark:border-slate-800 text-[#1E2B27] dark:text-slate-200 hover:border-[#0B7A5A]/50 shadow-[0_1px_3px_rgba(30,43,39,0.06)]"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <Layers className={`w-5 h-5 ${selectedQbank === "medmcqa" ? "text-[#0B7A5A]" : "text-[#4F5C57] dark:text-slate-400"}`} />
            {selectedQbank === "medmcqa" && (
              <span className="w-2.5 h-2.5 rounded-full bg-[#0B7A5A]" />
            )}
          </div>
          <div>
            <div className="font-semibold text-base text-[#1E2B27] dark:text-white">MedMCQA</div>
            <div className="text-[12px] text-[#4F5C57] dark:text-slate-400 mt-0.5">Global High-Yield Question Bank</div>
          </div>
        </button>
      </div>
    </section>
  )
}

