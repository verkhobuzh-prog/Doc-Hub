import { ArrowRight, FileText } from 'lucide-react'
import type { TimeMachineDiff, TimeMachineDocument } from '@/types/chat'
import { formatDate } from '@/lib/utils'

interface DiffViewProps {
  diff: TimeMachineDiff | null
  asOfLabel: string
  isLoading?: boolean
}

function DocList({
  emoji,
  title,
  docs,
  variant,
}: {
  emoji: string
  title: string
  docs: TimeMachineDocument[]
  variant: 'added' | 'removed'
}) {
  if (docs.length === 0) return null

  const styles =
    variant === 'added'
      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 line-through'

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
        {emoji} {title}
      </h3>
      <ul className="space-y-2">
        {docs.map((doc) => (
          <li
            key={doc.id}
            className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${styles}`}
          >
            <FileText className="h-4 w-4 flex-shrink-0 mt-0.5 opacity-70" />
            <div className="min-w-0">
              <p className="font-medium truncate">{doc.filename}</p>
              {doc.valid_from && (
                <p className="text-xs opacity-75 mt-0.5 no-underline">
                  Effective {formatDate(doc.valid_from)}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SupersededPairs({
  asOfLabel,
  pairs,
  fallback,
}: {
  asOfLabel: string
  pairs: TimeMachineDiff['superseded_pairs']
  fallback: TimeMachineDocument[]
}) {
  if (pairs.length === 0 && fallback.length === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
        🔄 Superseded since {asOfLabel}
      </h3>
      <ul className="space-y-2">
        {pairs.map(({ old, new: newer }) => (
          <li
            key={`${old.id}-${newer.id}`}
            className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-800
                       bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm text-amber-900 dark:text-amber-200"
          >
            <span className="font-medium truncate">{old.filename}</span>
            <ArrowRight className="h-4 w-4 flex-shrink-0 opacity-60" />
            <span className="font-medium truncate">{newer.filename}</span>
          </li>
        ))}
        {pairs.length === 0 &&
          fallback.map((doc) => (
            <li
              key={doc.id}
              className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm"
            >
              {doc.filename}
              {doc.valid_to ? ` (until ${formatDate(doc.valid_to)})` : ''}
            </li>
          ))}
      </ul>
    </div>
  )
}

export function DiffView({ diff, asOfLabel, isLoading }: DiffViewProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse pt-4 border-t border-surface-2 dark:border-surface-dark-3">
        <div className="h-4 bg-surface-2 dark:bg-surface-dark-3 rounded w-1/2" />
        <div className="h-14 bg-surface-2 dark:bg-surface-dark-3 rounded" />
        <div className="h-14 bg-surface-2 dark:bg-surface-dark-3 rounded" />
      </div>
    )
  }

  if (!diff) return null

  const isEmpty =
    diff.added.length === 0 &&
    diff.removed.length === 0 &&
    diff.superseded.length === 0 &&
    diff.superseded_pairs.length === 0

  if (isEmpty) {
    return (
      <p className="text-sm text-gray-500 py-4 border-t border-surface-2 dark:border-surface-dark-3">
        No document changes since {asOfLabel}.
      </p>
    )
  }

  return (
    <div className="space-y-5 pt-4 border-t border-surface-2 dark:border-surface-dark-3">
      <DocList
        emoji="📥"
        title={`Added since ${asOfLabel}`}
        docs={diff.added}
        variant="added"
      />
      <DocList
        emoji="📤"
        title={`Removed since ${asOfLabel}`}
        docs={diff.removed}
        variant="removed"
      />
      <SupersededPairs
        asOfLabel={asOfLabel}
        pairs={diff.superseded_pairs}
        fallback={diff.superseded}
      />
    </div>
  )
}
