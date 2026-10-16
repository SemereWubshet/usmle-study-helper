import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getStoredGoals, saveStoredGoals, type UserGoals } from '@/utils/goalsStorage';

interface GoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoalsUpdated?: (goals: UserGoals) => void;
}

export function GoalsModal({ isOpen, onClose, onGoalsUpdated }: GoalsModalProps) {
  const [goals, setGoals] = useState<UserGoals>(getStoredGoals);

  useEffect(() => {
    if (isOpen) {
      setGoals(getStoredGoals());
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
    saveStoredGoals(goals);
    if (onGoalsUpdated) {
      onGoalsUpdated(goals);
    }
    onClose();
  };

  const formatPaceDesc = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs} seconds each`;
    if (secs === 0) return `${mins} minute${mins > 1 ? 's' : ''} each`;
    return `${mins} minute${mins > 1 ? 's' : ''} ${secs} seconds each`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#1E2B27]/40 dark:bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-[580px] bg-white dark:bg-slate-900 rounded-[28px] p-6 sm:p-9 shadow-[0_24px_64px_rgba(30,43,39,0.28)] border border-[#E3E8E5] dark:border-slate-800 flex flex-col gap-7 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-label="Your goals"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-heading font-medium text-3xl sm:text-[32px] text-[#1E2B27] dark:text-white leading-tight">
              Your goals
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[#3E4A45] dark:text-slate-400">
              These apply across the whole app and are saved to your account.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 rounded-full border-0 bg-transparent text-[#3E4A45] hover:text-[#1E2B27] hover:bg-[#EDF3EF] dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sliders */}
        <div className="flex flex-col gap-6">
          {/* Passing Score */}
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="goal-passing" className="text-[16px] font-semibold text-[#1E2B27] dark:text-white">
                Passing score
              </label>
              <span className="font-heading font-medium text-[26px] text-[#0B7A5A] dark:text-emerald-400">
                {goals.passingThreshold}%
              </span>
            </div>
            <input
              id="goal-passing"
              type="range"
              min={30}
              max={90}
              step={5}
              value={goals.passingThreshold}
              onChange={(e) => setGoals({ ...goals, passingThreshold: Number(e.target.value) })}
              className="w-full h-2 rounded-lg accent-[#0B7A5A] cursor-pointer bg-[#E3E8E5] dark:bg-slate-700"
            />
            <div className="text-[14px] text-[#3E4A45] dark:text-slate-400 leading-normal">
              Results below this show in amber.
            </div>
          </div>

          {/* Mastery Goal */}
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="goal-mastery" className="text-[16px] font-semibold text-[#1E2B27] dark:text-white">
                Mastery goal
              </label>
              <span className="font-heading font-medium text-[26px] text-[#0A5A43] dark:text-emerald-300">
                {goals.excellenceThreshold}%
              </span>
            </div>
            <input
              id="goal-mastery"
              type="range"
              min={50}
              max={95}
              step={5}
              value={goals.excellenceThreshold}
              onChange={(e) => setGoals({ ...goals, excellenceThreshold: Number(e.target.value) })}
              className="w-full h-2 rounded-lg accent-[#0A5A43] cursor-pointer bg-[#E3E8E5] dark:bg-slate-700"
            />
            <div className="text-[14px] text-[#3E4A45] dark:text-slate-400 leading-normal">
              Results at or above this show in deep green.
            </div>
          </div>

          {/* Pace per question */}
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="goal-pace" className="text-[16px] font-semibold text-[#1E2B27] dark:text-white">
                Pace per question
              </label>
              <span className="font-heading font-medium text-[26px] text-[#2F6FEB] dark:text-blue-400">
                {goals.targetSeconds}s
              </span>
            </div>
            <input
              id="goal-pace"
              type="range"
              min={30}
              max={180}
              step={5}
              value={goals.targetSeconds}
              onChange={(e) => setGoals({ ...goals, targetSeconds: Number(e.target.value) })}
              className="w-full h-2 rounded-lg accent-[#2F6FEB] cursor-pointer bg-[#E3E8E5] dark:bg-slate-700"
            />
            <div className="text-[14px] text-[#3E4A45] dark:text-slate-400 leading-normal">
              Used to judge how fast you answer. {formatPaceDesc(goals.targetSeconds)}.
            </div>
          </div>
        </div>

        {/* Visual Preview */}
        <div className="pt-2">
          <div className="text-[13px] tracking-[0.08em] uppercase text-[#4F5C57] dark:text-slate-400 font-semibold">
            How your results will look
          </div>

          <div className="mt-3.5 space-y-2">
            {/* Rounded color bar */}
            <div className="flex gap-1 h-2.5 rounded-full overflow-hidden w-full">
              <div style={{ flex: `${goals.passingThreshold} 1 0%` }} className="h-full bg-[#B4530A]" />
              <div style={{ flex: `${Math.max(10, goals.excellenceThreshold - goals.passingThreshold)} 1 0%` }} className="h-full bg-[#0B7A5A]" />
              <div style={{ flex: `${Math.max(10, 100 - goals.excellenceThreshold)} 1 0%` }} className="h-full bg-[#0A5A43]" />
            </div>

            {/* Labels below the bar (unclipped) */}
            <div className="flex gap-1 w-full pt-1">
              <div style={{ flex: `${goals.passingThreshold} 1 0%` }} className="min-w-0 pr-1">
                <div className="text-[13px] font-semibold text-[#1E2B27] dark:text-white truncate">Below passing</div>
                <div className="text-[12px] text-[#4F5C57] dark:text-slate-400">0 to {goals.passingThreshold - 1}%</div>
              </div>
              <div style={{ flex: `${Math.max(10, goals.excellenceThreshold - goals.passingThreshold)} 1 0%` }} className="min-w-0 px-1">
                <div className="text-[13px] font-semibold text-[#1E2B27] dark:text-white truncate">Passing</div>
                <div className="text-[12px] text-[#4F5C57] dark:text-slate-400">{goals.passingThreshold} to {goals.excellenceThreshold - 1}%</div>
              </div>
              <div style={{ flex: `${Math.max(10, 100 - goals.excellenceThreshold)} 1 0%` }} className="min-w-0 pl-1">
                <div className="text-[13px] font-semibold text-[#1E2B27] dark:text-white truncate">Mastery</div>
                <div className="text-[12px] text-[#4F5C57] dark:text-slate-400">{goals.excellenceThreshold} to 100%</div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FDF1E4] dark:bg-amber-950/40 text-[#8A4A08] dark:text-amber-300 text-[14px] font-semibold">
              {Math.max(20, goals.passingThreshold - 15)}%
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#E3F2EA] dark:bg-emerald-950/40 text-[#0B5F46] dark:text-emerald-300 text-[14px] font-semibold">
              {Math.min(99, goals.passingThreshold + 5)}%
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#0A5A43] text-white text-[14px] font-semibold">
              ★ {Math.min(100, goals.excellenceThreshold + 5)}%
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 flex-wrap pt-5 border-t border-[#E8ECE9] dark:border-slate-800">
          <span className="text-[13px] text-[#3E4A45] dark:text-slate-400 flex-1 min-w-[200px]">
            Changing goals recolors your past results too.
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-5 rounded-full bg-transparent text-[#3E4A45] dark:text-slate-400 hover:text-[#1E2B27] dark:hover:text-white text-[15px] font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="min-h-[46px] px-7 rounded-full bg-[#0B7A5A] hover:bg-[#0B7A5A]/90 text-white font-semibold text-[15px] shadow-[0_10px_24px_rgba(11,122,90,0.22)] transition-all cursor-pointer"
            >
              Save goals
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
