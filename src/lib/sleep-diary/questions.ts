// Sleep Diary Question Configuration

export type QuestionType = 'time' | 'yes_no' | 'duration' | 'mcq' | 'feeling'

export type QuestionCategory = 'going_to_bed' | 'middle_of_night' | 'waking_up'

export interface ConditionalLogic {
  dependsOn: string
  showWhen: string | number | boolean
}

export interface QuestionOption {
  value: string | number
  label: string
}

export interface Question {
  id: string
  category: QuestionCategory
  question: string
  inputType: QuestionType
  conditional?: ConditionalLogic
  options?: QuestionOption[]
  validation?: {
    required?: boolean
    minValue?: number
    maxValue?: number
  }
  helperText?: string
}

export const CATEGORIES: { id: QuestionCategory; title: string; description: string }[] = [
  {
    id: 'going_to_bed',
    title: 'Going to Bed',
    description: 'Tell us about when you went to bed last night'
  },
  {
    id: 'middle_of_night',
    title: 'Middle of the Night',
    description: 'Tell us about any awakenings during the night'
  },
  {
    id: 'waking_up',
    title: 'Waking Up',
    description: 'Tell us about your morning'
  }
]

export const AWAKENING_OPTIONS: QuestionOption[] = [
  { value: 0, label: '0 times' },
  { value: 1, label: '1-2 times' },
  { value: 2, label: '3-4 times' },
  { value: 3, label: '5-6 times' },
  { value: 4, label: '7-8 times' },
  { value: 5, label: '9-10 times' },
  { value: 6, label: '11+ times' }
]

// Maps the MCQ value to approximate awakening count for storage
export const AWAKENING_VALUE_MAP: Record<number, number> = {
  0: 0,
  1: 2,   // 1-2 -> 2
  2: 4,   // 3-4 -> 4
  3: 6,   // 5-6 -> 6
  4: 8,   // 7-8 -> 8
  5: 10,  // 9-10 -> 10
  6: 11   // 11+ -> 11
}

export const FEELING_OPTIONS: QuestionOption[] = [
  { value: 1, label: 'Very Tired' },
  { value: 2, label: 'Tired' },
  { value: 3, label: 'Okay' },
  { value: 4, label: 'Rested' },
  { value: 5, label: 'Very Rested' }
]

export const QUESTIONS: Question[] = [
  // Category 1: Going to Bed
  {
    id: 'q1_ttb',
    category: 'going_to_bed',
    question: 'What time did you go to bed?',
    inputType: 'time',
    validation: { required: true },
    helperText: 'The time you got into bed'
  },
  {
    id: 'q2_tts',
    category: 'going_to_bed',
    question: 'What time did you try to go to sleep?',
    inputType: 'time',
    validation: { required: true },
    helperText: 'The time you turned off the lights and tried to sleep'
  },
  {
    id: 'q3_fell_asleep_quickly',
    category: 'going_to_bed',
    question: 'Did you fall asleep within 5 minutes?',
    inputType: 'yes_no',
    validation: { required: true }
  },
  {
    id: 'q4_sol',
    category: 'going_to_bed',
    question: 'How long did it take you to fall asleep?',
    inputType: 'duration',
    conditional: {
      dependsOn: 'q3_fell_asleep_quickly',
      showWhen: false
    },
    validation: { required: true, minValue: 5 },
    helperText: 'Sleep onset latency (SOL)'
  },
  {
    id: 'q5_sol_out',
    category: 'going_to_bed',
    question: 'Of that time, how long were you out of bed?',
    inputType: 'duration',
    conditional: {
      dependsOn: 'q3_fell_asleep_quickly',
      showWhen: false
    },
    validation: { required: true, minValue: 0 },
    helperText: 'Time spent out of bed practicing stimulus control'
  },

  // Category 2: Middle of the Night
  {
    id: 'q6_awakenings',
    category: 'middle_of_night',
    question: 'How many times did you wake up during the night?',
    inputType: 'mcq',
    options: AWAKENING_OPTIONS,
    validation: { required: true }
  },
  {
    id: 'q7_waso',
    category: 'middle_of_night',
    question: 'In total, how long were you awake during those {awakenings} times?',
    inputType: 'duration',
    conditional: {
      dependsOn: 'q6_awakenings',
      showWhen: 1 // Show when awakenings > 0 (value >= 1)
    },
    validation: { required: true, minValue: 0 },
    helperText: 'Wake after sleep onset (WASO)'
  },
  {
    id: 'q8_waso_out',
    category: 'middle_of_night',
    question: 'Of that time, how long were you out of bed?',
    inputType: 'duration',
    conditional: {
      dependsOn: 'q6_awakenings',
      showWhen: 1
    },
    validation: { required: true, minValue: 0 },
    helperText: 'Time spent out of bed practicing stimulus control'
  },

  // Category 3: Waking Up
  {
    id: 'q9_tfa',
    category: 'waking_up',
    question: 'At what time did you wake up this morning?',
    inputType: 'time',
    validation: { required: true },
    helperText: 'Your final awakening time'
  },
  {
    id: 'q10_woke_early',
    category: 'waking_up',
    question: 'Did you wake up earlier than you wanted?',
    inputType: 'yes_no',
    validation: { required: true }
  },
  {
    id: 'q11_ema',
    category: 'waking_up',
    question: 'How much earlier did you wake up?',
    inputType: 'duration',
    conditional: {
      dependsOn: 'q10_woke_early',
      showWhen: true
    },
    validation: { required: true, minValue: 5 },
    helperText: 'Early morning awakening (EMA)'
  },
  {
    id: 'q12_ema_out',
    category: 'waking_up',
    question: 'Of that time, how long were you out of bed?',
    inputType: 'duration',
    conditional: {
      dependsOn: 'q10_woke_early',
      showWhen: true
    },
    validation: { required: true, minValue: 0 },
    helperText: 'Time spent out of bed practicing stimulus control'
  },
  {
    id: 'q13_tob',
    category: 'waking_up',
    question: 'What time did you get out of bed?',
    inputType: 'time',
    validation: { required: true },
    helperText: 'The time you got out of bed for the day'
  },
  {
    id: 'q14_quality',
    category: 'waking_up',
    question: 'How do you feel this morning?',
    inputType: 'feeling',
    options: FEELING_OPTIONS,
    validation: { required: true }
  }
]

