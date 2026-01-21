'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ISIEntryFormProps {
  patientId: string
  onComplete: () => void
  onCancel: () => void
}

const ISI_QUESTIONS = [
  {
    id: 1,
    question: 'Difficulty falling asleep',
    options: [
      { value: 0, label: 'None' },
      { value: 1, label: 'Mild' },
      { value: 2, label: 'Moderate' },
      { value: 3, label: 'Severe' },
      { value: 4, label: 'Very Severe' },
    ],
  },
  {
    id: 2,
    question: 'Difficulty staying asleep',
    options: [
      { value: 0, label: 'None' },
      { value: 1, label: 'Mild' },
      { value: 2, label: 'Moderate' },
      { value: 3, label: 'Severe' },
      { value: 4, label: 'Very Severe' },
    ],
  },
  {
    id: 3,
    question: 'Problems waking up too early',
    options: [
      { value: 0, label: 'None' },
      { value: 1, label: 'Mild' },
      { value: 2, label: 'Moderate' },
      { value: 3, label: 'Severe' },
      { value: 4, label: 'Very Severe' },
    ],
  },
  {
    id: 4,
    question: 'How satisfied/dissatisfied are you with your current sleep pattern?',
    options: [
      { value: 0, label: 'Very Satisfied' },
      { value: 1, label: 'Satisfied' },
      { value: 2, label: 'Moderately Satisfied' },
      { value: 3, label: 'Dissatisfied' },
      { value: 4, label: 'Very Dissatisfied' },
    ],
  },
  {
    id: 5,
    question: 'How noticeable to others do you think your sleep problem is in terms of impairing the quality of your life?',
    options: [
      { value: 0, label: 'Not at all Noticeable' },
      { value: 1, label: 'A Little' },
      { value: 2, label: 'Somewhat' },
      { value: 3, label: 'Much' },
      { value: 4, label: 'Very Much Noticeable' },
    ],
  },
  {
    id: 6,
    question: 'How worried/distressed are you about your current sleep problem?',
    options: [
      { value: 0, label: 'Not at all Worried' },
      { value: 1, label: 'A Little' },
      { value: 2, label: 'Somewhat' },
      { value: 3, label: 'Much' },
      { value: 4, label: 'Very Much Worried' },
    ],
  },
  {
    id: 7,
    question: 'To what extent do you consider your sleep problem to interfere with your daily functioning currently?',
    options: [
      { value: 0, label: 'Not at all Interfering' },
      { value: 1, label: 'A Little' },
      { value: 2, label: 'Somewhat' },
      { value: 3, label: 'Much' },
      { value: 4, label: 'Very Much Interfering' },
    ],
  },
]

const ASSESSMENT_TYPES = [
  { value: 'intake', label: 'Intake (Initial)' },
  { value: 'mid_treatment', label: 'Mid-Treatment' },
  { value: 'discharge', label: 'Discharge (End)' },
  { value: 'follow_up', label: 'Follow-up' },
]

export function ISIEntryForm({ patientId, onComplete, onCancel }: ISIEntryFormProps) {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [assessmentType, setAssessmentType] = useState('mid_treatment')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const totalScore = Object.values(answers).reduce((sum, val) => sum + val, 0)
  const allAnswered = Object.keys(answers).length === 7

  const getSeverityLabel = (score: number): string => {
    if (score <= 7) return 'No clinically significant insomnia'
    if (score <= 14) return 'Subthreshold insomnia'
    if (score <= 21) return 'Clinical insomnia (moderate severity)'
    return 'Clinical insomnia (severe)'
  }

  const getSeverityColor = (score: number): string => {
    if (score <= 7) return 'text-green-600'
    if (score <= 14) return 'text-amber-600'
    if (score <= 21) return 'text-orange-600'
    return 'text-red-600'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!allAnswered) return

    setSaving(true)
    setError(null)

    const answersArray = ISI_QUESTIONS.map(q => ({
      question: q.id,
      answer: answers[q.id],
    }))

    const { error: insertError } = await supabase
      .from('isi_scores')
      .insert({
        patient_id: patientId,
        date,
        score: totalScore,
        answers: answersArray,
        assessment_type: assessmentType,
      })

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    onComplete()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Assessment Type</label>
          <select
            value={assessmentType}
            onChange={(e) => setAssessmentType(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ASSESSMENT_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {ISI_QUESTIONS.map((q) => (
          <div key={q.id} className="p-4 bg-slate-50 rounded-xl">
            <p className="font-medium text-slate-900 mb-3">{q.id}. {q.question}</p>
            <div className="flex flex-wrap gap-2">
              {q.options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.value }))}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    answers[q.id] === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {opt.value} - {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Score display */}
      {allAnswered && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
          <p className="text-sm text-slate-600 mb-1">Total ISI Score</p>
          <p className={`text-3xl font-bold ${getSeverityColor(totalScore)}`}>{totalScore}</p>
          <p className={`text-sm ${getSeverityColor(totalScore)}`}>{getSeverityLabel(totalScore)}</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!allAnswered || saving}
          className="flex-1 py-3 px-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save ISI Score'}
        </button>
      </div>
    </form>
  )
}
