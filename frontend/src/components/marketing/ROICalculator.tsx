import { useCallback, useEffect, useRef, useState } from 'react'
import CountUp from 'react-countup'
import toast from 'react-hot-toast'
import { Calculator, Mail, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useROI } from '@/hooks/useROI'

const currencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const numberFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const decimalFmt = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

interface QuoteFormData {
  name: string
  email: string
  company: string
}

function AnimatedNumber({
  value,
  formatter,
  suffix = '',
}: {
  value: number
  formatter: (n: number) => string
  suffix?: string
}) {
  const prev = useRef(value)
  const start = prev.current
  prev.current = value

  return (
    <CountUp
      start={start}
      end={value}
      duration={0.3}
      preserveValue
      formattingFn={(n) => `${formatter(n)}${suffix}`}
    />
  )
}

function QuoteModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [form, setForm] = useState<QuoteFormData>({
    name: '',
    email: '',
    company: '',
  })

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('ROI quote request:', form)
    toast.success('Thanks! We will be in touch.')
    onClose()
    setForm({ name: '', email: '', company: '' })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quote-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 id="quote-modal-title" className="text-lg font-semibold text-slate-900">
            Get personalized quote
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="quote-name" className="mb-1 block text-sm font-medium text-slate-700">
              Name
            </label>
            <input
              id="quote-name"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
            />
          </div>
          <div>
            <label htmlFor="quote-email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="quote-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
            />
          </div>
          <div>
            <label htmlFor="quote-company" className="mb-1 block text-sm font-medium text-slate-700">
              Company
            </label>
            <input
              id="quote-company"
              required
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  )
}

