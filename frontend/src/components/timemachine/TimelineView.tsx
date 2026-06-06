import { useMemo, useRef, useEffect } from 'react'
import type { TimelineEvent } from '@/lib/api'
import { formatDate } from '@/lib/utils'

interface TimelineViewProps {
  events: TimelineEvent[]
  selectedDate: string
  today: string
  earliestDate?: string | null
}

const EVENT_COLORS: Record<string, string> = {
  upload: 'bg-brand-500',
  effective: 'bg-blue-500',
  superseded: 'bg-amber-500',
  version: 'bg-purple-500',
}

export function TimelineView({
  events,
  selectedDate,
  today,
  earliestDate,
}: TimelineViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLDivElement>(null)

  const range = useMemo(() => {
    const dates = [
      ...events.map((e) => new Date(e.occurred_at).getTime()),
      new Date(`${selectedDate}T12:00:00`).getTime(),
      new Date(`${today}T12:00:00`).getTime(),
    ]
    if (earliestDate) {
      dates.push(new Date(`${earliestDate}T12:00:00`).getTime())
    }
    const min = Math.min(...dates)
    const max = Math.max(...dates)
    const span = max - min || 1
    return { min, max, span }
  }, [events, selectedDate, today, earliestDate])

  const positionPct = (iso: string) => {
    const t = new Date(iso).getTime()
    return ((t - range.min) / range.span) * 100
  }

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [selectedDate])

  if (events.length === 0 && !earliestDate) {
    return (
      <div className="card p-6 text-center text-sm text-gray-500">
        No timeline events yet. Upload documents to see markers.
      </div>
    )
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-gray-900 dark:text-white">Document timeline</h2>
        <span className="text-xs text-gray-400">
          {earliestDate ? formatDate(`${earliestDate}T12:00:00Z`) : '—'} → today
        </span>
      </div>

      <div ref={scrollRef} className="relative h-28 overflow-x-auto pb-2">
        <div className="relative min-w-[640px] h-full mx-4">
          <div className="absolute left-0 right-0 top-1/2 h-px bg-surface-2 dark:bg-surface-dark-3" />

          <div
            ref={selectedRef}
            className="absolute top-0 bottom-0 w-0.5 bg-brand-600 z-10"
            style={{ left: `${positionPct(`${selectedDate}T12:00:00Z`)}%` }}
          >
            <span className="absolute -top-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-brand-600">
              As-of
            </span>
          </div>

          <div
            className="absolute top-1/2 -translate-y-1/2 z-10"
            style={{ left: `${positionPct(`${today}T12:00:00Z`)}%` }}
            title="Today"
          >
            <div className="w-3 h-3 rounded-full bg-green-500 ring-2 ring-white dark:ring-surface-dark-1" />
          </div>

          {events.map((event) => (
            <div
              key={`${event.document_id}-${event.event_type}-${event.occurred_at}`}
              className="absolute top-1/2 -translate-y-1/2 group"
              style={{ left: `${positionPct(event.occurred_at)}%` }}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full ${EVENT_COLORS[event.event_type] ?? 'bg-gray-400'} ring-2 ring-white dark:ring-surface-dark-1 cursor-default`}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 w-max max-w-[200px] rounded-lg bg-gray-900 text-white text-[10px] px-2 py-1.5 shadow-lg">
                <p className="font-medium truncate">{event.filename}</p>
                <p className="text-gray-300 capitalize">{event.event_type}</p>
                <p className="text-gray-400">{formatDate(event.occurred_at)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
