import { useState } from 'react'
import { Clock, Search, X, Check } from 'lucide-react'
import { MedGraphIcon } from '@/components/icons/MedGraphIcon'

interface PreviewSessionProps {
  isSidebarOpen?: boolean
  onToggleSidebar?: () => void
}

const SAMPLE_OPTIONS = [
  'Budd-Chiari syndrome',
  'Viral hepatitis',
  'Nonalcoholic fatty liver disease',
  'Drug-induced hepatitis'
]

export function PreviewSession({ 
  isSidebarOpen: _controlledSidebarOpen, 
  onToggleSidebar: _controlledToggleSidebar 
}: PreviewSessionProps) {
  // Interactive question states
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [struckOptions, setStruckOptions] = useState<number[]>([])
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false)

  const handleSelectOption = (idx: number) => {
    setSelectedOption(idx)
    setIsAnswerSubmitted(true)
  }

  const handleToggleStrike = (e: React.MouseEvent, idx: number) => {
    e.preventDefault()
    setStruckOptions(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    )
  }

  return (
    <div className="space-y-5">
      {/* 1. Session Header Replica */}
      <div className="flex flex-col gap-3 pb-3 border-b border-[#E3E8E5] dark:border-slate-800">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[11px] tracking-[0.08em] uppercase text-[#4F5C57] dark:text-slate-400 font-semibold">
              USMLE Step 1
            </div>
            <div className="mt-1 flex items-center gap-3 flex-wrap">
              <h2 className="font-heading font-medium text-2xl sm:text-[26px] text-[#1E2B27] dark:text-white leading-[1.1]">
                Question 14 of 40
              </h2>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDF0EE] dark:bg-slate-800 text-[12px] font-semibold text-[#3E4A45] dark:text-slate-300">
                <Clock className="w-3.5 h-3.5 text-[#3E4A45] dark:text-slate-400" />
                <span>45s elapsed</span>
              </span>
            </div>
          </div>

          {/* Right Panel Toggle Pill Group (Visual only) */}
          <div className="inline-flex gap-1 p-1 bg-[#EDF0EE] dark:bg-slate-800/80 rounded-full border border-[#E3E8E5]/70 dark:border-slate-800">
            <span
              className="min-h-[34px] px-3.5 rounded-full text-[13px] inline-flex items-center gap-1.5 bg-transparent text-[#3E4A45] dark:text-slate-400 font-medium select-none cursor-default"
              title="MedSearch is available during active sessions"
            >
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span>MedSearch</span>
            </span>

            <span
              className="min-h-[34px] px-3.5 rounded-full text-[13px] inline-flex items-center gap-1.5 bg-transparent text-[#3E4A45] dark:text-slate-400 font-medium select-none cursor-default"
              title="MedGraph is available during active sessions"
            >
              <MedGraphIcon size={15} className="shrink-0" />
              <span>MedGraph</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Question Card (Clean full-width) */}
      <div className="w-full bg-[#FAF9F6] dark:bg-slate-900/60 border border-[#E3E8E5] dark:border-slate-800 rounded-[24px] p-5 sm:p-7 space-y-5">
        {/* Subject Tag */}
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-[#E3F2EA] dark:bg-emerald-950/70 text-[#0B5F46] dark:text-emerald-300 text-[12px] font-semibold">
            Pathology • Gastrointestinal &amp; Hepatic
          </span>

          {/* Vignette Text in Fraunces editorial serif */}
          <p className="mt-3 font-heading font-normal text-base sm:text-[17px] leading-[1.7] text-[#1E2B27] dark:text-slate-100 select-text">
            A 40-year-old woman presents with abdominal pain and yellow discoloration of the skin for the past 4 days. She has been taking oral contraceptive pills for 4 years. Physical examination reveals hepatomegaly and shifting abdominal dullness. Hepatitis viral serologies are negative. Abdominal ultrasound demonstrates hepatic vein thrombosis, and liver biopsy shows marked centrilobular congestion with necrosis. Which of the following is the most likely diagnosis?
          </p>
        </div>

        {/* Interactive Options list */}
        <div className="space-y-2.5">
          {SAMPLE_OPTIONS.map((optText: string, idx: number) => {
            const isSelected = selectedOption === idx
            const isStruck = struckOptions.includes(idx)
            const isCorrect = idx === 0 // Option A is correct

            let buttonStyle = 'border border-[#E3E8E5] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#1E2B27] dark:text-slate-200 hover:border-[#0B7A5A]/50 shadow-[0_1px_2px_rgba(30,43,39,0.04)]'
            let badgeStyle = 'bg-[#EDF0EE] dark:bg-slate-800 text-[#1E2B27] dark:text-white'
            let statusBadge = null

            if (isAnswerSubmitted) {
              if (isCorrect) {
                buttonStyle = 'border-2 border-[#0B7A5A] bg-[#E3F2EA] dark:bg-emerald-950/60 text-[#0B5F46] dark:text-emerald-200 font-medium'
                badgeStyle = 'bg-white dark:bg-slate-900 text-[#0B5F46] dark:text-emerald-300 shadow-2xs'
                statusBadge = (
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0B5F46] dark:text-emerald-300 shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    Correct answer
                  </span>
                )
              } else if (isSelected && !isCorrect) {
                buttonStyle = 'border-2 border-[#C9573A] bg-[#FCEDE8] dark:bg-rose-950/40 text-[#8A2F16] dark:text-rose-200 font-medium'
                badgeStyle = 'bg-white dark:bg-slate-900 text-[#8A2F16] dark:text-rose-300 shadow-2xs'
                statusBadge = (
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#8A2F16] dark:text-rose-300 shrink-0">
                    <X className="w-3.5 h-3.5 stroke-[2.5]" />
                    Your answer
                  </span>
                )
              } else {
                buttonStyle = 'border border-[#E3E8E5] dark:border-slate-800 bg-white dark:bg-slate-950/40 text-slate-400 dark:text-slate-500 opacity-60'
              }
            } else if (isSelected) {
              buttonStyle = 'border-2 border-[#0B7A5A] bg-[#E3F2EA]/40 dark:bg-emerald-950/30 text-[#0B5F46] dark:text-emerald-300 font-medium'
              badgeStyle = 'bg-[#0B7A5A] text-white'
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectOption(idx)}
                onContextMenu={(e) => handleToggleStrike(e, idx)}
                className={`w-full text-left p-3 rounded-[16px] transition-all flex items-center justify-between gap-3 cursor-pointer min-h-[50px] ${buttonStyle} ${
                  isStruck && !isAnswerSubmitted ? 'line-through opacity-40 text-slate-400' : ''
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[12px] shrink-0 select-none ${badgeStyle}`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-[14px] font-medium select-text truncate">
                    {optText}
                  </span>
                </div>
                {statusBadge}
              </button>
            )
          })}
        </div>

        {/* Instant Rationale Callout after submission */}
        {isAnswerSubmitted && (
          <div className="p-4 rounded-2xl bg-[#E3F2EA] dark:bg-emerald-950/50 border border-[#0B7A5A]/30 text-xs text-[#0B5F46] dark:text-emerald-200 space-y-1.5 animate-in fade-in duration-200">
            <div className="font-semibold flex items-center gap-1.5">
              <Check className="w-4 h-4 text-[#0B7A5A]" />
              <span>Key Educational Pearl</span>
            </div>
            <p className="leading-relaxed opacity-95">
              Budd-Chiari syndrome results from thrombotic occlusion of hepatic veins, classic in hypercoagulable states (e.g. chronic oral contraceptive therapy). Biopsy demonstrates centrilobular congestion (nutmeg pattern) without viral infiltration.
            </p>
          </div>
        )}

        {/* Hint tip */}
        <div className="flex items-center justify-between text-[11px] text-[#4F5C57] dark:text-slate-400 pt-2 border-t border-[#E3E8E5] dark:border-slate-800">
          <span>Right-click to cross off</span>
          {isAnswerSubmitted && (
            <button
              type="button"
              onClick={() => {
                setSelectedOption(null)
                setIsAnswerSubmitted(false)
                setStruckOptions([])
              }}
              className="font-semibold text-[#0B7A5A] dark:text-emerald-400 hover:underline cursor-pointer bg-transparent border-0"
            >
              Reset demo
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
