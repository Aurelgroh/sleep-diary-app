/**
 * Titration recommendation engine for CBT-I sleep window adjustments
 *
 * Based on clinical guidelines:
 * - SE >= 90%: Increase window by 15 minutes (excellent consolidation)
 * - SE 85-89%: Maintain current window (good progress)
 * - SE 80-84%: Clinical judgment needed (borderline)
 * - SE < 80%: Consider decreasing window or review (poor efficiency)
 */

export type TitrationAction = 'increase' | 'maintain' | 'decrease' | 'review'

export interface TitrationRecommendation {
  action: TitrationAction
  minutes: number
  reason: string
  confidence: 'high' | 'medium' | 'low'
  weeklyAvgSE: number | null
  daysLogged: number
}

export interface Prescription {
  id: string
  patient_id: string
  bedtime: string      // HH:MM format
  wake_time: string    // HH:MM format
  window_minutes: number
  effective_date: string
  created_at: string
  notes?: string | null
}

// Default minimum window floor (5 hours = 300 minutes)
export const DEFAULT_MIN_WINDOW = 300

export interface TitrationInput {
  weeklyAvgSE: number | null
  daysLogged: number
  currentWindowMinutes: number
  minWindowMinutes: number
}

/**
 * SE thresholds for titration decisions
 */
export const SE_THRESHOLDS = {
  EXCELLENT: 90,    // Increase window
  GOOD: 85,         // Maintain window
  BORDERLINE: 80,   // Clinical judgment
  POOR: 75          // Decrease or review
} as const

/**
 * Standard titration increment (minutes)
 */
export const TITRATION_INCREMENT = 15

/**
 * Minimum days logged for confident recommendation
 */
export const MIN_DAYS_FOR_CONFIDENCE = 5

/**
 * Calculate titration recommendation based on weekly sleep efficiency
 */
export function getTitrationRecommendation(input: TitrationInput): TitrationRecommendation {
  const { weeklyAvgSE, daysLogged, currentWindowMinutes, minWindowMinutes } = input

  // Not enough data
  if (weeklyAvgSE === null || daysLogged < 3) {
    return {
      action: 'maintain',
      minutes: 0,
      reason: 'Not enough diary data to make a recommendation. Need at least 3 days logged.',
      confidence: 'low',
      weeklyAvgSE,
      daysLogged
    }
  }

  // Confidence based on days logged
  const confidence = daysLogged >= MIN_DAYS_FOR_CONFIDENCE ? 'high' : 'medium'

  // Excellent SE - recommend increasing window
  if (weeklyAvgSE >= SE_THRESHOLDS.EXCELLENT) {
    return {
      action: 'increase',
      minutes: TITRATION_INCREMENT,
      reason: `Sleep efficiency ${Math.round(weeklyAvgSE)}% exceeds 90%, indicating excellent sleep consolidation. Recommend expanding sleep window by 15 minutes.`,
      confidence,
      weeklyAvgSE,
      daysLogged
    }
  }

  // Good SE - maintain current window
  if (weeklyAvgSE >= SE_THRESHOLDS.GOOD) {
    return {
      action: 'maintain',
      minutes: 0,
      reason: `Sleep efficiency ${Math.round(weeklyAvgSE)}% is in the 85-89% range, indicating good progress. Recommend maintaining current sleep window.`,
      confidence,
      weeklyAvgSE,
      daysLogged
    }
  }

  // Borderline SE - clinical judgment needed
  if (weeklyAvgSE >= SE_THRESHOLDS.BORDERLINE) {
    return {
      action: 'review',
      minutes: 0,
      reason: `Sleep efficiency ${Math.round(weeklyAvgSE)}% is borderline (80-84%). Clinical judgment recommended - consider maintaining or decreasing window based on patient factors.`,
      confidence: 'medium',
      weeklyAvgSE,
      daysLogged
    }
  }

  // Poor SE - recommend decreasing window (if above minimum)
  if (currentWindowMinutes > minWindowMinutes) {
    return {
      action: 'decrease',
      minutes: TITRATION_INCREMENT,
      reason: `Sleep efficiency ${Math.round(weeklyAvgSE)}% is below 80%, suggesting the sleep window may be too large. Recommend restricting by 15 minutes.`,
      confidence,
      weeklyAvgSE,
      daysLogged
    }
  }

  // At minimum window - review needed
  return {
    action: 'review',
    minutes: 0,
    reason: `Sleep efficiency ${Math.round(weeklyAvgSE)}% is below 80% but patient is already at minimum sleep window (${Math.round(minWindowMinutes / 60)} hours). Clinical review recommended.`,
    confidence: 'medium',
    weeklyAvgSE,
    daysLogged
  }
}

