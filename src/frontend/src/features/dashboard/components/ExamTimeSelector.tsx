import React from 'react';

interface ExamTimeSelectorProps {
  durationMinutes: number;
  setDurationMinutes: (val: number) => void;
}

export function ExamTimeSelector({
  durationMinutes,
  setDurationMinutes,
}: ExamTimeSelectorProps) {
  const handleStep = (delta: number) => {
    const next = Math.max(10, Math.min(240, durationMinutes + delta));
    setDurationMinutes(next);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setDurationMinutes(5);
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      setDurationMinutes(Math.max(5, Math.min(360, num)));
    }
  };

  const handleBlur = () => {
    const clamped = Math.max(10, Math.min(240, durationMinutes));
    setDurationMinutes(clamped);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const clamped = Math.max(10, Math.min(240, durationMinutes));
      setDurationMinutes(clamped);
      e.currentTarget.blur();
    }
  };

  return (
    <div className="space-y-4 pt-6 border-t border-[#E8ECE9] dark:border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <span className="text-[17px] font-semibold text-[#1E2B27] dark:text-white">
            Exam time
          </span>
          <span className="text-[13px] text-[#4F5C57] dark:text-slate-400">
            minutes
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Stepper Controls */}
          <button
            type="button"
            onClick={() => handleStep(-5)}
            disabled={durationMinutes <= 10}
            aria-label="Fewer minutes"
            className="w-10 h-10 rounded-full border-0 bg-transparent text-[22px] font-medium text-[#3E4A45] hover:text-[#1E2B27] hover:bg-[#E3F2EA]/60 dark:text-slate-300 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer"
          >
            −
          </button>

          <label htmlFor="exam-time-input" className="sr-only">Exam duration in minutes</label>
          <input
            id="exam-time-input"
            type="text"
            inputMode="numeric"
            value={durationMinutes}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-16 h-11 text-center border-0 border-b-2 border-[#0B7A5A] bg-transparent font-heading font-medium text-[26px] text-[#1E2B27] dark:text-white p-0 focus:outline-none"
          />

          <button
            type="button"
            onClick={() => handleStep(5)}
            disabled={durationMinutes >= 240}
            aria-label="More minutes"
            className="w-10 h-10 rounded-full border-0 bg-transparent text-[22px] font-medium text-[#3E4A45] hover:text-[#1E2B27] hover:bg-[#E3F2EA]/60 dark:text-slate-300 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer"
          >
            +
          </button>

          {/* Vertical Divider */}
          <span className="w-px h-6 bg-[#E3E8E5] dark:bg-slate-700 mx-1 sm:mx-2" />

          {/* Quick Presets */}
          <div className="flex items-center gap-1">
            {[15, 30, 60].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setDurationMinutes(preset)}
                className={`min-w-[40px] h-9 px-2.5 rounded-full text-[14px] font-medium transition-all cursor-pointer ${
                  durationMinutes === preset
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
  );
}

