import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Clock, 
  Copy, 
  Search, 
  PanelRightClose, 
  PanelRightOpen, 
  X
} from 'lucide-react'

interface PreviewSessionProps {
  isSidebarOpen?: boolean
  onToggleSidebar?: () => void
}

export function PreviewSession({ 
  isSidebarOpen: controlledSidebarOpen, 
  onToggleSidebar: controlledToggleSidebar 
}: PreviewSessionProps) {
  const [internalSidebarOpen, setInternalSidebarOpen] = useState(false)
  const isSidebarOpen = controlledSidebarOpen !== undefined ? controlledSidebarOpen : internalSidebarOpen
  const toggleSidebar = controlledToggleSidebar || (() => setInternalSidebarOpen(prev => !prev))
  const [sidebarSearchInput, setSidebarSearchInput] = useState('')

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Question Stage Column */}
      <div className={`space-y-4 flex-1 transition-all duration-300 min-w-0`}>
        {/* Active Session Header matching SessionHeader.tsx */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Question 14 of 40
            </span>
            <div className="flex items-center space-x-2">
              {/* Exact Timer Badge from SessionHeader.tsx */}
              <div className="flex items-center space-x-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-lg shadow-2xs">
                <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>45s</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">

            {/* MedSearch Toggle Button matching SessionHeader.tsx */}
            <Button
              size="sm"
              variant={isSidebarOpen ? "secondary" : "outline"}
              onClick={toggleSidebar}
              className="h-7 px-2 text-xs font-medium rounded-lg gap-1 cursor-pointer border-slate-200 dark:border-slate-800"
            >
              {isSidebarOpen ? (
                <PanelRightClose className="w-3 h-3 text-slate-500" />
              ) : (
                <PanelRightOpen className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              )}
              <span>{isSidebarOpen ? "Hide Search" : "MedSearch"}</span>
            </Button>
          </div>
        </div>

        {/* Question Vignette */}
        <div className="space-y-1.5">
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[11px]">
            Pathology
          </Badge>
          <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 select-text">
            A 40-year-old woman presents with abdominal pain and yellow discoloration of the skin for the past 4 days. She says that her symptoms onset gradually and progressively worsened. Past medical history is unremarkable. She has been taking oral contraceptive pills for 4 years. Her vitals include: pulse 102/min, respiratory rate 15/min, temperature 37.5°C (99.5°F), and blood pressure 116/76 mm Hg. Physical examination reveals abdominal pain on palpation, hepatomegaly 4 cm below the right costal margin, and shifting abdominal dullness with a positive fluid wave. Hepatitis viral panel is ordered which shows: Anti-HAV IgM Negative HBsAg Negative Anti-HBs Negative IgM anti-HBc Negative Anti-HCV Negative Anti-HDV Negative Anti-HEV Negative An abdominal ultrasound reveals evidence of hepatic vein thrombosis. A liver biopsy is performed which shows congestion and necrosis in the central zones. Which of the following is the most likely diagnosis in this patient?
          </p>
        </div>

        {/* Options */}
        <div className="space-y-2 pt-1 select-text">
          <div className="p-2.5 rounded-xl border border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 flex items-start space-x-2.5 text-xs ring-1 ring-emerald-500">
            <span className="font-bold">A.</span>
            <span className="flex-1 font-medium">Budd-Chiari syndrome</span>
            <Badge className="bg-emerald-600 text-white text-[9px] py-0 px-1.5 h-4">Correct</Badge>
          </div>

          <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 flex items-start space-x-2.5 text-xs">
            <span className="font-bold">B.</span>
            <span className="flex-1">Viral hepatitis</span>
          </div>

          <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 flex items-start space-x-2.5 text-xs">
            <span className="font-bold">C.</span>
            <span className="flex-1">Nonalcoholic fatty liver disease</span>
          </div>

          <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 flex items-start space-x-2.5 text-xs">
            <span className="font-bold">D.</span>
            <span className="flex-1">Drug-induced hepatitis</span>
          </div>
        </div>
      </div>

      {/* MedSearch Sidebar Simulation matching EncyclopediaSidebar.tsx */}
      {isSidebarOpen && (
        <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 pt-3 lg:pt-0 lg:pl-3 animate-in fade-in duration-200">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-3 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                      MedSearch
                    </CardTitle>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                      🏛️ MedlinePlus • NIH
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleSidebar}
                  className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title="Collapse sidebar"
                >
                  <PanelRightClose className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Interactive Search Bar (Visual Only) */}
              <form onSubmit={(e) => e.preventDefault()} className="relative mt-2.5 flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={sidebarSearchInput}
                    onChange={(e) => setSidebarSearchInput(e.target.value)}
                    placeholder="Search conditions, diseases, symptoms..."
                    className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  {sidebarSearchInput && (
                    <button
                      type="button"
                      onClick={() => setSidebarSearchInput('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!sidebarSearchInput.trim()}
                  className="text-[11px] h-7 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer"
                >
                  Search
                </Button>
              </form>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {/* Default Empty State exactly from EncyclopediaSidebar.tsx */}
              <div className="py-8 text-center space-y-2 px-2 select-text">
                <div className="w-10 h-10 mx-auto rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <Search className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Quick Medical Topic Search
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                  Type any disease, condition, or clinical term and press <strong>Enter</strong> to fetch official NIH topic overviews, symptoms, causes, and treatments.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

