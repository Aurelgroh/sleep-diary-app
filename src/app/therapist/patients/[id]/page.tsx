import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  calculateWeeklyMetrics,
  formatDurationHM,
  formatSE,
  getSEColorClass,
  getSEBadgeClass,
  calculateDiff,
  formatTrend,
  formatDateRange,
  calculateCompletionRate,
  getQualityEmoji,
  formatTimeFromISO,
  type DiaryEntry
} from '@/lib/sleep-diary/metrics'
import {
  getTitrationRecommendation,
  getActionBadgeClass,
  getActionLabel,
  formatPrescriptionTime
} from '@/lib/sleep-diary/titration'
import { SleepDataVisualization } from '@/components/charts/SleepDataVisualization'
import type { DiaryEntry as ChartDiaryEntry, ISIScore } from '@/components/charts/ChartTabs'
import { ExportButton } from '@/components/export/ExportButton'
import { ChatSection } from '@/components/chat/ChatSection'
import { SessionsSection } from '@/components/sessions/SessionsSection'
import { ISISection } from '@/components/isi/ISISection'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PatientDashboard({ params }: PageProps) {
  const { id: patientId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch patient data
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('*, therapists(name)')
    .eq('id', patientId)
    .single()

  if (patientError || !patient) {
    notFound()
  }

  // Verify therapist owns this patient
  if (patient.therapist_id !== user!.id) {
    notFound()
  }

  // Fetch current prescription
  const { data: prescription } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('patient_id', patientId)
    .lte('effective_date', new Date().toISOString().split('T')[0])
    .order('effective_date', { ascending: false })
    .limit(1)
    .single()

  // Calculate date ranges
  const today = new Date()
  const thisWeekEnd = new Date(today)
  const thisWeekStart = new Date(today)
  thisWeekStart.setDate(thisWeekStart.getDate() - 6)

  const lastWeekEnd = new Date(thisWeekStart)
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 1)
  const lastWeekStart = new Date(lastWeekEnd)
  lastWeekStart.setDate(lastWeekStart.getDate() - 6)

  // Fetch this week's diary entries
  const { data: thisWeekEntries } = await supabase
    .from('diary_entries')
    .select('*')
    .eq('patient_id', patientId)
    .gte('date', thisWeekStart.toISOString().split('T')[0])
    .lte('date', thisWeekEnd.toISOString().split('T')[0])
    .order('date', { ascending: false })

  // Fetch last week's diary entries
  const { data: lastWeekEntries } = await supabase
    .from('diary_entries')
    .select('*')
    .eq('patient_id', patientId)
    .gte('date', lastWeekStart.toISOString().split('T')[0])
    .lte('date', lastWeekEnd.toISOString().split('T')[0])

  // Fetch baseline entries (first 7 days from patient's first entry)
  const { data: allEntries } = await supabase
    .from('diary_entries')
    .select('*')
    .eq('patient_id', patientId)
    .order('date', { ascending: true })

  // Use first 7 entries as baseline (or all if less than 7)
  const baselineEntries = allEntries?.slice(0, 7) || []

  // Fetch ISI scores
  const { data: isiScores } = await supabase
    .from('isi_scores')
    .select('*')
    .eq('patient_id', patientId)
    .order('date', { ascending: false })

  // Calculate metrics
  const thisWeekMetrics = calculateWeeklyMetrics((thisWeekEntries || []) as DiaryEntry[])
  const lastWeekMetrics = calculateWeeklyMetrics((lastWeekEntries || []) as DiaryEntry[])
  const baselineMetrics = calculateWeeklyMetrics(baselineEntries as DiaryEntry[], baselineEntries.length)

  // Calculate titration recommendation (default minimum window: 5 hours = 300 minutes)
  const DEFAULT_MIN_WINDOW = 300
  const recommendation = getTitrationRecommendation({
    weeklyAvgSE: thisWeekMetrics.avgSe,
    daysLogged: thisWeekMetrics.daysLogged,
    currentWindowMinutes: prescription?.window_minutes || 360,
    minWindowMinutes: DEFAULT_MIN_WINDOW
  })

  // Calculate SE trends
  const seChangeFromLastWeek = calculateDiff(thisWeekMetrics.avgSe, lastWeekMetrics.avgSe)
  const seChangeFromBaseline = calculateDiff(thisWeekMetrics.avgSe, baselineMetrics.avgSe)

  // Days since patient started
  const startDate = new Date(patient.created_at)
  const daysInTreatment = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  // Completion rate
  const completionRate = calculateCompletionRate(thisWeekMetrics.daysLogged, 7)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/therapist/patients"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Patients
      </Link>

      {/* Patient Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{patient.name}</h1>
            <p className="text-slate-500">{patient.email}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                patient.status === 'baseline'
                  ? 'bg-amber-100 text-amber-800'
                  : patient.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-slate-100 text-slate-800'
              }`}>
                {patient.status === 'baseline' ? 'Baseline' : `Session ${patient.current_session}`}
              </span>
              <span className="text-sm text-slate-500">
                Day {daysInTreatment} of treatment
              </span>
            </div>
          </div>

          {/* Current Prescription */}
          <div className="bg-slate-50 rounded-xl p-4 min-w-[200px]">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Sleep Window</p>
            {prescription ? (
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900">{formatPrescriptionTime(prescription.bedtime)}</p>
                  <p className="text-xs text-slate-500">Bedtime</p>
                </div>
                <span className="text-slate-300">→</span>
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900">{formatPrescriptionTime(prescription.wake_time)}</p>
                  <p className="text-xs text-slate-500">Wake</p>
                </div>
              </div>
            ) : (
              <p className="text-slate-500">Not set</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 mt-4 pt-4 border-t border-slate-200">
          <Link
            href={`/therapist/patients/${patientId}/prescription`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {prescription ? 'Adjust Prescription' : 'Set Prescription'}
          </Link>
        </div>
      </div>

      {/* Titration Recommendation */}
      {thisWeekMetrics.daysLogged >= 3 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Titration Recommendation</h2>
              <p className="text-sm text-slate-500">Based on {thisWeekMetrics.daysLogged} days of data this week</p>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getActionBadgeClass(recommendation.action)}`}>
              {getActionLabel(recommendation.action)}
            </span>
          </div>
          <p className="text-slate-600">{recommendation.reason}</p>
          {recommendation.action !== 'maintain' && recommendation.action !== 'review' && (
            <Link
              href={`/therapist/patients/${patientId}/prescription`}
              className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              Apply Recommendation
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>
      )}

      {/* Weekly Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* This Week */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">This Week</h3>
            <span className="text-xs text-slate-500">{formatDateRange(thisWeekStart, thisWeekEnd)}</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Avg Sleep Efficiency</span>
              <span className={`font-bold text-lg ${getSEColorClass(thisWeekMetrics.avgSe)}`}>
                {formatSE(thisWeekMetrics.avgSe)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Avg Total Sleep</span>
              <span className="font-medium text-slate-900">{formatDurationHM(thisWeekMetrics.avgTst)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Avg Time in Bed</span>
              <span className="font-medium text-slate-900">{formatDurationHM(thisWeekMetrics.avgTib)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Avg SOL</span>
              <span className="font-medium text-slate-900">{thisWeekMetrics.avgSol !== null ? `${Math.round(thisWeekMetrics.avgSol)}m` : '--'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Avg WASO</span>
              <span className="font-medium text-slate-900">{thisWeekMetrics.avgWaso !== null ? `${Math.round(thisWeekMetrics.avgWaso)}m` : '--'}</span>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Days Logged</span>
                <span className="font-medium text-slate-900">{thisWeekMetrics.daysLogged}/7 ({completionRate}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Last Week */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Last Week</h3>
            <span className="text-xs text-slate-500">{formatDateRange(lastWeekStart, lastWeekEnd)}</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Avg Sleep Efficiency</span>
              <div className="flex items-center gap-2">
                <span className={`font-bold text-lg ${getSEColorClass(lastWeekMetrics.avgSe)}`}>
                  {formatSE(lastWeekMetrics.avgSe)}
                </span>
                {seChangeFromLastWeek !== null && (
                  <span className={`text-sm ${seChangeFromLastWeek >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {seChangeFromLastWeek >= 0 ? '↑' : '↓'}{Math.abs(seChangeFromLastWeek)}%
                  </span>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Avg Total Sleep</span>
              <span className="font-medium text-slate-900">{formatDurationHM(lastWeekMetrics.avgTst)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Avg Time in Bed</span>
              <span className="font-medium text-slate-900">{formatDurationHM(lastWeekMetrics.avgTib)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Avg SOL</span>
              <span className="font-medium text-slate-900">{lastWeekMetrics.avgSol !== null ? `${Math.round(lastWeekMetrics.avgSol)}m` : '--'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Avg WASO</span>
              <span className="font-medium text-slate-900">{lastWeekMetrics.avgWaso !== null ? `${Math.round(lastWeekMetrics.avgWaso)}m` : '--'}</span>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Days Logged</span>
                <span className="font-medium text-slate-900">{lastWeekMetrics.daysLogged}/7</span>
              </div>
            </div>
          </div>
        </div>

        {/* Baseline */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Baseline</h3>
            <span className="text-xs text-slate-500">{baselineEntries.length} days</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Avg Sleep Efficiency</span>
              <div className="flex items-center gap-2">
                <span className={`font-bold text-lg ${getSEColorClass(baselineMetrics.avgSe)}`}>
                  {formatSE(baselineMetrics.avgSe)}
                </span>
                {seChangeFromBaseline !== null && (
                  <span className={`text-sm ${seChangeFromBaseline >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {seChangeFromBaseline >= 0 ? '↑' : '↓'}{Math.abs(seChangeFromBaseline)}%
                  </span>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Avg Total Sleep</span>
              <span className="font-medium text-slate-900">{formatDurationHM(baselineMetrics.avgTst)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Avg Time in Bed</span>
              <span className="font-medium text-slate-900">{formatDurationHM(baselineMetrics.avgTib)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Avg SOL</span>
              <span className="font-medium text-slate-900">{baselineMetrics.avgSol !== null ? `${Math.round(baselineMetrics.avgSol)}m` : '--'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Avg WASO</span>
              <span className="font-medium text-slate-900">{baselineMetrics.avgWaso !== null ? `${Math.round(baselineMetrics.avgWaso)}m` : '--'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ChatSection
        patientId={patientId}
        currentUserId={user!.id}
        patientName={patient.name}
      />

      {/* Sessions */}
      <SessionsSection
        patientId={patientId}
        therapistId={user!.id}
        currentSession={patient.current_session}
        isTherapist={true}
      />

      {/* ISI Assessments */}
      <ISISection patientId={patientId} />

      {/* Sleep Data Visualization (Chart + Calendar) */}
      {allEntries && allEntries.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Sleep Trends</h2>
            <p className="text-sm text-slate-500">Toggle between chart and calendar views</p>
          </div>
          <SleepDataVisualization entries={allEntries as ChartDiaryEntry[]} isiScores={(isiScores || []) as ISIScore[]} />
        </div>
      )}

      {/* Sleep Data Table - Excel-like */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Sleep Data</h2>
            <p className="text-sm text-slate-500">All diary entries ({allEntries?.length || 0} total)</p>
          </div>
          {allEntries && allEntries.length > 0 && (
            <ExportButton entries={allEntries as DiaryEntry[]} patientName={patient.name} />
          )}
        </div>

        {(allEntries && allEntries.length > 0) ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-slate-100 sticky top-0">
                <tr>
                  <th className="border border-slate-300 px-2 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">Date</th>
                  <th className="border border-slate-300 px-2 py-2 text-center font-semibold text-slate-700 whitespace-nowrap">TTB</th>
                  <th className="border border-slate-300 px-2 py-2 text-center font-semibold text-slate-700 whitespace-nowrap">TTS</th>
                  <th className="border border-slate-300 px-2 py-2 text-center font-semibold text-slate-700 whitespace-nowrap">TFA</th>
                  <th className="border border-slate-300 px-2 py-2 text-center font-semibold text-slate-700 whitespace-nowrap">TOB</th>
                  <th className="border border-slate-300 px-2 py-2 text-center font-semibold text-slate-700 whitespace-nowrap bg-blue-50">TIB</th>
                  <th className="border border-slate-300 px-2 py-2 text-center font-semibold text-slate-700 whitespace-nowrap bg-green-50">TST</th>
                  <th className="border border-slate-300 px-2 py-2 text-center font-semibold text-slate-700 whitespace-nowrap bg-amber-50">TWT</th>
                  <th className="border border-slate-300 px-2 py-2 text-center font-semibold text-slate-700 whitespace-nowrap">SOL</th>
                  <th className="border border-slate-300 px-2 py-2 text-center font-semibold text-slate-700 whitespace-nowrap">NWAK</th>
                  <th className="border border-slate-300 px-2 py-2 text-center font-semibold text-slate-700 whitespace-nowrap">WASO</th>
                  <th className="border border-slate-300 px-2 py-2 text-center font-semibold text-slate-700 whitespace-nowrap">EMA</th>
                  <th className="border border-slate-300 px-2 py-2 text-center font-semibold text-slate-700 whitespace-nowrap bg-purple-50">SE%</th>
                  <th className="border border-slate-300 px-2 py-2 text-center font-semibold text-slate-700 whitespace-nowrap">Q</th>
                </tr>
              </thead>
              <tbody>
                {[...allEntries].reverse().map((entry, idx) => (
                  <tr key={entry.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="border border-slate-200 px-2 py-1.5 font-medium text-slate-900 whitespace-nowrap">
                      {new Date(entry.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-center text-slate-700 whitespace-nowrap">
                      {formatTimeFromISO(entry.ttb)}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-center text-slate-700 whitespace-nowrap">
                      {formatTimeFromISO(entry.tts)}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-center text-slate-700 whitespace-nowrap">
                      {formatTimeFromISO(entry.tfa)}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-center text-slate-700 whitespace-nowrap">
                      {formatTimeFromISO(entry.tob)}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-center text-slate-900 whitespace-nowrap bg-blue-50/50">
                      {entry.tib !== null ? `${Math.floor(entry.tib / 60)}:${String(entry.tib % 60).padStart(2, '0')}` : '--'}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-center font-medium text-slate-900 whitespace-nowrap bg-green-50/50">
                      {entry.tst !== null ? `${Math.floor(entry.tst / 60)}:${String(entry.tst % 60).padStart(2, '0')}` : '--'}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-center text-slate-900 whitespace-nowrap bg-amber-50/50">
                      {entry.twt !== null ? entry.twt : '--'}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-center text-slate-700 whitespace-nowrap">
                      {entry.sol !== null ? entry.sol : '--'}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-center text-slate-700 whitespace-nowrap">
                      {entry.awakenings !== null ? entry.awakenings : '--'}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-center text-slate-700 whitespace-nowrap">
                      {entry.waso !== null ? entry.waso : '--'}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-center text-slate-700 whitespace-nowrap">
                      {entry.ema !== null ? entry.ema : '--'}
                    </td>
                    <td className={`border border-slate-200 px-2 py-1.5 text-center font-semibold whitespace-nowrap ${
                      entry.se !== null
                        ? entry.se >= 85 ? 'bg-green-100 text-green-800'
                        : entry.se >= 70 ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                        : ''
                    }`}>
                      {entry.se !== null ? Math.round(entry.se) : '--'}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-center whitespace-nowrap">
                      {getQualityEmoji(entry.quality_rating)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-slate-500">No diary entries yet</p>
            <p className="text-sm text-slate-400 mt-1">Entries will appear here once the patient starts logging</p>
          </div>
        )}
      </div>
    </div>
  )
}
