import * as Tooltip from '@radix-ui/react-tooltip'
import { FileText } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import type { Citation } from '@/types/chat'
import { cn } from '@/lib/utils'

export interface CitationChipProps {
  citation: Citation
  onClick?: (citation: Citation) => void
}

function relevanceBarClass(score: number): string {
  if (score >= 0.8) return 'bg-green-500'
  if (score >= 0.5) return 'bg-amber-400'
  return 'bg-red-500'
}

function buildChipLabel(citation: Citation): string {
  const sectionPart = citation.section ? ` · ${citation.section}` : ''
  return `${citation.doc_name} · p.${citation.page}${sectionPart}`
}

function buildAriaLabel(citation: Citation): string {
  const sectionPart = citation.section ? `, section ${citation.section}` : ''
  return `Citation from ${citation.doc_name}, page ${citation.page}${sectionPart}. Relevance ${Math.round(citation.relevance_score * 100)} percent.`
}

export function CitationChip({ citation, onClick }: CitationChipProps) {
  const label = buildChipLabel(citation)
  const ariaLabel = buildAriaLabel(citation)
  const relevancePct = Math.round(Math.min(1, Math.max(0, citation.relevance_score)) * 100)

  const handleActivate = () => {
    onClick?.(citation)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleActivate()
    }
  }

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          role="button"
          tabIndex={0}
          aria-label={ariaLabel}
          onClick={handleActivate}
          onKeyDown={handleKeyDown}
          className={cn(
            'inline-flex max-w-full items-center gap-1 rounded-full border border-brand-200',
            'bg-brand-50 px-2 py-0.5 text-xs text-brand-700',
            'cursor-pointer transition hover:bg-brand-100',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-1',
          )}
        >
          <FileText className="h-3 w-3 flex-shrink-0" aria-hidden />
          <span className="truncate">{label}</span>
        </button>
      </Tooltip.Trigger>

      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          align="start"
          sideOffset={6}
          collisionPadding={16}
          className={cn(
            'z-50 w-[320px] max-w-[calc(100vw-2rem)] rounded-lg border border-surface-2',
            'bg-white p-3 shadow-lg dark:border-surface-dark-3 dark:bg-surface-dark-1',
          )}
        >
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {citation.doc_name}
          </p>

          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              p.{citation.page}
              {citation.section ? ` · ${citation.section}` : ''}
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <div
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2 dark:bg-surface-dark-3"
                role="progressbar"
                aria-valuenow={relevancePct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Relevance score"
              >
                <div
                  className={cn('h-full rounded-full transition-all', relevanceBarClass(citation.relevance_score))}
                  style={{ width: `${relevancePct}%` }}
                />
              </div>
              <span className="text-[10px] tabular-nums text-gray-400">{relevancePct}%</span>
            </div>
          </div>

          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
            {citation.snippet}
          </p>

          {onClick && (
            <div className="mt-3 border-t border-surface-2 pt-2 dark:border-surface-dark-3">
              <button
                type="button"
                className={cn(
                  'w-full rounded-md px-2 py-1.5 text-xs font-medium',
                  'bg-brand-50 text-brand-700 hover:bg-brand-100',
                  'dark:bg-brand-900/30 dark:text-brand-400 dark:hover:bg-brand-900/50',
                )}
                onClick={(event) => {
                  event.stopPropagation()
                  handleActivate()
                }}
              >
                Open in viewer
              </button>
            </div>
          )}

          <Tooltip.Arrow className="fill-white dark:fill-surface-dark-1" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}
