'use client'

import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Json } from '@/lib/supabase/database.types'
import {
  QUESTIONS,
  CATEGORIES,
  shouldShowQuestion,
  getDynamicQuestionText,
  DEFAULT_TIMES,
  validateTimeAgainstPrevious,
  type Question,
  type QuestionCategory
} from '@/lib/sleep-diary/questions'
import {
  prepareDiaryEntry,
  validateTimeOrder,
  validateOutOfBedTimes,
  type DiaryAnswers
} from '@/lib/sleep-diary/calculations'
import { TimeInput } from './TimeInput'
import { DurationInput } from './DurationInput'
import { YesNoInput } from './YesNoInput'
import { MultipleChoice } from './MultipleChoice'
import { FeelingScale } from './FeelingScale'

interface DiaryEntryFormProps {
  patientId: string
  existingEntry?: boolean
}

type FormStep = 'questions' | 'summary'

export function DiaryEntryForm({ patientId, existingEntry }: DiaryEntryFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [step, setStep] = useState<FormStep>('questions')
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Ref to prevent duplicate submissions from rapid clicks
  const submissionInProgress = useRef(false)

  // Get visible questions based on current answers
  const visibleQuestions = useMemo(() => {
    return QUESTIONS.filter(q => shouldShowQuestion(q, answers))
  }, [answers])

  const currentQuestion = visibleQuestions[currentQuestionIndex]
  const totalQuestions = visibleQuestions.length
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100

  // Get current category
  const currentCategory = currentQuestion
    ? CATEGORIES.find(c => c.id === currentQuestion.category)
    : null

  const updateAnswer = (questionId: string, value: unknown) => {
    const newAnswers = { ...answers, [questionId]: value }
    setAnswers(newAnswers)
    setError(null)

    // Check for inline validation warnings on time inputs
    if (typeof value === 'string' && currentQuestion?.inputType === 'time') {
      const validation = validateTimeAgainstPrevious(questionId, value, newAnswers)
      setWarning(validation.warning || null)
    } else {
      setWarning(null)
    }
  }

  const validateCurrentAnswer = (): boolean => {
    if (!currentQuestion) return true

    const value = answers[currentQuestion.id]

    if (currentQuestion.validation?.required) {
      if (value === undefined || value === null || value === '') {
        setError('Please answer this question')
        return false
      }
    }

    return true
  }

  const handleNext = () => {
    if (!validateCurrentAnswer()) return

    // Recalculate visible questions after answer
    const newVisibleQuestions = QUESTIONS.filter(q => shouldShowQuestion(q, answers))
    const newIndex = currentQuestionIndex + 1

    if (newIndex >= newVisibleQuestions.length) {
      // All questions answered, go to summary
      setStep('summary')
    } else {
      setCurrentQuestionIndex(newIndex)
    }
  }

  const handleBack = () => {
    if (step === 'summary') {
      setStep('questions')
      return
    }

    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleSubmit = async () => {
    // Prevent duplicate submissions using ref (handles rapid clicks before state updates)
    if (submissionInProgress.current || isSubmitting) {
      return
    }
    submissionInProgress.current = true
    setIsSubmitting(true)
    setError(null)

    try {
      // Validate all answers
      const diaryAnswers = answers as unknown as DiaryAnswers

      // Validate time ordering
      const timeValidation = validateTimeOrder(diaryAnswers)
      if (!timeValidation.valid) {
        setError(timeValidation.errors.join('. '))
        setIsSubmitting(false)
        submissionInProgress.current = false
        return
      }

      // Validate out of bed times
      const outOfBedValidation = validateOutOfBedTimes(diaryAnswers)
      if (!outOfBedValidation.valid) {
        setError(outOfBedValidation.errors.join('. '))
        setIsSubmitting(false)
        submissionInProgress.current = false
        return
      }

      // Prepare entry data
      const entryData = prepareDiaryEntry(diaryAnswers)

      // Insert into database
      const { error: insertError } = await supabase
        .from('diary_entries')
        .insert({
          patient_id: patientId,
          date: entryData.date,
          ttb: entryData.ttb,
          tts: entryData.tts,
          tfa: entryData.tfa,
          tob: entryData.tob,
          sol: entryData.sol,
          sol_out_of_bed: entryData.sol_out_of_bed,
          awakenings: entryData.awakenings,
          waso: entryData.waso,
          waso_out_of_bed: entryData.waso_out_of_bed,
          ema: entryData.ema,
          ema_out_of_bed: entryData.ema_out_of_bed,
          quality_rating: entryData.quality_rating,
          answers: entryData.answers as unknown as Json
        })

      if (insertError) {
        if (insertError.code === '23505') {
          setError('You have already logged sleep for this date')
        } else {
          setError(insertError.message)
        }
        setIsSubmitting(false)
        submissionInProgress.current = false
        return
      }

      // Success - redirect to diary page (don't reset submissionInProgress to prevent re-submission)
      router.push('/patient/diary?success=true')
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setIsSubmitting(false)
      submissionInProgress.current = false
    }
  }

  const renderQuestionInput = (question: Question) => {
    const value = answers[question.id]

    switch (question.inputType) {
      case 'time':
        return (
          <TimeInput
            key={question.id}
            value={value as string}
            onChange={(v) => updateAnswer(question.id, v)}
            defaultTime={DEFAULT_TIMES[question.id]}
            error={error ?? undefined}
          />
        )

      case 'duration':
        return (
          <DurationInput
            key={question.id}
            value={value as number | undefined}
            onChange={(v) => updateAnswer(question.id, v)}
            minValue={question.validation?.minValue}
            error={error ?? undefined}
          />
        )

      case 'yes_no':
        return (
          <YesNoInput
            key={question.id}
            value={value as boolean | undefined}
            onChange={(v) => updateAnswer(question.id, v)}
            error={error ?? undefined}
          />
        )

      case 'mcq':
        return (
          <MultipleChoice
            key={question.id}
            value={value as number | undefined}
            onChange={(v) => updateAnswer(question.id, v)}
            options={question.options ?? []}
            error={error ?? undefined}
          />
        )

      case 'feeling':
        return (
          <FeelingScale
            key={question.id}
            value={value as number | undefined}
            onChange={(v) => updateAnswer(question.id, v)}
            error={error ?? undefined}
          />
        )

      default:
        return null
    }
  }

  // Summary view - simplified to just show confirmation
  if (step === 'summary') {
    return (
      <div className="space-y-6">
        {/* Congratulations header */}
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Ready to Submit!</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Your sleep diary entry is ready to be saved.
          </p>
          <p className="text-slate-500 dark:text-slate-500 text-sm mt-1">
            Your therapist will review your progress.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="flex-1 py-4 px-6 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Edit Answers
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-4 px-6 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Entry'}
          </button>
        </div>
      </div>
    )
  }

  // Already logged today warning
  if (existingEntry) {
    return (
      <div className="text-center py-12 space-y-6">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Already Logged Today</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            You&apos;ve already recorded your sleep for last night.
          </p>
        </div>
        <button
          onClick={() => router.push('/patient/diary')}
          className="py-3 px-6 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
        >
          View Diary History
        </button>
      </div>
    )
  }

  // Question view
  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Category Header */}
      {currentCategory && (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">{currentCategory.title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{currentCategory.description}</p>
        </div>
      )}

      {/* Question */}
      {currentQuestion && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {getDynamicQuestionText(currentQuestion, answers)}
          </h2>

          {currentQuestion.helperText && (
            <p className="text-sm text-slate-500 dark:text-slate-400">{currentQuestion.helperText}</p>
          )}

          {renderQuestionInput(currentQuestion)}

          {/* Inline validation warning */}
          {warning && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl">
              <p className="text-amber-700 dark:text-amber-300 text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {warning}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-4 pt-4">
        {currentQuestionIndex > 0 && (
          <button
            type="button"
            onClick={handleBack}
            className="flex-1 py-4 px-6 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={handleNext}
          disabled={answers[currentQuestion?.id] === undefined}
          className="flex-1 py-4 px-6 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {currentQuestionIndex === totalQuestions - 1 ? 'Review' : 'Next'}
        </button>
      </div>
    </div>
  )
}
