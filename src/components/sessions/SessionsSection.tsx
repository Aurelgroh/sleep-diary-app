'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Session {
  id: string
  patient_id: string
  therapist_id: string
  session_number: number
  date: string
  scheduled_time: string | null
  completed_at: string | null
  prescription_id: string | null
  notes: string | null
  titration_data: Record<string, unknown> | null
  created_at: string
}

interface SessionsSectionProps {
  patientId: string
  therapistId: string
  currentSession: number
  isTherapist: boolean
}

export function SessionsSection({ patientId, therapistId, currentSession, isTherapist }: SessionsSectionProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [newSessionDate, setNewSessionDate] = useState('')
  const [newSessionTime, setNewSessionTime] = useState('')
  const [newSessionNotes, setNewSessionNotes] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchSessions = async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('patient_id', patientId)
        .order('session_number', { ascending: true })

      if (!error && data) {
        setSessions(data as unknown as Session[])
      }
      setLoading(false)
    }

    fetchSessions()
  }, [patientId, supabase])

  const scheduleSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSessionDate || scheduling) return

    setScheduling(true)
    setError(null)

    if (editingSession) {
      // Update existing session
      const { data, error: updateError } = await supabase
        .from('sessions')
        .update({
          date: newSessionDate,
          scheduled_time: newSessionTime || null,
          notes: newSessionNotes || null
        })
        .eq('id', editingSession.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating session:', updateError)
        setError(`Failed to update session: ${updateError.message}`)
      } else if (data) {
        setSessions(prev => prev.map(s => s.id === editingSession.id ? data as unknown as Session : s))
        resetForm()
      }
    } else {
      // Create new session
      const nextSessionNumber = sessions.length > 0
        ? Math.max(...sessions.map(s => s.session_number)) + 1
        : 1

      const { data, error: insertError } = await supabase.from('sessions').insert({
        patient_id: patientId,
        therapist_id: therapistId,
        session_number: nextSessionNumber,
        date: newSessionDate,
        scheduled_time: newSessionTime || null,
        notes: newSessionNotes || null
      }).select().single()

      if (insertError) {
        console.error('Error creating session:', insertError)
        setError(`Failed to schedule session: ${insertError.message}`)
      } else if (data) {
        setSessions(prev => [...prev, data as unknown as Session])
        resetForm()
      }
    }
    setScheduling(false)
  }

  const resetForm = () => {
    setShowScheduleForm(false)
    setEditingSession(null)
    setNewSessionDate('')
    setNewSessionTime('')
    setNewSessionNotes('')
    setError(null)
  }

  const startEditing = (session: Session) => {
    setEditingSession(session)
    setNewSessionDate(session.date)
    setNewSessionTime(session.scheduled_time || '')
    setNewSessionNotes(session.notes || '')
    setShowScheduleForm(true)
  }

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return

    setDeleting(sessionId)
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId)

    if (!error) {
      setSessions(prev => prev.filter(s => s.id !== sessionId))
    }
    setDeleting(null)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return null
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  const isUpcoming = (dateStr: string) => {
    const sessionDate = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return sessionDate >= today
  }

  const upcomingSessions = sessions.filter(s => isUpcoming(s.date))
  const pastSessions = sessions.filter(s => !isUpcoming(s.date))

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Sessions</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {sessions.length > 0
              ? `${sessions.length} session${sessions.length > 1 ? 's' : ''} recorded`
              : 'No sessions scheduled yet'}
          </p>
        </div>
        {isTherapist && !showScheduleForm && (
          <button
            onClick={() => setShowScheduleForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Schedule Session
          </button>
        )}
      </div>

      {/* Schedule Form */}
      {showScheduleForm && (
        <div className="p-6 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-4">
            {editingSession ? 'Edit Session' : 'Schedule New Session'}
          </h3>
          <form onSubmit={scheduleSession} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Session Date
                </label>
                <input
                  type="date"
                  value={newSessionDate}
                  onChange={(e) => setNewSessionDate(e.target.value)}
                  min={editingSession ? undefined : new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Time (optional)
                </label>
                <input
                  type="time"
                  value={newSessionTime}
                  onChange={(e) => setNewSessionTime(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={newSessionNotes}
                onChange={(e) => setNewSessionNotes(e.target.value)}
                placeholder="Session agenda, topics to discuss..."
                rows={2}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={scheduling}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {scheduling ? 'Saving...' : (editingSession ? 'Save Changes' : 'Schedule')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Upcoming Sessions */}
        {upcomingSessions.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
              Upcoming
            </h3>
            <div className="space-y-3">
              {upcomingSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl"
                >
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    {session.session_number}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-slate-100">Session {session.session_number}</p>
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      {formatDate(session.date)}
                      {session.scheduled_time && (
                        <span className="ml-1">at {formatTime(session.scheduled_time)}</span>
                      )}
                    </p>
                    {session.notes && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{session.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Upcoming
                    </span>
                    {isTherapist && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEditing(session)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded transition"
                          title="Edit session"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteSession(session.id)}
                          disabled={deleting === session.id}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded transition disabled:opacity-50"
                          title="Delete session"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Past Sessions */}
        {pastSessions.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
              Completed
            </h3>
            <div className="space-y-3">
              {pastSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                    {session.session_number}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-slate-100">Session {session.session_number}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {formatDate(session.date)}
                      {session.scheduled_time && (
                        <span className="ml-1">at {formatTime(session.scheduled_time)}</span>
                      )}
                    </p>
                    {session.notes && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{session.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Completed
                    </span>
                    {isTherapist && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEditing(session)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition"
                          title="Edit session"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteSession(session.id)}
                          disabled={deleting === session.id}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded transition disabled:opacity-50"
                          title="Delete session"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {sessions.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">No sessions scheduled yet</p>
            {isTherapist && (
              <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Click "Schedule Session" to add one</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
