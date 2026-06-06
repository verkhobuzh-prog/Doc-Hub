import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarX, History } from 'lucide-react'
import { api } from '@/lib/api'
import {
  DatePicker,
  clampDate,
  formatAsOfLabel,
  toUtcEndOfDay,
  toUtcStartOfDay,
} from '@/components/timemachine/DatePicker'
import { TimeMachineDocumentCard } from '@/components/timemachine/TimeMachineDocumentCard'
import { DiffView } from '@/components/timemachine/DiffView'

export function TimeMachinePage() {
  const today = useMemo(() => new Date(), [])
  const [asOfDate, setAsOfDate] = useState(() => new Date())
  const [showDiff, setShowDiff] = useState(false)

  const timelineQuery = useQuery({
    queryKey: ['time-machine', 'timeline'],
    queryFn: api.timeMachine.timeline,
    staleTime: 60_000,
  })

  const earliestDate = useMemo(() => {
    const earliest = timelineQuery.data?.earliest_at
    return earliest ? new Date(earliest) : null
  }, [timelineQuery.data?.earliest_at])

  const minDate = earliestDate ?? undefined
  const maxDate = today

  const asOfUtc = useMemo(() => toUtcEndOfDay(clampDate(asOfDate, minDate, maxDate)), [asOfDate, minDate, maxDate])
  const todayUtc = useMemo(() => toUtcEndOfDay(today), [today])
  const diffFromUtc = useMemo(() => toUtcStartOfDay(asOfUtc), [asOfUtc])

  const isBeforeCorpus =
    earliestDate !== null && asOfUtc.getTime() < toUtcEndOfDay(earliestDate).getTime()

  const snapshotQuery = useQuery({
    queryKey: ['time-machine', 'snapshot', asOfUtc.toISOString()],
    queryFn: () => api.timeMachine.snapshot(asOfUtc),
    enabled: !isBeforeCorpus,
    staleTime: 30_000,
  })

  const diffQuery = useQuery({
    queryKey: ['time-machine', 'diff', diffFromUtc.toISOString(), todayUtc.toISOString()],
    queryFn: () => api.timeMachine.diff(diffFromUtc, todayUtc),
    enabled: !isBeforeCorpus && showDiff && diffFromUtc.getTime() < todayUtc.getTime(),
    staleTime: 30_000,
  })

  const asOfLabel = formatAsOfLabel(asOfUtc)

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="border-b border-surface-2 dark:border-surface-dark-3 bg-white dark:bg-surface-dark-1 px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <History className="w-5 h-5 text-brand-500" />
          Time Machine
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Valid-time only (MVP) — what contracts and documents were effective on a given date
        </p>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Left pane — date picker */}
        <aside className="w-full lg:w-72 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-surface-2 dark:border-surface-dark-3 p-6 bg-surface-0 dark:bg-surface-dark-0">
          <DatePicker
            value={asOfDate}
            onChange={setAsOfDate}
            min={minDate}
            max={maxDate}
          />
        </aside>

        {/* Right pane — snapshot + diff */}
        <div className="flex-1 overflow-y-auto p-6">
          {isBeforeCorpus ? (
            <div className="card p-10 text-center max-w-lg mx-auto">
              <CalendarX className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h2 className="text-base font-medium text-gray-900 dark:text-white mb-2">
                No documents existed on this date
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                {earliestDate
                  ? `Earliest document: ${formatAsOfLabel(earliestDate)}`
                  : 'Upload and index documents first, or run the demo seed script.'}
              </p>
              {earliestDate && (
                <button
                  type="button"
                  onClick={() => setAsOfDate(new Date(earliestDate))}
                  className="btn-primary text-sm"
                >
                  Jump to earliest date
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="mb-4">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  As of {asOfLabel}:{' '}
                  {snapshotQuery.isLoading ? (
                    <span className="text-gray-400">loading…</span>
                  ) : (
                    <span>
                      {snapshotQuery.data?.total ?? 0} document
                      {(snapshotQuery.data?.total ?? 0) === 1 ? '' : 's'} valid
                    </span>
                  )}
                </h2>
              </div>

              {snapshotQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="card h-20 animate-pulse bg-surface-1 dark:bg-surface-dark-2"
                    />
                  ))}
                </div>
              ) : snapshotQuery.isError ? (
                <div className="card p-4 border-red-200 bg-red-50 text-red-700 text-sm">
                  Failed to load snapshot.{' '}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => void snapshotQuery.refetch()}
                  >
                    Retry
                  </button>
                </div>
              ) : snapshotQuery.data?.documents.length === 0 ? (
                <div className="card p-8 text-center text-sm text-gray-500">
                  No indexed documents were valid on {asOfLabel}.
                </div>
              ) : (
                <div className="space-y-2">
                  {snapshotQuery.data?.documents.map((doc) => (
                    <TimeMachineDocumentCard key={doc.id} doc={doc} />
                  ))}
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-surface-2 dark:border-surface-dark-3">
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={showDiff}
                    onChange={(e) => setShowDiff(e.target.checked)}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  Show diff to today
                </label>

                {showDiff && (
                  <DiffView
                    diff={diffQuery.data ?? null}
                    asOfLabel={asOfLabel}
                    isLoading={diffQuery.isLoading}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
