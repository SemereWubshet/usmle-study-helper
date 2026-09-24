import { type MedSearchProvider } from '@/api'
import { PROVIDERS } from './types'

interface ProviderTabsProps {
  selectedProvider: MedSearchProvider;
  onSelectProvider: (provider: MedSearchProvider) => void;
  disabled?: boolean;
}

export function ProviderTabs({
  selectedProvider,
  onSelectProvider,
  disabled = false,
}: ProviderTabsProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-xl overflow-x-auto scrollbar-none">
      {PROVIDERS.map((p) => {
        const isSelected = p.id === selectedProvider
        return (
          <button
            key={p.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelectProvider(p.id)}
            className={`flex-1 min-w-[70px] flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer select-none ${
              isSelected
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-700/40'
            }`}
          >
            <span className="text-xs">{p.icon}</span>
            <span className="truncate">{p.shortLabel}</span>
          </button>
        )
      })}
    </div>
  )
}

