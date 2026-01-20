import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DiaryEntryForm } from '@/components/diary/DiaryEntryForm'

export default async function NewDiaryEntryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Check if entry already exists for today (yesterday's sleep date)
  const today = new Date()
  today.setDate(today.getDate() - 1)
  const sleepDate = today.toISOString().split('T')[0]

  const { data: existingEntry } = await supabase
    .from('diary_entries')
    .select('id')
    .eq('patient_id', user.id)
    .eq('date', sleepDate)
    .single()

  return (
    <div className="py-4">
      <DiaryEntryForm
        patientId={user.id}
        existingEntry={!!existingEntry}
      />
    </div>
  )
}
