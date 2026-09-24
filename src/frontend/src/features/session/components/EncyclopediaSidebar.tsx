import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, Sparkles, PanelRightClose, X } from 'lucide-react'
import type { EncyclopediaEntry, MedSearchProvider } from '@/api'
import { ProviderTabs } from './medsearch/ProviderTabs'
import { EncyclopediaCard } from './medsearch/EncyclopediaCard'
import { getProviderConfig } from './medsearch/types'

interface EncyclopediaSidebarProps {
  searchInput: string;
  onSearchInputChange: (val: string) => void;
  submittedQuery: string;
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
  submittedQuery,
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
    <div className="w-full lg:w-[35%] xl:w-[32%] border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 lg:h-full lg:overflow-y-auto flex-shrink-0 bg-white dark:bg-slate-900 rounded-2xl lg:rounded-none pb-10 lg:pb-0 animate-in fade-in duration-300">
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
                    title="Collapse sidebar"
                  >
                    <PanelRightClose className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Modular Provider Selector */}
              <ProviderTabs
                selectedProvider={provider}
                onSelectProvider={onProviderChange}
                disabled={isLoading}
              />

              {/* Interactive Search Bar */}
              <form onSubmit={onSearchSubmit} className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => onSearchInputChange(e.target.value)}
                    placeholder={currentConfig.placeholder}
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={onClearSearch}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!searchInput.trim() || isLoading}
                  className="text-xs h-8 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer"
                >
                  Search
                </Button>
              </form>
            </CardHeader>

            <CardContent className="p-4 space-y-3.5 max-h-[calc(100vh-250px)] overflow-y-auto">
              {isLoading && (
                <div className="p-6 text-xs text-slate-500 flex flex-col items-center justify-center gap-2 text-center">
                  <Sparkles className="w-5 h-5 animate-spin text-indigo-500" />
                  <span>Consulting {currentConfig.sourceLabel}...</span>
                </div>
              )}

              {!isLoading && entries.length > 0 && (
                <div className="space-y-3">
                  {entries.map((entry, idx) => (
                    <EncyclopediaCard key={idx} entry={entry} />
                  ))}
                </div>
              )}

              {!isLoading && isFetched && submittedQuery && entries.length === 0 && (
                <div className="py-12 text-center space-y-2">
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    No results found for &quot;{submittedQuery}&quot; in {currentConfig.name}.
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Try switching provider or searching for a different clinical term or drug name.
                  </p>
                </div>
              )}

              {!submittedQuery && !isLoading && (
                <div className="py-14 text-center space-y-2 px-4">
                  <div className="w-10 h-10 mx-auto rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <span className="text-lg">{currentConfig.icon}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {currentConfig.name} Search
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                    {currentConfig.emptyHint}
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
export { EncyclopediaCard }
