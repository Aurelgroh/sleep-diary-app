import Link from 'next/link'

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">Therapist Registration</h1>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm text-amber-800 font-medium">Admin-Only Registration</p>
                <p className="text-sm text-amber-700 mt-1">
                  Therapist accounts are created by administrators only. If you need an account, please contact your organization&apos;s administrator.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-slate-900 mb-2">Are you a patient?</h3>
              <p className="text-sm text-slate-600">
                If you received an invitation email from your therapist, click the link in that email to create your account.
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-slate-900 mb-2">Already have an account?</h3>
              <p className="text-sm text-slate-600 mb-3">
                Sign in to access your dashboard.
              </p>
              <Link
                href="/auth/login"
                className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
              >
                Sign In
              </Link>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
