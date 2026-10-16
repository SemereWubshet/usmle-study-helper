import { Search, Sparkles, X } from 'lucide-react'
import type { EncyclopediaEntry, MedSearchProvider } from '@/api'
import { EncyclopediaCard } from './medsearch/EncyclopediaCard'
import { getProviderConfig } from './medsearch/types'

interface EncyclopediaSidebarProps {
  searchInput: string;
  onSearchInputChange: (val: string) => void;
  submittedQuery?: string;
  onSearchSubmit: (e: React.FormEvent) => void;
  onClearSearch: () => void;
  onCloseSidebar: () => void;
  isLoading: boolean;
  isFetched: boolean;
  entries: EncyclopediaEntry[];
  provider: MedSearchProvider;
  onProviderChange: (provider: MedSearchProvider) => void;
}

export function EncyclopediaSidebar({
  searchInput,
  onSearchInputChange,
  onSearchSubmit,
  onClearSearch,
  onCloseSidebar,
  isLoading,
  isFetched,
  entries,
  provider,
  onProviderChange,
}: EncyclopediaSidebarProps) {
  const currentConfig = getProviderConfig(provider)

  return (
    <aside className="w-full h-full overflow-y-auto flex-shrink-0 bg-[#EFF4F0] dark:bg-slate-900 rounded-[28px] p-5 sm:p-6 pb-12 lg:pb-6 animate-in fade-in duration-300 border border-[#E3E8E5]/70 dark:border-slate-800 shadow-[0_4px_20px_rgba(30,43,39,0.04)]">
      <div className="space-y-4">
        {/* Top Header: Fraunces Title, Badge, and Close Button */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="w-10 h-10 rounded-full bg-[#E3F2EA] dark:bg-emerald-950/70 text-[#0B7A5A] dark:text-emerald-300 inline-flex items-center justify-center">
              <Search className="w-5 h-5" />
            </span>
            <span className="font-heading font-medium text-2xl text-[#1E2B27] dark:text-white">
              MedSearch
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 text-[11px] font-semibold tracking-wider text-[#0B5F46] dark:text-emerald-300 border border-[#E3E8E5] dark:border-slate-700 uppercase">
              {currentConfig.sourceLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={onCloseSidebar}
            aria-label="Close panel"
            className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 border border-[#E3E8E5] dark:border-slate-700 text-[#3E4A45] dark:text-slate-300 hover:text-[#1E2B27] hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Provider Selection Tabs */}
        <div className="p-1 bg-[#E3EAE5] dark:bg-slate-800 rounded-full flex gap-1">
          {['openfda', 'statpearls', 'medlineplus', 'rxnorm'].map((pId) => {
            const isSelected = provider === pId
            const labelMap: Record<string, string> = {
              openfda: 'openFDA',
              statpearls: 'StatPearls',
              medlineplus: 'MedlinePlus',
              rxnorm: 'RxNorm'
            }
            return (
              <button
                key={pId}
                type="button"
                onClick={() => onProviderChange(pId as any)}
                className={`flex-1 text-center py-2 px-2 rounded-full text-[13px] font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 text-[#0B7A5A] dark:text-emerald-400 shadow-[0_1px_4px_rgba(30,43,39,0.12)]'
                    : 'bg-transparent text-[#3E4A45] dark:text-slate-400 hover:text-[#1E2B27]'
                }`}
              >
                {labelMap[pId] || pId}
              </button>
            )
          })}
        </div>

        {/* Search input bar */}
        <form onSubmit={onSearchSubmit} className="flex items-center gap-2 p-1 pl-4 bg-white dark:bg-slate-900 rounded-full border border-[#E3E8E5] dark:border-slate-800 shadow-[0_1px_3px_rgba(30,43,39,0.04)]">
          <Search className="w-4 h-4 text-[#3E4A45] shrink-0" />
          <input
            type="text"
            placeholder={`Search ${currentConfig.sourceLabel}...`}
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
            className="flex-1 min-w-0 h-10 border-0 bg-transparent text-[15px] text-[#1E2B27] dark:text-white outline-none"
          />
          {searchInput && (
            <button
              type="button"
              onClick={onClearSearch}
              className="text-[#4F5C57] hover:text-[#1E2B27] p-1.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || !searchInput.trim()}
            className="min-h-[40px] px-5 rounded-full bg-[#0B7A5A] hover:bg-[#0B7A5A]/90 text-white font-semibold text-[14px] transition-all cursor-pointer disabled:opacity-40"
          >
            Search
          </button>
        </form>

        {/* Content stream */}
        <div className="pt-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="w-8 h-8 border-2 border-[#0B7A5A] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-[#4F5C57] dark:text-slate-400 font-medium">
                Searching {currentConfig.sourceLabel}...
              </p>
            </div>
          ) : isFetched && entries.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <p className="text-sm font-semibold text-[#1E2B27] dark:text-slate-300">
                No clinical articles found
              </p>
              <p className="text-xs text-[#4F5C57]">
                Try searching a general medical condition or drug generic name.
              </p>
            </div>
          ) : entries.length > 0 ? (
            <div className="space-y-3">
              {entries.map((entry, index) => (
                <EncyclopediaCard key={`${entry.source}-${index}`} entry={entry} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 space-y-2">
              <div className="inline-flex p-2.5 rounded-full bg-white dark:bg-slate-800 text-[#4F5C57] mb-1">
                <Sparkles className="w-5 h-5 text-[#0B7A5A]" />
              </div>
              <p className="text-xs text-[#4F5C57] dark:text-slate-400 max-w-[240px] mx-auto">
                Type a clinical concept, sign, drug, or syndrome above to look up instant medical references.
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
