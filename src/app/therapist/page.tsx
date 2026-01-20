import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function TherapistDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get patient counts by status
  const { data: patients } = await supabase
    .from('patients')
    .select('id, name, email, status, current_session, updated_at')
    .eq('therapist_id', user!.id)
    .order('updated_at', { ascending: false })

  const activePatients = patients?.filter(p => p.status === 'active' || p.status === 'baseline') || []
  const invitedPatients = patients?.filter(p => p.status === 'invited') || []

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">Overview of your patients and their progress</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-sm text-slate-600">Active Patients</p>
          <p className="text-3xl font-semibold text-slate-900 mt-1">{activePatients.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-sm text-slate-600">Pending Invitations</p>
          <p className="text-3xl font-semibold text-slate-900 mt-1">{invitedPatients.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-sm text-slate-600">Total Patients</p>
          <p className="text-3xl font-semibold text-slate-900 mt-1">{patients?.length || 0}</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
        <h2 className="text-lg font-medium text-slate-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/therapist/patients/invite"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Invite Patient
          </Link>
          <Link
            href="/therapist/patients"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition"
          >
            View All Patients
          </Link>
        </div>
      </div>

      {/* Recent patients */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-medium text-slate-900">Recent Patients</h2>
        </div>
        {activePatients.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No active patients yet</h3>
            <p className="text-slate-600 mb-4">Get started by inviting your first patient</p>
            <Link
              href="/therapist/patients/invite"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
            >
              Invite Patient
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {activePatients.slice(0, 5).map((patient) => (
              <Link
                key={patient.id}
                href={`/therapist/patients/${patient.id}`}
                className="flex items-center justify-between p-4 hover:bg-slate-50 transition"
              >
                <div>
                  <p className="font-medium text-slate-900">{patient.name}</p>
                  <p className="text-sm text-slate-500">{patient.email}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    patient.status === 'baseline'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {patient.status === 'baseline' ? 'Baseline' : `Session ${patient.current_session}`}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
