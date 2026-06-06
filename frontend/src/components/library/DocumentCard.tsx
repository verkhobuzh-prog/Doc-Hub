import {
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  XCircle,
} from 'lucide-react'
import type { Document } from '@/lib/api'
import { formatDate } from '@/lib/utils'

const STATUS_CONFIG = {
  uploaded: { label: 'Processing', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20', icon: Clock },
  parsing: { label: 'Processing', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20', icon: Loader2 },
  indexed: { label: 'Ready', color: 'text-green-600 bg-green-50 dark:bg-green-900/20', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'text-red-600 bg-red-50 dark:bg-red-900/20', icon: XCircle },
} as const

function pageCount(doc: Document): string {
  const meta = doc.metadata
  if (meta && typeof meta.page_count === 'number') {
    return `${meta.page_count} pg`
  }
  return '— pg'
}

function isProcessing(doc: Document): boolean {
  return doc.status === 'uploaded' || doc.status === 'parsing'
}

export interface DocumentCardProps {
  doc: Document
  selected: boolean
  onToggle: () => void
}

export function DocumentCard({ doc, selected, onToggle }: DocumentCardProps) {
  const cfg = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.uploaded
  const StatusIcon = cfg.icon
  const disabled = isProcessing(doc)

  const handleClick = () => {
    if (disabled) return
    onToggle()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      title={disabled ? 'Wait for indexing' : undefined}
      className={`
        card relative w-full text-left p-4 transition-all duration-150
        ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:border-brand-300 dark:hover:border-brand-700'}
        ${selected ? 'outline outline-2 outline-blue-500 outline-offset-2 border-blue-200 dark:border-blue-800' : ''}
      `}
    >
      <div
        className={`
          absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded border
          ${selected ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-surface-dark-2'}
          ${disabled ? 'opacity-50' : ''}
        `}
        aria-hidden
      >
        {selected && <span className="text-xs font-bold">✓</span>}
      </div>

      <div className="mb-3 flex h-28 items-center justify-center rounded-lg bg-surface-0 dark:bg-surface-dark-2 border border-surface-1 dark:border-surface-dark-3">
        <FileText className="h-10 w-10 text-gray-300 dark:text-gray-600" />
      </div>

      <p className="pr-8 text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-2">
        {doc.filename}
      </p>

      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${cfg.color}`}>
          <StatusIcon className={`h-3 w-3 ${doc.status === 'parsing' ? 'animate-spin' : ''}`} />
          {cfg.label}
        </span>
        <span className="text-xs text-gray-400">{pageCount(doc)}</span>
      </div>

      <p className="mt-2 text-xs text-gray-400">{formatDate(doc.created_at)}</p>
    </button>
  )
}