// Get questions by category
export function getQuestionsByCategory(category: QuestionCategory): Question[] {
  return QUESTIONS.filter(q => q.category === category)
}

// Check if a question should be shown based on conditional logic
export function shouldShowQuestion(
  question: Question,
  answers: Record<string, unknown>
): boolean {
  if (!question.conditional) return true

  const { dependsOn, showWhen } = question.conditional
  const dependentAnswer = answers[dependsOn]

  // For awakening count, show if value >= showWhen
  if (dependsOn === 'q6_awakenings') {
    return typeof dependentAnswer === 'number' && dependentAnswer >= (showWhen as number)
  }

  return dependentAnswer === showWhen
}

// Get all visible questions based on current answers
export function getVisibleQuestions(answers: Record<string, unknown>): Question[] {
  return QUESTIONS.filter(q => shouldShowQuestion(q, answers))
}

// Validate a single answer
export function validateAnswer(
  question: Question,
  value: unknown
): { valid: boolean; error?: string } {
  if (question.validation?.required && (value === undefined || value === null || value === '')) {
    return { valid: false, error: 'This field is required' }
  }

  if (question.inputType === 'duration' && typeof value === 'number') {
    if (question.validation?.minValue !== undefined && value < question.validation.minValue) {
      return { valid: false, error: `Minimum value is ${question.validation.minValue} minutes` }
    }
    if (question.validation?.maxValue !== undefined && value > question.validation.maxValue) {
      return { valid: false, error: `Maximum value is ${question.validation.maxValue} minutes` }
    }
  }

  return { valid: true }
}

// Validate all answers for a category
export function validateCategory(
  category: QuestionCategory,
  answers: Record<string, unknown>
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  const questions = getQuestionsByCategory(category)

  for (const question of questions) {
    if (!shouldShowQuestion(question, answers)) continue

    const result = validateAnswer(question, answers[question.id])
    if (!result.valid && result.error) {
      errors[question.id] = result.error
    }
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

// Default times for time questions (24-hour format "HH:MM")
export const DEFAULT_TIMES: Record<string, string> = {
  'q1_ttb': '22:00',   // Bed time: 10 PM
  'q2_tts': '22:30',   // Sleep attempt: 10:30 PM
  'q9_tfa': '06:30',   // Wake time: 6:30 AM
  'q13_tob': '07:00',  // Out of bed: 7 AM
}

// Get dynamic question text with placeholders replaced
export function getDynamicQuestionText(
  question: Question,
  answers: Record<string, unknown>
): string {
  let text = question.question

  // Replace {awakenings} placeholder with actual value
  if (text.includes('{awakenings}')) {
    const awakeningValue = answers['q6_awakenings']
    if (typeof awakeningValue === 'number') {
      const awakeningLabel = AWAKENING_OPTIONS.find(o => o.value === awakeningValue)?.label || ''
      // Extract just the number part (e.g., "1-2 times" -> "1-2")
      const awakeningCount = awakeningLabel.replace(' times', '')
      text = text.replace('{awakenings}', awakeningCount)
    }
  }

  return text
}

// Inline validation for time questions (warns during entry)
export function validateTimeAgainstPrevious(
  questionId: string,
  value: string,
  answers: Record<string, unknown>
): { warning?: string } {
  if (!value) return {}

  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }

  const currentTime = parseTime(value)

  switch (questionId) {
    case 'q2_tts': {
      // Sleep attempt should be at or after bed time, but warn if > 2 hours later
      const bedTime = answers['q1_ttb'] as string
      if (bedTime) {
        const bedMinutes = parseTime(bedTime)
        let diff = currentTime - bedMinutes
        if (diff < 0) diff += 24 * 60 // Handle overnight
        if (diff > 120) {
          return { warning: 'This is more than 2 hours after getting into bed' }
        }
      }
      break
    }
    case 'q9_tfa': {
      // Wake time should be after sleep attempt
      const sleepTime = answers['q2_tts'] as string
      if (sleepTime) {
        const sleepMinutes = parseTime(sleepTime)
        let diff = currentTime - sleepMinutes
        // Adjust for overnight (assuming wake is next day if it appears earlier)
        if (diff < 0) diff += 24 * 60
        if (diff < 60) {
          return { warning: 'This seems very soon after trying to sleep' }
        }
      }
      break
    }
    case 'q13_tob': {
      // Out of bed should be at or after wake time
      const wakeTime = answers['q9_tfa'] as string
      if (wakeTime) {
        const wakeMinutes = parseTime(wakeTime)
        let diff = currentTime - wakeMinutes
        if (diff < 0 && diff > -60) {
          return { warning: 'Out of bed time appears to be before wake time' }
        }
      }
      break
    }
  }

  return {}
}