/**
 * Calculate new sleep window times based on titration
 */
export function calculateNewPrescription(
  currentPrescription: Prescription,
  action: TitrationAction,
  minutes: number,
  anchor: 'bedtime' | 'waketime' = 'waketime'
): { bedtime: string; wake_time: string; window_minutes: number } {
  const current = {
    bedtime: currentPrescription.bedtime,
    wake_time: currentPrescription.wake_time,
    window_minutes: currentPrescription.window_minutes
  }

  if (action === 'maintain' || action === 'review' || minutes === 0) {
    return current
  }

  const adjustment = action === 'increase' ? minutes : -minutes
  const newWindowMinutes = current.window_minutes + adjustment

  // Parse current times
  const [bedHour, bedMin] = current.bedtime.split(':').map(Number)
  const [wakeHour, wakeMin] = current.wake_time.split(':').map(Number)

  let newBedHour = bedHour
  let newBedMin = bedMin
  let newWakeHour = wakeHour
  let newWakeMin = wakeMin

  if (anchor === 'waketime') {
    // Keep wake time fixed, adjust bedtime
    // Earlier bedtime for increase, later for decrease
    const bedTimeMinutes = bedHour * 60 + bedMin - adjustment
    newBedHour = Math.floor(((bedTimeMinutes % 1440) + 1440) % 1440 / 60)
    newBedMin = ((bedTimeMinutes % 1440) + 1440) % 60
  } else {
    // Keep bedtime fixed, adjust wake time
    const wakeTimeMinutes = wakeHour * 60 + wakeMin + adjustment
    newWakeHour = Math.floor(((wakeTimeMinutes % 1440) + 1440) % 1440 / 60)
    newWakeMin = ((wakeTimeMinutes % 1440) + 1440) % 60
  }

  return {
    bedtime: `${newBedHour.toString().padStart(2, '0')}:${newBedMin.toString().padStart(2, '0')}`,
    wake_time: `${newWakeHour.toString().padStart(2, '0')}:${newWakeMin.toString().padStart(2, '0')}`,
    window_minutes: newWindowMinutes
  }
}

/**
 * Get action badge style
 */
export function getActionBadgeClass(action: TitrationAction): string {
  switch (action) {
    case 'increase':
      return 'bg-green-100 text-green-700'
    case 'maintain':
      return 'bg-blue-100 text-blue-700'
    case 'decrease':
      return 'bg-amber-100 text-amber-700'
    case 'review':
      return 'bg-purple-100 text-purple-700'
  }
}

/**
 * Get action label
 */
export function getActionLabel(action: TitrationAction): string {
  switch (action) {
    case 'increase':
      return 'Increase Window'
    case 'maintain':
      return 'Maintain'
    case 'decrease':
      return 'Decrease Window'
    case 'review':
      return 'Review Needed'
  }
}

/**
 * Format time string (HH:MM) to display format
 */
export function formatPrescriptionTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 || 12
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`
}

/**
 * Calculate sleep window duration from times
 */
export function calculateWindowMinutes(bedtime: string, waketime: string): number {
  const [bedHour, bedMin] = bedtime.split(':').map(Number)
  const [wakeHour, wakeMin] = waketime.split(':').map(Number)

  const bedMinutes = bedHour * 60 + bedMin
  const wakeMinutes = wakeHour * 60 + wakeMin

  // Handle overnight (bedtime in PM, wake in AM)
  if (wakeMinutes < bedMinutes) {
    return (1440 - bedMinutes) + wakeMinutes
  }
  return wakeMinutes - bedMinutes
}
