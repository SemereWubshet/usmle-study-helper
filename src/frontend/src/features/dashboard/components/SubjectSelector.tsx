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
  availableSubjects,
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">2</span>
          <label className="text-sm font-semibold text-slate-900 dark:text-slate-200">
            Select Subjects / Systems
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onSelectAll}
            className={`text-xs px-2.5 py-1 rounded-lg transition-all ${
              selectedSubjects.includes('All Subjects')
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 font-semibold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Subjects
          </button>
          <span className="text-xs text-slate-400">
            • {totalAvailableInSelection.toLocaleString()} Qs available
          </span>
        </div>
      </div>

      {/* Search Bar for Subjects if available */}
      {availableSubjects.length > 6 && (
        <input
          type="text"
          placeholder="Filter subjects (e.g. Cardiology, Pathology)..."
          value={subjectSearch}
          onChange={(e) => onSubjectSearchChange(e.target.value)}
          className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
        />
      )}

      {/* Subject Chips Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
        {isLoadingSubjects ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
          ))
        ) : filteredSubjects.length === 0 ? (
          <div className="col-span-full py-4 text-center text-xs text-slate-400">
            No subjects match your filter.
          </div>
        ) : (
          filteredSubjects.map((sub: SubjectItem) => {
            const isExplicit = selectedSubjects.includes(sub.subject)

            return (
              <button
                key={sub.subject}
                type="button"
                onClick={() => onToggleSubject(sub.subject)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs transition-all cursor-pointer text-left select-none ${
                  isExplicit
                    ? 'border-emerald-500 bg-emerald-500 text-white font-medium shadow-xs'
                    : selectedSubjects.includes('All Subjects')
                    ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 hover:border-emerald-400'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <span className="truncate pr-2">{sub.subject}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                  isExplicit
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {sub.count}
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

