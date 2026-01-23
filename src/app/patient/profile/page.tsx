import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PatientProfileClient } from '@/components/profile/PatientProfileClient'

export default async function PatientProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get patient data
  const { data: patient } = await supabase
    .from('patients')
    .select('*, therapists(id, name, email)')
    .eq('id', user.id)
    .single()

  if (!patient) {
    redirect('/')
  }

  // Cast patient to include email settings (with defaults if not set)
  const patientData = patient as Record<string, unknown>
  const patientWithSettings = {
    id: patient.id,
    name: patient.name,
    email: patient.email,
    timezone: patient.timezone,
    created_at: patient.created_at,
    email_reminders: patientData.email_reminders as boolean ?? true,
    reminder_time: (patientData.reminder_time as string) ?? '09:00',
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
      </div>

      <PatientProfileClient
        patient={patientWithSettings}
        therapist={patient.therapists}
        userEmail={user.email || ''}
      />
    </div>
  )
}
