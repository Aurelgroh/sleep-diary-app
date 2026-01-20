import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Show landing page for non-authenticated users
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">SleepDiary</h1>
          <p className="text-lg text-slate-600 mb-8">
            CBT-I therapy management platform for therapists and patients
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/login"
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="px-6 py-3 bg-white text-slate-700 font-medium rounded-lg border border-slate-300 hover:bg-slate-50 transition"
            >
              Register as Therapist
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Check if user is a therapist
  const { data: therapist } = await supabase
    .from('therapists')
    .select('id')
    .eq('id', user.id)
    .single()

  if (therapist) {
    redirect('/therapist')
  }

  // Check if user is a patient
  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .eq('id', user.id)
    .single()

  if (patient) {
    redirect('/patient')
  }

  // User exists but has no role - this shouldn't happen normally
  // Could be a new signup that hasn't completed profile
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-semibold text-slate-900 mb-4">Welcome to SleepDiary</h1>
        <p className="text-slate-600 mb-8">
          Your account is set up but we couldn&apos;t determine your role.
          Please contact support if this issue persists.
        </p>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="px-6 py-3 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