export function ROICalculator() {
  const [lawyersCount, setLawyersCount] = useState(5)
  const [hourlyRate, setHourlyRate] = useState(250)
  const [hoursPerWeekOnDocs, setHoursPerWeekOnDocs] = useState(12)
  const [efficiencyGain, setEfficiencyGain] = useState(40)
  const [quoteOpen, setQuoteOpen] = useState(false)
  const warnedHighHours = useRef(false)

  const roi = useROI({
    lawyersCount,
    hourlyRate,
    hoursPerWeekOnDocs,
    efficiencyGain,
  })

  useEffect(() => {
    if (hoursPerWeekOnDocs > 25 && !warnedHighHours.current) {
      warnedHighHours.current = true
      toast('Are you sure? That\'s most of the week.', {
        icon: '⚠️',
        duration: 4000,
      })
    }
    if (hoursPerWeekOnDocs <= 25) {
      warnedHighHours.current = false
    }
  }, [hoursPerWeekOnDocs])

  const handleExport = useCallback(() => {
    console.log('Export ROI PDF (stub):', roi)
    toast('PDF export coming soon', { icon: '📄' })
  }, [roi])

  const clampLawyers = (n: number) => Math.min(500, Math.max(1, n))
  const clampRate = (n: number) => Math.min(2000, Math.max(50, n))

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            See how much you&apos;ll save with DocMind
          </h2>
          <p className="mt-2 max-w-xl text-slate-600">
            Estimate time and cost savings from AI-assisted document review for your legal team.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="shrink-0 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Export
        </button>
      </div>

      <div className="grid gap-8 md:grid-cols-[2fr_3fr]">
        {/* Inputs */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-2 text-slate-900">
            <Calculator className="h-5 w-5 text-brand-600" aria-hidden />
            <span className="font-semibold">Your team</span>
          </div>

          <div className="space-y-6">
            <div>
              <label htmlFor="lawyers-count" className="mb-1 block text-sm font-medium text-slate-700">
                Number of lawyers
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="lawyers-count"
                  type="number"
                  min={1}
                  max={500}
                  value={lawyersCount}
                  onChange={(e) =>
                    setLawyersCount(clampLawyers(Number(e.target.value) || 1))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                  aria-valuemin={1}
                  aria-valuemax={500}
                  aria-valuenow={lawyersCount}
                />
                <span className="shrink-0 text-sm text-slate-500">{lawyersCount} seats</span>
              </div>
            </div>

            <div>
              <label htmlFor="hourly-rate" className="mb-1 block text-sm font-medium text-slate-700">
                Average hourly rate
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="hourly-rate"
                  type="number"
                  min={50}
                  max={2000}
                  step={10}
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(clampRate(Number(e.target.value) || 50))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                  aria-valuemin={50}
                  aria-valuemax={2000}
                  aria-valuenow={hourlyRate}
                />
                <span className="shrink-0 text-sm font-medium text-slate-700">
                  {currencyFmt.format(hourlyRate)}/hr
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="hours-per-week" className="mb-1 block text-sm font-medium text-slate-700">
                Hours per week on document review
                <span className="ml-2 font-normal text-slate-500">
                  {hoursPerWeekOnDocs} h/wk
                </span>
              </label>
              <input
                id="hours-per-week"
                type="range"
                min={1}
                max={40}
                value={hoursPerWeekOnDocs}
                onChange={(e) => setHoursPerWeekOnDocs(Number(e.target.value))}
                className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand-500"
                aria-valuemin={1}
                aria-valuemax={40}
                aria-valuenow={hoursPerWeekOnDocs}
                aria-valuetext={`${hoursPerWeekOnDocs} hours per week`}
              />
              <div className="mt-1 flex justify-between text-xs text-slate-500">
                <span>1 h</span>
                <span>40 h</span>
              </div>
            </div>

            <div>
              <label htmlFor="efficiency-gain" className="mb-1 block text-sm font-medium text-slate-700">
                Efficiency gain from DocMind
                <span className="ml-2 font-normal text-slate-500">{efficiencyGain}%</span>
              </label>
              <input
                id="efficiency-gain"
                type="range"
                min={20}
                max={70}
                step={1}
                value={efficiencyGain}
                onChange={(e) => setEfficiencyGain(Number(e.target.value))}
                className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand-500"
                aria-valuemin={20}
                aria-valuemax={70}
                aria-valuenow={efficiencyGain}
                aria-valuetext={`${efficiencyGain} percent efficiency gain`}
              />
              <div className="mt-1 flex justify-between text-xs text-slate-500">
                <span>Conservative 20%</span>
                <span>Realistic 40%</span>
                <span>Aggressive 60%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Outputs */}
        <div className="space-y-4">
          <div
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            aria-live="polite"
            aria-atomic="true"
          >
            <p className="text-sm font-medium text-slate-600">Annual savings</p>
            <p className="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl">
              <AnimatedNumber value={roi.netSavings} formatter={currencyFmt.format} />
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Gross {currencyFmt.format(roi.annualSavings)} − platform{' '}
              {currencyFmt.format(roi.annualDocMindCost)}
            </p>
          </div>

          <div
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            aria-live="polite"
          >
            <p className="text-sm font-medium text-slate-600">Hours saved / year</p>
            <p className="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl">
              <AnimatedNumber
                value={roi.hoursSavedPerYear}
                formatter={numberFmt.format}
                suffix=" hrs"
              />
            </p>
            <p className="mt-1 text-sm text-slate-500">
              ≈ {decimalFmt.format(roi.fullTimeLawyersEquivalent)} full-time lawyers
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div
              className="rounded-2xl border border-brand-200 bg-brand-50 p-6 shadow-sm"
              aria-live="polite"
            >
              <p className="text-sm font-medium text-brand-800">ROI</p>
              <p className="mt-1 text-3xl font-bold text-brand-700">
                <AnimatedNumber
                  value={roi.roiMultiple}
                  formatter={(n) =>
                    n >= 100 ? `${Math.round(n)}` : decimalFmt.format(n)
                  }
                  suffix="x"
                />
              </p>
            </div>

            <div
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              aria-live="polite"
            >
              <p className="text-sm font-medium text-slate-600">Payback period</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">
                {Number.isFinite(roi.paybackMonths) ? (
                  <AnimatedNumber
                    value={roi.paybackMonths}
                    formatter={decimalFmt.format}
                    suffix=" mo"
                  />
                ) : (
                  '—'
                )}
              </p>
            </div>
          </div>

          <ul className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
              Trusted by AM Law 100 firms (placeholder)
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
              SOC 2 Type II ready infrastructure
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
              Citations on every answer — audit-ready for M&amp;A diligence
            </li>
          </ul>

          <button
            type="button"
            onClick={() => setQuoteOpen(true)}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3',
              'text-sm font-semibold text-white shadow-sm hover:bg-brand-700',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2',
            )}
          >
            <Mail className="h-4 w-4" aria-hidden />
            Get personalized quote
          </button>
        </div>
      </div>

      <QuoteModal open={quoteOpen} onClose={() => setQuoteOpen(false)} />
    </section>
  )
}
