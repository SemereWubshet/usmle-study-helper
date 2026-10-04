import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, Sparkles, X } from 'lucide-react'
import type { EncyclopediaEntry, MedSearchProvider } from '@/api'
import { ProviderTabs } from './medsearch/ProviderTabs'
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
    <div className="w-full h-full overflow-y-auto flex-shrink-0 bg-white dark:bg-slate-900 rounded-2xl lg:rounded-none pb-12 lg:pb-6 animate-in fade-in duration-300">
      <div className="p-4 space-y-4">
        <div>
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                    <Search className="w-5 h-5" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                      MedSearch
                    </CardTitle>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${currentConfig.badgeStyle}`}>
                      {currentConfig.icon} {currentConfig.sourceLabel}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onCloseSidebar}
                    className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title="Close MedSearch"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Provider Selection Tabs */}
              <ProviderTabs selectedProvider={provider} onSelectProvider={onProviderChange} />

              <form onSubmit={onSearchSubmit} className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder={`Search ${currentConfig.sourceLabel}...`}
                  value={searchInput}
                  onChange={(e) => onSearchInputChange(e.target.value)}
                  className="w-full pl-9 pr-20 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={onClearSearch}
                    className="absolute right-12 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <Button
                  type="submit"
                  size="sm"
                  disabled={isLoading || !searchInput.trim()}
                  className="absolute right-1.5 h-7 px-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer"
                >
                  Search
                </Button>
              </form>
            </CardHeader>

            <CardContent className="pt-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Searching {currentConfig.sourceLabel}...
                  </p>
                </div>
              ) : isFetched && entries.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No clinical articles found
                  </p>
                  <p className="text-xs text-slate-400">
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
                  <div className="inline-flex p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-1">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[240px] mx-auto">
                    Type a clinical concept, sign, drug, or syndrome above to look up instant medical references.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
