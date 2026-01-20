'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Json } from '@/lib/supabase/database.types'
import {
  QUESTIONS,
  CATEGORIES,
  shouldShowQuestion,
  type Question,
  type QuestionCategory
} from '@/lib/sleep-diary/questions'
import {
  prepareDiaryEntry,
  calculateSleepMetrics,
  formatDuration,
  formatTime,
  getSleepEfficiencyColor,
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
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    setAnswers(prev => ({ ...prev, [questionId]: value }))
    setError(null)
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
        return
      }

      // Validate out of bed times
      const outOfBedValidation = validateOutOfBedTimes(diaryAnswers)
      if (!outOfBedValidation.valid) {
        setError(outOfBedValidation.errors.join('. '))
        setIsSubmitting(false)
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
        return
      }

      // Success - redirect to diary page
      router.push('/patient/diary?success=true')
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setIsSubmitting(false)
    }
  }

  const renderQuestionInput = (question: Question) => {
    const value = answers[question.id]

    switch (question.inputType) {
      case 'time':
        return (
          <TimeInput
            value={value as string}
            onChange={(v) => updateAnswer(question.id, v)}
            error={error ?? undefined}
          />
        )

      case 'duration':
        return (
          <DurationInput
            value={value as number | undefined}
            onChange={(v) => updateAnswer(question.id, v)}
            minValue={question.validation?.minValue}
            error={error ?? undefined}
          />
        )

      case 'yes_no':
        return (
          <YesNoInput
            value={value as boolean | undefined}
            onChange={(v) => updateAnswer(question.id, v)}
            error={error ?? undefined}
          />
        )

      case 'mcq':
        return (
          <MultipleChoice
            value={value as number | undefined}
            onChange={(v) => updateAnswer(question.id, v)}
            options={question.options ?? []}
            error={error ?? undefined}
          />
        )

      case 'feeling':
        return (
          <FeelingScale
            value={value as number | undefined}
            onChange={(v) => updateAnswer(question.id, v)}
            error={error ?? undefined}
          />
        )

      default:
        return null
    }
  }

  // Summary view
  if (step === 'summary') {
    const diaryAnswers = answers as unknown as DiaryAnswers
    const metrics = calculateSleepMetrics(diaryAnswers)

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">Review Your Entry</h2>
          <p className="text-slate-600 mt-1">Make sure everything looks correct</p>
        </div>

        {/* Sleep Times Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Sleep Times</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500">Bed Time</p>
              <p className="font-medium">{formatTime(metrics.ttb)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Sleep Attempt</p>
              <p className="font-medium">{formatTime(metrics.tts)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Wake Time</p>
              <p className="font-medium">{formatTime(metrics.tfa)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Out of Bed</p>
              <p className="font-medium">{formatTime(metrics.tob)}</p>
            </div>
          </div>
        </div>

        {/* Wake Periods Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Wake Periods</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">Time to fall asleep</span>
              <span className="font-medium">{formatDuration(metrics.sol)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Night awakenings</span>
              <span className="font-medium">{metrics.awakenings} times</span>
            </div>
            {metrics.waso > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Time awake during night</span>
                <span className="font-medium">{formatDuration(metrics.waso)}</span>
              </div>
            )}
            {metrics.ema > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Woke early by</span>
                <span className="font-medium">{formatDuration(metrics.ema)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Calculated Metrics Card */}
        <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Your Sleep Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-white rounded-xl">
              <p className="text-xs text-slate-500">Time in Bed</p>
              <p className="text-2xl font-bold text-slate-900">{formatDuration(metrics.tib)}</p>
            </div>
            <div className="text-center p-4 bg-white rounded-xl">
              <p className="text-xs text-slate-500">Total Sleep</p>
              <p className="text-2xl font-bold text-slate-900">{formatDuration(metrics.tst)}</p>
            </div>
            <div className="text-center p-4 bg-white rounded-xl">
              <p className="text-xs text-slate-500">Time Awake</p>
              <p className="text-2xl font-bold text-slate-900">{formatDuration(metrics.twt)}</p>
            </div>
            <div className="text-center p-4 bg-white rounded-xl">
              <p className="text-xs text-slate-500">Sleep Efficiency</p>
              <p className={`text-2xl font-bold ${getSleepEfficiencyColor(metrics.se)}`}>
                {metrics.se}%
              </p>
            </div>
          </div>
        </div>

        {/* Quality Rating */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
          <p className="text-sm text-slate-500 mb-2">Morning Feeling</p>
          <p className="text-3xl">
            {metrics.quality_rating === 1 && '😫'}
            {metrics.quality_rating === 2 && '😴'}
            {metrics.quality_rating === 3 && '😐'}
            {metrics.quality_rating === 4 && '😊'}
            {metrics.quality_rating === 5 && '🌟'}
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="flex-1 py-4 px-6 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
          >
            Edit Answers
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-4 px-6 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
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
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Already Logged Today</h2>
          <p className="text-slate-600 mt-2">
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
        <div className="flex justify-between text-sm text-slate-500">
          <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Category Header */}
      {currentCategory && (
        <div className="bg-slate-50 rounded-xl p-4">
          <h3 className="font-semibold text-slate-900">{currentCategory.title}</h3>
          <p className="text-sm text-slate-500">{currentCategory.description}</p>
        </div>
      )}

      {/* Question */}
      {currentQuestion && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900">{currentQuestion.question}</h2>

          {currentQuestion.helperText && (
            <p className="text-sm text-slate-500">{currentQuestion.helperText}</p>
          )}

          {renderQuestionInput(currentQuestion)}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-4 pt-4">
        {currentQuestionIndex > 0 && (
          <button
            type="button"
            onClick={handleBack}
            className="flex-1 py-4 px-6 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
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
