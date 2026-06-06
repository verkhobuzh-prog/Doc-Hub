import { FileText } from 'lucide-react'
import type { TimeMachineDocument } from '@/types/chat'
import { formatDate } from '@/lib/utils'

interface TimeMachineDocumentCardProps {
  doc: TimeMachineDocument
}

function ValidityBadge({
  label,
  value,
  tone,
}: {
  label: string
  value: string | null | undefined
  tone: 'from' | 'to' | 'open'
}) {
  const styles = {
    from: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
    to: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
    open: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
  }[tone]

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${styles}`}>
      {label}
      {value ? formatDate(value) : 'open'}
    </span>
  )
}

export function TimeMachineDocumentCard({ doc }: TimeMachineDocumentCardProps) {
  return (
    <div className="card flex items-start gap-3 p-4 hover:border-brand-200 dark:hover:border-brand-800 transition-colors">
      <FileText className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{doc.filename}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {doc.document_type ?? 'Document'}
          {doc.subject ? ` · ${doc.subject}` : ''}
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <ValidityBadge label="from " value={doc.valid_from ?? doc.created_at} tone="from" />
          <ValidityBadge
            label="to "
            value={doc.valid_to ?? undefined}
            tone={doc.valid_to ? 'to' : 'open'}
          />
        </div>
      </div>
    </div>
  )
}
