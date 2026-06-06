import { formatDate } from '@/lib/utils'

export interface DateShortcut {
  label: string
  monthsAgo?: number
  yearsAgo?: number
}

export const DATE_SHORTCUTS: DateShortcut[] = [
  { label: '1mo ago', monthsAgo: 1 },
  { label: '3mo ago', monthsAgo: 3 },
  { label: '6mo ago', monthsAgo: 6 },
  { label: '1y ago', yearsAgo: 1 },
]

interface DatePickerProps {
  value: Date
  onChange: (value: Date) => void
  min?: Date
  max?: Date
  label?: string
  disabled?: boolean
}

export function subtractShortcut(from: Date, shortcut: DateShortcut): Date {
  const next = new Date(from)
  if (shortcut.monthsAgo) {
    next.setUTCMonth(next.getUTCMonth() - shortcut.monthsAgo)
  }
  if (shortcut.yearsAgo) {
    next.setUTCFullYear(next.getUTCFullYear() - shortcut.yearsAgo)
  }
  return next
}

export function clampDate(date: Date, min?: Date, max?: Date): Date {
  const time = date.getTime()
  if (min && time < min.getTime()) return new Date(min)
  if (max && time > max.getTime()) return new Date(max)
  return date
}

export function DatePicker({
  value,
  onChange,
  min,
  max,
  label = 'As-of date',
  disabled = false,
}: DatePickerProps) {
  const inputValue = toDateInputValue(value)

  const handleInput = (dateStr: string) => {
    if (!dateStr) return
    const next = clampDate(new Date(`${dateStr}T12:00:00.000Z`), min, max)
    onChange(next)
  }

  const handleShortcut = (shortcut: DateShortcut) => {
    const base = max ?? new Date()
    const next = clampDate(subtractShortcut(base, shortcut), min, max)
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label
          htmlFor="time-machine-date"
          className="text-xs font-medium text-gray-500 dark:text-gray-400"
        >
          {label}
        </label>
        <input
          id="time-machine-date"
          type="date"
          value={inputValue}
          min={min ? toDateInputValue(min) : undefined}
          max={max ? toDateInputValue(max) : undefined}
          disabled={disabled}
          onChange={(e) => handleInput(e.target.value)}
          className="input py-2 text-sm w-full mt-1.5"
        />
        <p className="text-xs text-gray-400 mt-1">
          {value.toLocaleDateString(undefined, {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {DATE_SHORTCUTS.map((shortcut) => (
          <button
            key={shortcut.label}
            type="button"
            disabled={disabled}
            onClick={() => handleShortcut(shortcut)}
            className="text-xs px-2.5 py-1 rounded-full border border-surface-2 dark:border-surface-dark-3
                       text-gray-600 dark:text-gray-400 hover:border-brand-400 hover:text-brand-600
                       dark:hover:text-brand-400 transition-colors disabled:opacity-50"
          >
            {shortcut.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** End-of-day UTC for valid-time as-of queries. */
export function toUtcEndOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999),
  )
}

/** Start-of-day UTC for diff window start. */
export function toUtcStartOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0),
  )
}

export function formatAsOfLabel(date: Date): string {
  return formatDate(date.toISOString())
}
