import type { SubjectItem } from '@/api'

interface SubjectSelectorProps {
  availableSubjects: SubjectItem[];
  isLoadingSubjects: boolean;
  selectedSubjects: string[];
  subjectSearch: string;
  onSubjectSearchChange: (val: string) => void;
  onToggleSubject: (subject: string) => void;
  onSelectAll: () => void;
  filteredSubjects: SubjectItem[];
  totalAvailableInSelection: number;
}

export function SubjectSelector({
  availableSubjects: _availableSubjects,
  isLoadingSubjects,
  selectedSubjects,
  subjectSearch,
  onSubjectSearchChange,
  onToggleSubject,
  onSelectAll,
  filteredSubjects,
  totalAvailableInSelection,
}: SubjectSelectorProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <div>
          <div className="text-[12px] tracking-[0.08em] uppercase text-[#4F5C57] dark:text-slate-400 font-semibold">
            Step 2
          </div>
          <h2 className="text-xl font-semibold text-[#1E2B27] dark:text-white mt-1">
            What do you want to cover?
          </h2>
        </div>

        <div className="text-[13px] text-[#4F5C57] dark:text-slate-400">
          <span className="font-semibold text-[#0B7A5A] dark:text-emerald-400">{totalAvailableInSelection.toLocaleString()}</span> questions available
        </div>
      </div>

      {/* Rounded Pill Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search subjects..."
          value={subjectSearch}
          onChange={(e) => onSubjectSearchChange(e.target.value)}
          className="w-full h-12 pl-5 pr-11 text-sm rounded-full bg-white dark:bg-slate-900 border border-[#E3E8E5] dark:border-slate-800 text-[#1E2B27] dark:text-white placeholder:text-[#4F5C57]/60 focus:outline-none focus:border-[#0B7A5A] focus:ring-1 focus:ring-[#0B7A5A] transition-all shadow-[0_1px_3px_rgba(30,43,39,0.04)]"
        />
        {subjectSearch && (
          <button
            type="button"
            onClick={() => onSubjectSearchChange('')}
            aria-label="Clear search"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#EDF0EE] dark:bg-slate-800 text-[#4F5C57] dark:text-slate-400 hover:text-[#1E2B27] dark:hover:text-white flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
          >
            ×
          </button>
        )}
      </div>

      {/* Subject Pills Grid / Flow */}
      <div className="flex flex-wrap gap-2.5 min-h-[140px] max-h-64 overflow-y-auto pr-1 py-1 content-start">
        {/* All Subjects Pill Button */}
        <button
          type="button"
          onClick={onSelectAll}
          className={`min-h-[42px] px-5 rounded-full text-[14px] font-medium transition-all cursor-pointer select-none flex items-center ${
            selectedSubjects.includes('All Subjects')
              ? 'border border-[#0B7A5A] bg-[#E3F2EA] text-[#0B5F46] font-semibold dark:bg-emerald-950/70 dark:text-emerald-300'
              : 'border border-[#E3E8E5] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#1E2B27] dark:text-slate-200 hover:border-[#0B7A5A]/50 shadow-[0_1px_2px_rgba(30,43,39,0.04)]'
          }`}
        >
          All subjects
        </button>

        {isLoadingSubjects ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 w-28 rounded-full bg-slate-200/60 dark:bg-slate-800/50 animate-pulse" />
          ))
        ) : filteredSubjects.length === 0 ? (
          <div className="w-full py-8 text-center text-sm text-[#4F5C57] dark:text-slate-400">
            No subjects matching &ldquo;{subjectSearch}&rdquo; found.
          </div>
        ) : (
          filteredSubjects.map((sub: SubjectItem) => {
            const isSelected = selectedSubjects.includes(sub.subject)

            return (
              <button
                key={sub.subject}
                type="button"
                onClick={() => onToggleSubject(sub.subject)}
                className={`min-h-[42px] px-4.5 rounded-full text-[14px] transition-all cursor-pointer select-none flex items-center gap-2 ${
                  isSelected
                    ? 'border border-[#0B7A5A] bg-[#E3F2EA] text-[#0B5F46] font-semibold dark:bg-emerald-950/70 dark:text-emerald-300'
                    : 'border border-[#E3E8E5] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#1E2B27] dark:text-slate-200 hover:border-[#0B7A5A]/50 shadow-[0_1px_2px_rgba(30,43,39,0.04)]'
                }`}
              >
                <span>{sub.subject}</span>
                <span className="text-[12px] text-[#4F5C57] dark:text-slate-400 font-normal">
                  {sub.count}
                </span>
              </button>
            )
          })
        )}
      </div>
    </section>
  )
}

