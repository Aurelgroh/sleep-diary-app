import Link from 'next/link'

export default function PendingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Account Pending Activation</h1>
        <p className="text-slate-600 mb-6">
          Your therapist account has been created but is waiting for activation.
          You&apos;ll receive an email with a setup link when your account is ready.
        </p>
        <p className="text-sm text-slate-500 mb-6">
          If you believe this is an error or need assistance, please contact the administrator.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition"
          >
            Return to Home
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="w-full px-4 py-2 bg-white text-slate-600 font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
