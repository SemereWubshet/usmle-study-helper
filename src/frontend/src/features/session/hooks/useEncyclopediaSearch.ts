import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchEncyclopedia, type EncyclopediaEntry, type MedSearchProvider } from '@/api'

export function useEncyclopediaSearch() {
  const [provider, setProvider] = useState<MedSearchProvider>('openfda')
  const [searchInput, setSearchInput] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const {
    data: encyclopediaEntries = [],
    isLoading: isLoadingEncyclopedia,
    isFetched: isFetchedEncyclopedia,
  } = useQuery<EncyclopediaEntry[]>({
    queryKey: ['encyclopedia', submittedQuery, provider],
    queryFn: () => fetchEncyclopedia(submittedQuery, provider),
    enabled: submittedQuery.trim().length >= 2,
    staleTime: 1000 * 60 * 10,
  })

  const handleSelectProvider = (newProvider: MedSearchProvider) => {
    setProvider(newProvider)
    // If the student already typed or submitted a term, immediately query the new provider
    const term = searchInput.trim() || submittedQuery.trim()
    if (term.length >= 2 && term !== submittedQuery) {
      setSubmittedQuery(term)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchInput.trim()) {
      setSubmittedQuery(searchInput.trim())
    }
  }

  const handleClearSearch = () => {
    setSearchInput('')
    setSubmittedQuery('')
  }

  return {
    provider,
    setProvider: handleSelectProvider,
    searchInput,
    setSearchInput,
    submittedQuery,
    setSubmittedQuery,
    isSidebarOpen,
    setIsSidebarOpen,
    encyclopediaEntries,
    isLoadingEncyclopedia,
    isFetchedEncyclopedia,
    handleSearchSubmit,
    handleClearSearch,
  }
}
