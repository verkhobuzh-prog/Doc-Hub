import { Search } from 'lucide-react'

export type LibraryStatusFilter = 'all' | 'ready' | 'processing' | 'failed'
export type LibrarySort = 'name' | 'date_desc' | 'date_asc'

interface FilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  status: LibraryStatusFilter
  onStatusChange: (value: LibraryStatusFilter) => void
  sort: LibrarySort
  onSortChange: (value: LibrarySort) => void
}

const STATUS_OPTIONS: { value: LibraryStatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'ready', label: 'Ready' },
  { value: 'processing', label: 'Processing' },
  { value: 'failed', label: 'Failed' },
]

const SORT_OPTIONS: { value: LibrarySort; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'date_desc', label: 'Newest first' },
  { value: 'date_asc', label: 'Oldest first' },
]

export function FilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  sort,
  onSortChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name..."
          className="input w-full pl-9 py-2 text-sm"
          aria-label="Search documents"
        />
      </div>

      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value as LibraryStatusFilter)}
        className="input py-2 text-sm w-full sm:w-auto"
        aria-label="Filter by status"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as LibrarySort)}
        className="input py-2 text-sm w-full sm:w-auto"
        aria-label="Sort documents"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            Sort: {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
