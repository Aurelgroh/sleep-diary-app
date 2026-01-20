// Sleep Diary Metric Calculations

import { AWAKENING_VALUE_MAP } from './questions'

export interface DiaryAnswers {
  q1_ttb: string          // Time to bed (HH:mm format)
  q2_tts: string          // Time to sleep attempt
  q3_fell_asleep_quickly: boolean
  q4_sol?: number         // Sleep onset latency (minutes)
  q5_sol_out?: number     // SOL out of bed (minutes)
  q6_awakenings: number   // MCQ value (0-6)
  q7_waso?: number        // Wake after sleep onset (minutes)
  q8_waso_out?: number    // WASO out of bed (minutes)
  q9_tfa: string          // Time of final awakening
  q10_woke_early: boolean
  q11_ema?: number        // Early morning awakening (minutes)
  q12_ema_out?: number    // EMA out of bed (minutes)
  q13_tob: string         // Time out of bed
  q14_quality: number     // 1-5 quality rating
}

export interface SleepMetrics {
  ttb: Date               // Time to bed
  tts: Date               // Time to sleep
  tfa: Date               // Time of final awakening
  tob: Date               // Time out of bed
  sol: number             // Sleep onset latency (minutes)
  sol_out_of_bed: number  // SOL out of bed (minutes)
  awakenings: number      // Actual awakening count
  waso: number            // Wake after sleep onset (minutes)
  waso_out_of_bed: number // WASO out of bed (minutes)
  ema: number             // Early morning awakening (minutes)
  ema_out_of_bed: number  // EMA out of bed (minutes)
  quality_rating: number  // 1-5 scale
  // Computed values
  tib: number             // Time in bed (minutes)
  twt: number             // Total wake time (minutes)
  twt_out: number         // Total time out of bed (minutes)
  tst: number             // Total sleep time (minutes)
  se: number              // Sleep efficiency (%)
}

export interface DiaryEntryData {
  date: string            // YYYY-MM-DD
  ttb: string             // ISO timestamp
  tts: string             // ISO timestamp
  tfa: string             // ISO timestamp
  tob: string             // ISO timestamp
  sol: number
  sol_out_of_bed: number
  awakenings: number
  waso: number
  waso_out_of_bed: number
  ema: number
  ema_out_of_bed: number
  quality_rating: number
  answers: DiaryAnswers   // Raw answers for audit
}

/**
 * Parse a time string (HH:mm) into a Date object for a given date
 * Handles overnight logic (if time is before noon, it's the next day)
 */
export function parseTimeForDate(dateStr: string, timeStr: string, isNextDay: boolean = false): Date {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const date = new Date(dateStr)

  if (isNextDay) {
    date.setDate(date.getDate() + 1)
  }

  date.setHours(hours, minutes, 0, 0)
  return date
}

/**
 * Determine the sleep date from entry answers
 * The sleep date is the night the person went to bed
 */
export function determineSleepDate(answers: DiaryAnswers): string {
  // When filling out in the morning, we're reporting on last night
  // So the sleep date is yesterday
  const today = new Date()
  today.setDate(today.getDate() - 1)
  return today.toISOString().split('T')[0]
}

/**
 * Parse time strings and handle overnight logic
 * TTB and TTS are on the sleep date
 * TFA and TOB might be on the next day
 */
export function parseAllTimes(
  sleepDate: string,
  answers: DiaryAnswers
): { ttb: Date; tts: Date; tfa: Date; tob: Date } {
  const ttbHours = parseInt(answers.q1_ttb.split(':')[0])
  const ttsHours = parseInt(answers.q2_tts.split(':')[0])
  const tfaHours = parseInt(answers.q9_tfa.split(':')[0])
  const tobHours = parseInt(answers.q13_tob.split(':')[0])

  // TTB: If time is in the morning (before noon), it's on the next day
  const ttbNextDay = ttbHours < 12
  const ttb = parseTimeForDate(sleepDate, answers.q1_ttb, ttbNextDay)

  // TTS: Same logic as TTB
  const ttsNextDay = ttsHours < 12
  const tts = parseTimeForDate(sleepDate, answers.q2_tts, ttsNextDay)

  // TFA: Morning times are on the next day (common case)
  // If TFA time is in morning hours (before noon), it's next day
  const tfaNextDay = tfaHours < 12
  const tfa = parseTimeForDate(sleepDate, answers.q9_tfa, tfaNextDay)

  // TOB: Same logic as TFA
  const tobNextDay = tobHours < 12
  const tob = parseTimeForDate(sleepDate, answers.q13_tob, tobNextDay)

  return { ttb, tts, tfa, tob }
}

/**
 * Calculate all sleep metrics from diary answers
 */
