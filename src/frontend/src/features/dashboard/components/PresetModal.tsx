import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getStoredPreset, saveStoredPreset, type SessionPreset } from '@/utils/presetStorage';

interface PresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPresetSaved?: (preset: SessionPreset) => void;
}

export function PresetModal({
  isOpen,
  onClose,
  onPresetSaved,
}: PresetModalProps) {
  const [preset, setPreset] = useState<SessionPreset>(getStoredPreset);

  useEffect(() => {
    if (isOpen) {
      setPreset(getStoredPreset());
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveStoredPreset(preset);
    if (onPresetSaved) {
      onPresetSaved(preset);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#1E2B27]/40 dark:bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-[560px] bg-white dark:bg-slate-900 rounded-[28px] p-6 sm:p-8 shadow-[0_24px_64px_rgba(30,43,39,0.28)] border border-[#E3E8E5] dark:border-slate-800 flex flex-col gap-6 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-label="Default session preset"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-heading font-medium text-2xl sm:text-[28px] text-[#1E2B27] dark:text-white leading-tight">
              Default preset
            </h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[#3E4A45] dark:text-slate-400">
              Set the defaults that your dashboard loads automatically every time.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full border-0 bg-transparent text-[#3E4A45] hover:text-[#1E2B27] hover:bg-[#EDF3EF] dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-4">
          {/* Question Bank */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[14px] font-semibold text-[#1E2B27] dark:text-white">
              Default Question Bank
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPreset({ ...preset, selectedQbank: 'medqa_usmle', examTarget: 'USMLE Step 1' })}
                className={`p-3 rounded-2xl text-left border text-[13px] font-medium transition-all cursor-pointer ${
                  preset.selectedQbank === 'medqa_usmle' && preset.examTarget === 'USMLE Step 1'
                    ? 'border-[#0B7A5A] bg-[#E3F2EA] text-[#0B5F46] font-semibold dark:bg-emerald-950/70 dark:text-emerald-300'
                    : 'border-[#E3E8E5] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#1E2B27] dark:text-slate-300 hover:border-[#0B7A5A]/50'
                }`}
              >
                USMLE Step 1
              </button>

              <button
                type="button"
                onClick={() => setPreset({ ...preset, selectedQbank: 'medqa_usmle', examTarget: 'USMLE Step 2 and Step 3' })}
                className={`p-3 rounded-2xl text-left border text-[13px] font-medium transition-all cursor-pointer ${
                  preset.selectedQbank === 'medqa_usmle' && preset.examTarget === 'USMLE Step 2 and Step 3'
                    ? 'border-[#0B7A5A] bg-[#E3F2EA] text-[#0B5F46] font-semibold dark:bg-emerald-950/70 dark:text-emerald-300'
                    : 'border-[#E3E8E5] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#1E2B27] dark:text-slate-300 hover:border-[#0B7A5A]/50'
                }`}
              >
                USMLE Step 2 & 3
              </button>

              <button
                type="button"
                onClick={() => setPreset({ ...preset, selectedQbank: 'medmcqa' })}
                className={`p-3 rounded-2xl text-left border text-[13px] font-medium transition-all cursor-pointer ${
                  preset.selectedQbank === 'medmcqa'
                    ? 'border-[#0B7A5A] bg-[#E3F2EA] text-[#0B5F46] font-semibold dark:bg-emerald-950/70 dark:text-emerald-300'
                    : 'border-[#E3E8E5] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#1E2B27] dark:text-slate-300 hover:border-[#0B7A5A]/50'
                }`}
              >
                MedMCQA
              </button>
            </div>
          </div>

          {/* Row 1: Block Size & Exam Time in comfortable 2-column grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {/* Block Size */}
            <div className="flex flex-col gap-2.5 p-4 rounded-2xl bg-[#FAF9F6] dark:bg-slate-950/60 border border-[#E3E8E5] dark:border-slate-800">
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-[13px] font-semibold text-[#1E2B27] dark:text-white">
                  Block Size
                </span>
                <span className="font-heading font-medium text-[20px] text-[#0B7A5A] dark:text-emerald-400">
                  {preset.blockCount} Questions
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {[10, 20, 40].map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setPreset({ ...preset, blockCount: sz })}
                    className={`flex-1 min-h-[36px] rounded-full text-[13px] font-medium transition-all cursor-pointer ${
                      preset.blockCount === sz
                        ? 'bg-[#E3F2EA] text-[#0B5F46] font-semibold dark:bg-emerald-950/70 dark:text-emerald-300 border border-[#0B7A5A]'
                        : 'bg-white dark:bg-slate-800 text-[#3E4A45] dark:text-slate-300 border border-[#E3E8E5] dark:border-slate-700 hover:border-[#0B7A5A]/40'
                    }`}
                  >
                    {sz}Q
                  </button>
                ))}
              </div>
            </div>

            {/* Exam Time */}
            <div className="flex flex-col gap-2.5 p-4 rounded-2xl bg-[#FAF9F6] dark:bg-slate-950/60 border border-[#E3E8E5] dark:border-slate-800">
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-[13px] font-semibold text-[#1E2B27] dark:text-white">
                  Exam Duration
                </span>
                <span className="font-heading font-medium text-[20px] text-[#434575] dark:text-indigo-400">
                  {preset.examDurationMinutes} Minutes
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {[15, 30, 60].map((tm) => (
                  <button
                    key={tm}
                    type="button"
                    onClick={() => setPreset({ ...preset, examDurationMinutes: tm })}
                    className={`flex-1 min-h-[36px] rounded-full text-[13px] font-medium transition-all cursor-pointer ${
                      preset.examDurationMinutes === tm
                        ? 'bg-indigo-50 text-[#434575] font-semibold dark:bg-indigo-950/70 dark:text-indigo-300 border border-[#434575]'
                        : 'bg-white dark:bg-slate-800 text-[#3E4A45] dark:text-slate-300 border border-[#E3E8E5] dark:border-slate-700 hover:border-[#434575]/40'
                    }`}
                  >
                    {tm}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Target Pace (Dedicated spacious row with presets & stepper) */}
          <div className="p-4 rounded-2xl bg-[#FAF9F6] dark:bg-slate-950/60 border border-[#E3E8E5] dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[13px] font-semibold text-[#1E2B27] dark:text-white block">
                  Target Pace
                </span>
                <span className="text-[12px] text-[#4F5C57] dark:text-slate-400">
                  Target speed per question for mock exam benchmarks
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreset({ ...preset, paceTargetSeconds: Math.max(30, preset.paceTargetSeconds - 5) })}
                  aria-label="Decrease target pace"
                  className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-[#E3E8E5] dark:border-slate-700 text-[#3E4A45] dark:text-slate-300 hover:text-[#1E2B27] dark:hover:text-white flex items-center justify-center font-bold text-sm cursor-pointer shadow-2xs"
                >
                  −
                </button>
                <span className="font-heading font-medium text-[22px] text-[#2F6FEB] dark:text-blue-400 min-w-[56px] text-center">
                  {preset.paceTargetSeconds}s
                </span>
                <button
                  type="button"
                  onClick={() => setPreset({ ...preset, paceTargetSeconds: Math.min(180, preset.paceTargetSeconds + 5) })}
                  aria-label="Increase target pace"
                  className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-[#E3E8E5] dark:border-slate-700 text-[#3E4A45] dark:text-slate-300 hover:text-[#1E2B27] dark:hover:text-white flex items-center justify-center font-bold text-sm cursor-pointer shadow-2xs"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              {[60, 75, 90, 120].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setPreset({ ...preset, paceTargetSeconds: sec })}
                  className={`flex-1 min-h-[34px] rounded-full text-[12px] font-medium transition-all cursor-pointer ${
                    preset.paceTargetSeconds === sec
                      ? 'bg-blue-50 text-[#2F6FEB] font-semibold dark:bg-blue-950/70 dark:text-blue-300 border border-[#2F6FEB]'
                      : 'bg-white dark:bg-slate-800 text-[#3E4A45] dark:text-slate-300 border border-[#E3E8E5] dark:border-slate-700 hover:border-[#2F6FEB]/40'
                  }`}
                >
                  {sec}s {sec === 90 ? '(Standard)' : ''}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 pt-4 border-t border-[#E8ECE9] dark:border-slate-800">
          <span className="text-[13px] text-[#4F5C57] dark:text-slate-400">
            Saved in your browser for quick start.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] px-4 rounded-full bg-transparent text-[#3E4A45] dark:text-slate-400 hover:text-[#1E2B27] text-[14px] font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="min-h-[44px] px-6 rounded-full bg-[#0B7A5A] hover:bg-[#0B7A5A]/90 text-white font-semibold text-[14px] shadow-[0_8px_20px_rgba(11,122,90,0.22)] transition-all cursor-pointer"
            >
              Save preset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

