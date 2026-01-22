'use client'

interface TreatmentTimelineProps {
  currentSession: number // 0 = baseline, 1-8 = treatment sessions
  status: string
}

const SESSIONS = [
  { number: 0, label: 'Baseline', description: 'Collecting sleep data' },
  { number: 1, label: 'Session 1', description: 'Foundation' },
  { number: 2, label: 'Session 2', description: 'Active treatment' },
  { number: 3, label: 'Session 3', description: 'Active treatment' },
  { number: 4, label: 'Session 4', description: 'Active treatment' },
  { number: 5, label: 'Session 5', description: 'Active treatment' },
  { number: 6, label: 'Session 6', description: 'Active treatment' },
  { number: 7, label: 'Session 7', description: 'Active treatment' },
  { number: 8, label: 'Session 8', description: 'Completion' },
]

export function TreatmentTimeline({ currentSession, status }: TreatmentTimelineProps) {
  const getSessionState = (sessionNumber: number): 'completed' | 'current' | 'upcoming' => {
    if (status === 'completed') return 'completed'
    if (sessionNumber < currentSession) return 'completed'
    if (sessionNumber === currentSession) return 'current'
    return 'upcoming'
  }

  const getStateStyles = (state: 'completed' | 'current' | 'upcoming') => {
    switch (state) {
      case 'completed':
        return {
          circle: 'bg-green-500 text-white border-green-500',
          line: 'bg-green-500',
          label: 'text-green-700',
          description: 'text-green-600'
        }
      case 'current':
        return {
          circle: 'bg-blue-500 text-white border-blue-500 ring-4 ring-blue-100',
          line: 'bg-slate-200',
          label: 'text-blue-700 font-semibold',
          description: 'text-blue-600'
        }
      default:
        return {
          circle: 'bg-white text-slate-400 border-slate-300',
          line: 'bg-slate-200',
          label: 'text-slate-400',
          description: 'text-slate-400'
        }
    }
  }

  return (
    <div className="space-y-4">
      {/* Horizontal timeline for larger screens */}
      <div className="hidden md:block overflow-x-auto pb-4">
        <div className="flex items-start min-w-max">
          {SESSIONS.map((session, index) => {
            const state = getSessionState(session.number)
            const styles = getStateStyles(state)
            const isLast = index === SESSIONS.length - 1

            return (
              <div key={session.number} className="flex items-start">
                {/* Session node */}
                <div className="flex flex-col items-center w-24">
                  <div
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold ${styles.circle}`}
                  >
                    {state === 'completed' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      session.number
                    )}
                  </div>
                  <p className={`text-xs mt-2 text-center ${styles.label}`}>
                    {session.label}
                  </p>
                  <p className={`text-xs text-center ${styles.description}`}>
                    {session.description}
                  </p>
                </div>

                {/* Connecting line */}
                {!isLast && (
                  <div className="flex items-center pt-5 -mx-2">
                    <div className={`h-0.5 w-8 ${state === 'completed' ? styles.line : 'bg-slate-200'}`} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Vertical timeline for mobile */}
      <div className="md:hidden space-y-1">
        {SESSIONS.map((session, index) => {
          const state = getSessionState(session.number)
          const styles = getStateStyles(state)
          const isLast = index === SESSIONS.length - 1

          return (
            <div key={session.number}>
              <div className="flex items-center gap-3">
                {/* Session node */}
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${styles.circle}`}
                >
                  {state === 'completed' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    session.number
                  )}
                </div>

                {/* Session info */}
                <div className="flex-1 py-2">
                  <p className={`text-sm ${styles.label}`}>
                    {session.label}
                  </p>
                  <p className={`text-xs ${styles.description}`}>
                    {session.description}
                  </p>
                </div>

                {/* Status badge for current */}
                {state === 'current' && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                    Current
                  </span>
                )}
              </div>

              {/* Connecting line */}
              {!isLast && (
                <div className="ml-4 pl-0 border-l-2 h-2 border-slate-200" />
              )}
            </div>
          )
        })}
      </div>

      {/* Current phase description */}
      <div className="mt-4 p-4 bg-slate-50 rounded-xl">
        <p className="text-sm text-slate-700">
          {status === 'baseline' && (
            <>
              <span className="font-medium">Baseline Phase:</span> Log your sleep daily.
              Your therapist will analyze your patterns and set your first sleep window.
            </>
          )}
          {status === 'active' && currentSession === 1 && (
            <>
              <span className="font-medium">Foundation Session:</span> Your therapist will
              explain CBT-I and set your initial sleep window based on baseline data.
            </>
          )}
          {status === 'active' && currentSession >= 2 && currentSession <= 4 && (
            <>
              <span className="font-medium">Active Treatment:</span> Follow your sleep window
              strictly. Your sleep efficiency should improve over the coming weeks.
            </>
          )}
          {status === 'active' && currentSession >= 5 && (
            <>
              <span className="font-medium">Maintenance Phase:</span> Your sleep should be
              improving. Continue following your sleep schedule to maintain progress.
            </>
          )}
          {status === 'completed' && (
            <>
              <span className="font-medium">Treatment Complete!</span> Congratulations on
              completing your CBT-I program. Continue using the skills you have learned.
            </>
          )}
        </p>
      </div>
    </div>
  )
}
