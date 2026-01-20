import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

type PatientOrInvite = {
  id: string
  name: string
  email: string
  status: string
  current_session?: number
  created_at: string
  expires_at?: string
  isInvitation?: boolean
}

export default async function PatientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [patientsResult, invitationsResult] = await Promise.all([
    supabase
      .from('patients')
      .select('*')
      .eq('therapist_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('invitations')
      .select('*')
      .eq('therapist_id', user!.id)
      .order('created_at', { ascending: false }),
  ])

  const patients = patientsResult.data || []
  const invitations = invitationsResult.data || []

  const allItems: PatientOrInvite[] = [
    ...invitations.map((inv) => ({
      id: inv.id,
      name: inv.name,
      email: inv.email,
      status: 'pending',
      created_at: inv.created_at,
      expires_at: inv.expires_at,
      isInvitation: true,
    })),
    ...patients.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      status: p.status,
      current_session: p.current_session,
      created_at: p.created_at,
      isInvitation: false,
    })),
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Patients</h1>
          <p className="text-slate-600 mt-1">Manage your patient list</p>
        </div>
        <Link
          href="/therapist/patients/invite"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Invite Patient
        </Link>
      </div>

      {allItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">No patients yet</h3>
          <p className="text-slate-600 mb-4">Get started by inviting your first patient</p>
          <Link
            href="/therapist/patients/invite"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
          >
            Invite Patient
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Patient</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Session</th>
                <th className="text-right px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {allItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-500">{item.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.status === 'pending'
                        ? 'bg-purple-100 text-purple-800'
                        : item.status === 'baseline'
                        ? 'bg-amber-100 text-amber-800'
                        : item.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : item.status === 'completed'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}>
                      {item.status}
                    </span>
                    {item.isInvitation && item.expires_at && (
                      <p className="text-xs text-slate-500 mt-1">
                        Expires {new Date(item.expires_at).toLocaleDateString()}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {item.isInvitation
                      ? '—'
                      : item.current_session === 0
                        ? 'Baseline'
                        : `Session ${item.current_session}`}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {item.isInvitation ? (
                      <span className="text-slate-400 text-sm">Awaiting signup</span>
                    ) : (
                      <Link
                        href={`/therapist/patients/${item.id}`}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        View
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
