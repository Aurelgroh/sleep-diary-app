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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
      </div>

      <PatientProfileClient
        patient={patient}
        therapist={patient.therapists}
        userEmail={user.email || ''}
      />
    </div>
  )
}
