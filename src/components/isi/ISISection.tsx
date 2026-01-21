'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ISIEntryForm } from './ISIEntryForm'

interface ISIScore {
  id: string
  date: string
  score: number
  assessment_type: string
  created_at: string
}

interface ISISectionProps {
  patientId: string
}

function getSeverityLabel(score: number): string {
  if (score <= 7) return 'No Insomnia'
  if (score <= 14) return 'Subthreshold'
  if (score <= 21) return 'Moderate'
  return 'Severe'
}

function getSeverityBadgeClass(score: number): string {
  if (score <= 7) return 'bg-green-100 text-green-700'
  if (score <= 14) return 'bg-amber-100 text-amber-700'
  if (score <= 21) return 'bg-orange-100 text-orange-700'
  return 'bg-red-100 text-red-700'
}

function formatAssessmentType(type: string): string {
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export function ISISection({ patientId }: ISISectionProps) {
  const [scores, setScores] = useState<ISIScore[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const supabase = createClient()

  const fetchScores = async () => {
    const { data, error } = await supabase
      .from('isi_scores')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false })

    if (!error && data) {
      setScores(data as ISIScore[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchScores()
  }, [patientId, supabase])

  const handleComplete = () => {
    setShowForm(false)
    fetchScores()
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Insomnia Severity Index (ISI)</h2>
          <p className="text-sm text-slate-500">
            {scores.length > 0 ? `${scores.length} assessment${scores.length > 1 ? 's' : ''}` : 'No assessments yet'}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add ISI Assessment
          </button>
        )}
      </div>

      {showForm && (
        <div className="p-6 bg-slate-50 border-b border-slate-200">
          <h3 className="font-medium text-slate-900 mb-4">New ISI Assessment</h3>
          <ISIEntryForm
            patientId={patientId}
            onComplete={handleComplete}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <div className="p-6">
        {scores.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-slate-500 text-sm">No ISI assessments recorded</p>
            <p className="text-slate-400 text-xs mt-1">Click &quot;Add ISI Assessment&quot; to record one</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scores.map((score) => (
              <div
                key={score.id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {new Date(score.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-sm text-slate-500">{formatAssessmentType(score.assessment_type)}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">{score.score}</p>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getSeverityBadgeClass(score.score)}`}>
                    {getSeverityLabel(score.score)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
