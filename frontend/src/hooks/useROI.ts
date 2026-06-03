/**
 * ROI calculator for DocMind marketing lead-magnet.
 *
 * Verified defaults (5 lawyers, $250/hr, 12 h/wk, 40% gain, $99/seat/mo):
 *   totalHoursPerYear = 5 × 12 × 48 = 2,880
 *   hoursSavedPerYear  = 2,880 × 0.40 = 1,152
 *   annualSavings      = 1,152 × 250 = $288,000
 *   annualDocMindCost  = 5 × 99 × 12 = $5,940
 *   netSavings         = $282,060
 *   roiMultiple        ≈ 48.5×
 *   paybackMonths      ≈ 0.25
 *
 * (Draft acceptance math citing 72,000 h base appears to omit the × lawyers step
 *  or conflate totals — formulas below match the spec verbatim.)
 */

export const SEAT_PRICE_MONTHLY_USD = 99
export const WORK_WEEKS_PER_YEAR = 48
/** Full-time equivalent: 40 h/wk × 48 weeks */
export const FULL_TIME_HOURS_PER_YEAR = 40 * WORK_WEEKS_PER_YEAR

export interface ROIInputs {
  lawyersCount: number
  hourlyRate: number
  hoursPerWeekOnDocs: number
  efficiencyGain: number
}

export interface ROIResult {
  totalHoursPerYear: number
  hoursSavedPerYear: number
  annualSavings: number
  monthlyDocMindCost: number
  annualDocMindCost: number
  netSavings: number
  roiMultiple: number
  paybackMonths: number
  /** Full-time lawyer equivalents freed by time saved */
  fullTimeLawyersEquivalent: number
}

export function computeROI(inputs: ROIInputs): ROIResult {
  const { lawyersCount, hourlyRate, hoursPerWeekOnDocs, efficiencyGain } = inputs

  const totalHoursPerYear =
    lawyersCount * hoursPerWeekOnDocs * WORK_WEEKS_PER_YEAR
  const hoursSavedPerYear = totalHoursPerYear * (efficiencyGain / 100)
  const annualSavings = hoursSavedPerYear * hourlyRate
  const monthlyDocMindCost = lawyersCount * SEAT_PRICE_MONTHLY_USD
  const annualDocMindCost = monthlyDocMindCost * 12
  const netSavings = annualSavings - annualDocMindCost
  const roiMultiple =
    annualDocMindCost > 0 ? annualSavings / annualDocMindCost : 0
  const monthlySavings = annualSavings / 12
  const paybackMonths =
    monthlySavings > 0 ? annualDocMindCost / monthlySavings : Infinity
  const fullTimeLawyersEquivalent =
    FULL_TIME_HOURS_PER_YEAR > 0
      ? hoursSavedPerYear / FULL_TIME_HOURS_PER_YEAR
      : 0

  return {
    totalHoursPerYear,
    hoursSavedPerYear,
    annualSavings,
    monthlyDocMindCost,
    annualDocMindCost,
    netSavings,
    roiMultiple,
    paybackMonths,
    fullTimeLawyersEquivalent,
  }
}

export function useROI(inputs: ROIInputs): ROIResult {
  return computeROI(inputs)
}
