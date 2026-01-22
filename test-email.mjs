import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import 'dotenv/config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const resend = new Resend(process.env.RESEND_API_KEY)

async function sendTestEmail() {
  const targetEmail = 'aurelgroh@gmail.com'

  // Check patient
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id, name, email, status, email_reminders, therapist_id, therapists(name)')
    .eq('email', targetEmail)
    .single()

  if (patientError) {
    console.log('Patient not found:', patientError.message)
    console.log('Sending test email anyway...')
  } else {
    console.log('Found patient:', patient.name)
  }

  // Get prescription if patient exists
  let prescription = null
  if (patient) {
    const today = new Date().toISOString().split('T')[0]
    const { data: rx } = await supabase
      .from('prescriptions')
      .select('bedtime, wake_time')
      .eq('patient_id', patient.id)
      .lte('effective_date', today)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single()
    prescription = rx
    if (prescription) {
      console.log('Found prescription:', prescription)
    }
  }

  const firstName = patient?.name?.split(' ')[0] || 'there'
  const therapistName = patient?.therapists?.name || 'your therapist'
  const appUrl = 'https://sleep-diary-app.vercel.app'

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  const prescriptionSection = prescription ? `
    <div style="background-color: #eff6ff; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <p style="color: #1e40af; font-weight: 600; margin: 0 0 12px 0; font-size: 14px;">YOUR SLEEP SCHEDULE</p>
      <div style="text-align: center;">
        <span style="color: #1e293b; font-size: 24px; font-weight: bold;">${formatTime(prescription.bedtime)}</span>
        <span style="color: #cbd5e1; font-size: 24px; margin: 0 16px;">→</span>
        <span style="color: #1e293b; font-size: 24px; font-weight: bold;">${formatTime(prescription.wake_time)}</span>
      </div>
      <p style="color: #64748b; font-size: 14px; text-align: center; margin: 8px 0 0 0;">Bedtime → Wake time</p>
      <p style="color: #475569; font-size: 14px; margin: 16px 0 0 0; text-align: center;">
        Sticking to your sleep window helps build a stronger sleep drive and improves sleep quality over time.
      </p>
    </div>
  ` : ''

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background-color: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="font-size: 32px; margin-bottom: 8px;">🌅</div>
            <h1 style="color: #1e293b; font-size: 24px; font-weight: 600; margin: 0;">Good morning, ${firstName}!</h1>
          </div>

          <!-- Main message -->
          <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
            This is a gentle reminder to log last night's sleep in your diary.
            Taking a moment to record how you slept helps ${therapistName} understand your progress
            and adjust your sleep plan as needed.
          </p>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 24px 0;">
            <a href="${appUrl}/patient/diary/new" style="background-color: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 500; font-size: 16px;">
              Log My Sleep
            </a>
          </div>

          <p style="color: #64748b; font-size: 14px; text-align: center; margin: 0 0 24px 0;">
            It only takes about 2 minutes ⏱️
          </p>

          ${prescriptionSection}

          <!-- Tips section -->
          <div style="background-color: #fefce8; border-radius: 12px; padding: 20px; margin-top: 24px;">
            <p style="color: #854d0e; font-weight: 600; margin: 0 0 12px 0; font-size: 14px;">💡 QUICK TIPS FOR TODAY</p>
            <ul style="color: #713f12; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Try to avoid napping during the day (unless needed for safety, like driving)</li>
              <li style="margin-bottom: 8px;">Get some natural light exposure, especially in the morning</li>
              <li>Stay active but avoid intense exercise close to bedtime</li>
            </ul>
          </div>

          <!-- Footer -->
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
              You're receiving this because you have daily reminders enabled in your
              <a href="${appUrl}/patient/profile" style="color: #64748b;">profile settings</a>.
            </p>
          </div>

        </div>
      </div>
    </body>
    </html>
  `

  console.log('Sending email to:', targetEmail)

  const { data, error } = await resend.emails.send({
    from: 'SleepDiary <noreply@auth.patientlearningsystems.com>',
    to: targetEmail,
    subject: `Good morning, ${firstName}! Time to log your sleep`,
    html: emailHtml
  })

  if (error) {
    console.error('Error sending email:', error)
  } else {
    console.log('Email sent successfully!', data)
  }
}

sendTestEmail()
