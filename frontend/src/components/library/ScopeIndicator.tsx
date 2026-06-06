import { Link, useNavigate } from 'react-router-dom'
import { MessageSquare, X } from 'lucide-react'
import { useScopeStore } from '@/stores/scopeStore'

interface ScopeIndicatorProps {
  variant?: 'library' | 'chat'
}

export function ScopeIndicator({ variant = 'library' }: ScopeIndicatorProps) {
  const navigate = useNavigate()
  const selectedDocIds = useScopeStore((s) => s.selectedDocIds)
  const clearScope = useScopeStore((s) => s.clearScope)
  const count = selectedDocIds.length

  if (variant === 'chat') {
    if (count === 0) {
      return (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          No scope — chat searches all indexed documents.{' '}
          <Link to="/library" className="text-brand-600 hover:underline dark:text-brand-400">
            Select documents
          </Link>
        </p>
      )
    }

    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
        <span>
          Scoped to{' '}
          <strong className="font-medium text-gray-900 dark:text-white">
            {count} document{count === 1 ? '' : 's'}
          </strong>
        </span>
        <span className="text-gray-300 dark:text-gray-600">·</span>
        <button
          type="button"
          onClick={clearScope}
          className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 dark:hover:text-white"
        >
          <X className="h-3 w-3" />
          Clear
        </button>
        <span className="text-gray-300 dark:text-gray-600">·</span>
        <Link to="/library" className="text-brand-600 hover:underline dark:text-brand-400">
          Edit scope
        </Link>
      </div>
    )
  }

  if (count === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No documents selected — chat will use all docs
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600 dark:text-gray-300">
      <span className="font-medium text-gray-900 dark:text-white">
        {count} selected
      </span>
      <span className="text-gray-300 dark:text-gray-600">·</span>
      <button
        type="button"
        onClick={clearScope}
        className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 dark:hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
        Clear all
      </button>
      <span className="text-gray-300 dark:text-gray-600">·</span>
      <button
        type="button"
        onClick={() => navigate('/chat')}
        className="inline-flex items-center gap-1 text-brand-600 hover:underline dark:text-brand-400"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Open in Chat →
      </button>
    </div>
  )
}
