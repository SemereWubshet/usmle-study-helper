import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchEncyclopedia, type EncyclopediaEntry } from '@/api'

export function useEncyclopediaSearch() {
  const [searchInput, setSearchInput] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const {
    data: encyclopediaEntries = [],
    isLoading: isLoadingEncyclopedia,
    isFetched: isFetchedEncyclopedia,
  } = useQuery<EncyclopediaEntry[]>({
    queryKey: ['encyclopedia', submittedQuery],
    queryFn: () => fetchEncyclopedia(submittedQuery),
    enabled: submittedQuery.trim().length >= 2,
    staleTime: 1000 * 60 * 10,
  })

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
