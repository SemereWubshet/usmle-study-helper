import { type MedSearchProvider } from '@/api'

export interface ProviderConfig {
  id: MedSearchProvider;
  name: string;
  shortLabel: string;
  sourceLabel: string;
  icon: string;
  placeholder: string;
  emptyHint: string;
  badgeStyle: string;
  accentColor: string;
}

export const PROVIDERS: ProviderConfig[] = [
  {
    id: 'openfda',
    name: 'openFDA',
    shortLabel: 'openFDA',
    sourceLabel: 'FDA Drug Labeling',
    icon: '⚕️',
    placeholder: 'Search drug name (e.g. Lisinopril, Metformin)...',
    emptyHint: 'Search official FDA drug package inserts for black box warnings, clinical pharmacology, indications, and adverse reactions.',
    badgeStyle: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    accentColor: 'emerald',
  },
  {
    id: 'statpearls',
    name: 'StatPearls',
    shortLabel: 'StatPearls',
    sourceLabel: 'NCBI Bookshelf • StatPearls',
    icon: '📖',
    placeholder: 'Search clinical pearls, pathophysiology...',
    emptyHint: 'Search peer-reviewed board-prep clinical pearls, pathophysiology, histology, differentials, and USMLE high-yield management.',
    badgeStyle: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400',
    accentColor: 'indigo',
  },
  {
    id: 'medlineplus',
    name: 'MedlinePlus',
    shortLabel: 'MedlinePlus',
    sourceLabel: 'NIH MedlinePlus',
    icon: '🏛️',
    placeholder: 'Search conditions, diseases, symptoms...',
    emptyHint: 'Type any disease, condition, or clinical term and press Enter to fetch official NIH topic overviews, symptoms, causes, and treatments.',
    badgeStyle: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    accentColor: 'amber',
  },
  {
    id: 'rxnorm',
    name: 'RxNorm',
    shortLabel: 'RxNorm',
    sourceLabel: 'NLM RxNav',
    icon: '🧪',
    placeholder: 'Search active ingredient or brand name...',
    emptyHint: 'Search National Library of Medicine RxNorm for standardized active ingredients, brand/generic pairings, and dosage forms.',
    badgeStyle: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400',
    accentColor: 'cyan',
  },
]

export function getProviderConfig(id: MedSearchProvider): ProviderConfig {
  return PROVIDERS.find((p) => p.id === id) || PROVIDERS[0]
}