export function calculateSleepMetrics(answers: DiaryAnswers): SleepMetrics {
  const sleepDate = determineSleepDate(answers)
  const { ttb, tts, tfa, tob } = parseAllTimes(sleepDate, answers)

  // Sleep Onset Latency
  const sol = answers.q3_fell_asleep_quickly ? 5 : (answers.q4_sol ?? 0)
  const sol_out_of_bed = answers.q3_fell_asleep_quickly ? 0 : (answers.q5_sol_out ?? 0)

  // Convert awakening MCQ value to actual count
  const awakenings = AWAKENING_VALUE_MAP[answers.q6_awakenings] ?? 0

  // Wake After Sleep Onset
  const waso = awakenings > 0 ? (answers.q7_waso ?? 0) : 0
  const waso_out_of_bed = awakenings > 0 ? (answers.q8_waso_out ?? 0) : 0

  // Early Morning Awakening
  const ema = answers.q10_woke_early ? (answers.q11_ema ?? 0) : 0
  const ema_out_of_bed = answers.q10_woke_early ? (answers.q12_ema_out ?? 0) : 0

  // Total Wake Time
  const twt = sol + waso + ema
  const twt_out = sol_out_of_bed + waso_out_of_bed + ema_out_of_bed

  // Time in Bed (from tts to tfa + ema)
  // TIB = (TFA - TTS) + EMA in minutes
  const tfaMinusTts = (tfa.getTime() - tts.getTime()) / (1000 * 60)
  const tib = tfaMinusTts + ema

  // Total Sleep Time
  const tst = Math.max(0, tib - twt)

  // Sleep Efficiency
  const se = tib > 0 ? Math.round((tst / tib) * 100) : 0

  return {
    ttb,
    tts,
    tfa,
    tob,
    sol,
    sol_out_of_bed,
    awakenings,
    waso,
    waso_out_of_bed,
    ema,
    ema_out_of_bed,
    quality_rating: answers.q14_quality,
    tib: Math.round(tib),
    twt,
    twt_out,
    tst: Math.round(tst),
    se
  }
}

/**
 * Prepare diary entry data for database insertion
 */
export function prepareDiaryEntry(answers: DiaryAnswers): DiaryEntryData {
  const sleepDate = determineSleepDate(answers)
  const metrics = calculateSleepMetrics(answers)

  return {
    date: sleepDate,
    ttb: metrics.ttb.toISOString(),
    tts: metrics.tts.toISOString(),
    tfa: metrics.tfa.toISOString(),
    tob: metrics.tob.toISOString(),
    sol: metrics.sol,
    sol_out_of_bed: metrics.sol_out_of_bed,
    awakenings: metrics.awakenings,
    waso: metrics.waso,
    waso_out_of_bed: metrics.waso_out_of_bed,
    ema: metrics.ema,
    ema_out_of_bed: metrics.ema_out_of_bed,
    quality_rating: metrics.quality_rating,
    answers
  }
}

/**
 * Format duration in minutes to a human-readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return `${hours}h`
  }
  return `${hours}h ${mins}m`
}

/**
 * Format time for display (12-hour format)
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

/**
 * Calculate sleep efficiency color based on percentage
 */
export function getSleepEfficiencyColor(se: number): string {
  if (se >= 85) return 'text-green-600'
  if (se >= 70) return 'text-amber-600'
  return 'text-red-600'
}

/**
 * Validate time ordering
 */
export function validateTimeOrder(
  answers: DiaryAnswers
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const sleepDate = determineSleepDate(answers)

  try {
    const { ttb, tts, tfa, tob } = parseAllTimes(sleepDate, answers)

    // TTB should be before or equal to TTS
    if (tts < ttb) {
      errors.push('Sleep attempt time cannot be before bed time')
    }

    // TTS should be before TFA
    if (tfa <= tts) {
      errors.push('Wake time must be after sleep time')
    }

    // TFA should be before or equal to TOB
    if (tob < tfa) {
      errors.push('Out of bed time cannot be before wake time')
    }

    // Check for unreasonably long times
    const tibMinutes = (tob.getTime() - ttb.getTime()) / (1000 * 60)
    if (tibMinutes > 1440) { // More than 24 hours
      errors.push('Time in bed cannot exceed 24 hours')
    }
    if (tibMinutes < 0) {
      errors.push('Invalid time sequence')
    }
  } catch {
    errors.push('Invalid time format')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Validate out-of-bed times don't exceed total times
 */
export function validateOutOfBedTimes(answers: DiaryAnswers): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // SOL out of bed cannot exceed SOL
  if (!answers.q3_fell_asleep_quickly && answers.q4_sol && answers.q5_sol_out) {
    if (answers.q5_sol_out > answers.q4_sol) {
      errors.push('Out of bed time cannot exceed total time to fall asleep')
    }
  }

  // WASO out of bed cannot exceed WASO
  if (answers.q6_awakenings > 0 && answers.q7_waso && answers.q8_waso_out) {
    if (answers.q8_waso_out > answers.q7_waso) {
      errors.push('Out of bed time cannot exceed total wake time during night')
    }
  }

  // EMA out of bed cannot exceed EMA
  if (answers.q10_woke_early && answers.q11_ema && answers.q12_ema_out) {
    if (answers.q12_ema_out > answers.q11_ema) {
      errors.push('Out of bed time cannot exceed total early wake time')
    }
  }

  return { valid: errors.length === 0, errors }
}
