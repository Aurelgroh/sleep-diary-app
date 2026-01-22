import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TherapistProfileClient } from '@/components/profile/TherapistProfileClient'

export default async function TherapistProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get therapist data
  const { data: therapist } = await supabase
    .from('therapists')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!therapist) {
    redirect('/')
  }

  // Get patient count
  const { count: patientCount } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .eq('therapist_id', user.id)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
      </div>

      <TherapistProfileClient
        therapist={therapist}
        userEmail={user.email || ''}
        patientCount={patientCount || 0}
      />
    </div>
  )
}
