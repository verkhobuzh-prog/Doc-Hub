import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Library } from 'lucide-react'
import { api, type Document } from '@/lib/api'
import { useScopeStore } from '@/stores/scopeStore'
import { DocumentCard } from '@/components/library/DocumentCard'
import { FilterBar, type LibrarySort, type LibraryStatusFilter } from '@/components/library/FilterBar'
import { ScopeIndicator } from '@/components/library/ScopeIndicator'

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

function matchesStatus(doc: Document, status: LibraryStatusFilter): boolean {
  if (status === 'all') return true
  if (status === 'ready') return doc.status === 'indexed'
  if (status === 'processing') return doc.status === 'uploaded' || doc.status === 'parsing'
  return doc.status === 'failed'
}

function sortDocuments(docs: Document[], sort: LibrarySort): Document[] {
  const copy = [...docs]
  switch (sort) {
    case 'name':
      return copy.sort((a, b) => a.filename.localeCompare(b.filename, 'uk'))
    case 'date_asc':
      return copy.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )
    case 'date_desc':
    default:
      return copy.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
  }
}

export function DocumentLibraryPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<LibraryStatusFilter>('all')
  const [sort, setSort] = useState<LibrarySort>('date_desc')
  const debouncedSearch = useDebouncedValue(search, 200)

  const toggleDoc = useScopeStore((s) => s.toggleDoc)
  const isInScope = useScopeStore((s) => s.isInScope)

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: api.documents.list,
    refetchInterval: (query) => {
      const hasProcessing = query.state.data?.some(
        (d) => d.status === 'parsing' || d.status === 'uploaded',
      )
      return hasProcessing ? 3000 : false
    },
  })

  const filteredDocs = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase()
    let result = docs.filter((doc) => matchesStatus(doc, statusFilter))
    if (needle) {
      result = result.filter((doc) => doc.filename.toLowerCase().includes(needle))
    }
    return sortDocuments(result, sort)
  }, [docs, debouncedSearch, statusFilter, sort])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Library className="w-5 h-5 text-brand-500" />
            Document Library
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Select documents to scope Chat AI answers
          </p>
        </div>
        <ScopeIndicator variant="library" />
      </div>

      <div className="mb-6">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          status={statusFilter}
          onStatusChange={setStatusFilter}
          sort={sort}
          onSortChange={setSort}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-sm text-gray-500">
            {docs.length === 0
              ? 'No documents yet. Upload files in Documents first.'
              : 'No documents match your filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDocs.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              selected={isInScope(doc.id)}
              onToggle={() => toggleDoc(doc.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
