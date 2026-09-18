import { useState, useRef, useEffect } from 'react'
import { Copy, Check, ChevronDown, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PROMPT_TEMPLATES, type QuestionExportData } from '@/utils/promptTemplates'

interface ExportPromptButtonProps {
  questionData: QuestionExportData
  className?: string
}

export function ExportPromptButton({ questionData, className = '' }: ExportPromptButtonProps) {
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Auto-dismiss the "Copied!" feedback after 2.5s
  useEffect(() => {
    if (!copiedTemplateId) return
    const timer = setTimeout(() => setCopiedTemplateId(null), 2500)
    return () => clearTimeout(timer)
  }, [copiedTemplateId])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const copyTemplate = async (templateId: string) => {
    const template = PROMPT_TEMPLATES.find(t => t.id === templateId) || PROMPT_TEMPLATES[0]
    const textToCopy = template.generate(questionData)

    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopiedTemplateId(templateId)
      setIsOpen(false)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      // Fallback for older browsers / unsecured contexts
      const textarea = document.createElement('textarea')
      textarea.value = textToCopy
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopiedTemplateId(templateId)
      setIsOpen(false)
    }
  }

  const isCopied = Boolean(copiedTemplateId)

  return (
    <div className={`relative inline-flex items-center rounded-lg shadow-xs ${className}`} ref={dropdownRef}>
      {/* Primary 1-Click Copy Button */}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => copyTemplate(PROMPT_TEMPLATES[0].id)}
        className={`h-7 px-2.5 text-xs font-medium rounded-r-none border-r-0 transition-all ${
          isCopied
            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
        title="Copy question with AI study prompt (NotebookLM, Claude, ChatGPT)"
      >
        {isCopied ? (
          <>
            <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
            <span>Copied Prompt!</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5 mr-1.5 text-slate-500 dark:text-slate-400" />
            <span>Copy for AI</span>
          </>
        )}
      </Button>

      {/* Dropdown Toggle Chevron */}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setIsOpen(prev => !prev)}
        className={`h-7 px-1.5 rounded-l-none text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all ${
          isCopied ? 'border-emerald-300 dark:border-emerald-800' : ''
        }`}
        title="View prompt export templates"
      >
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-72 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg p-1.5 z-50 animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="px-2 py-1.5 border-b border-slate-100 dark:border-slate-800 mb-1">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Export Prompt Templates
            </p>
          </div>

          <div className="space-y-0.5">
            {PROMPT_TEMPLATES.map((tmpl) => {
              const isItemCopied = copiedTemplateId === tmpl.id
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => copyTemplate(tmpl.id)}
                  className="w-full text-left p-2 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors flex items-start space-x-2.5 group cursor-pointer"
                >
                  <div className="mt-0.5 p-1 rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                    {isItemCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {tmpl.label}
                      </span>
                      {isItemCopied && (
                        <span className="text-[10px] text-emerald-600 font-medium">Copied!</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                      {tmpl.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

