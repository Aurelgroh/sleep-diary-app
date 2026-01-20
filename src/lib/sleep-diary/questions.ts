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
    question: 'In total, how long were you awake during those times?',
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
    question: 'What time did you wake up for the last time?',
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
