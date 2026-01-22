'use client'

interface TermsConsentProps {
  acceptTerms: boolean
  setAcceptTerms: (value: boolean) => void
  acceptDataSharing?: boolean
  setAcceptDataSharing?: (value: boolean) => void
  showDataSharing?: boolean
  therapistName?: string
}

export function TermsConsent({
  acceptTerms,
  setAcceptTerms,
  acceptDataSharing,
  setAcceptDataSharing,
  showDataSharing = false,
  therapistName,
}: TermsConsentProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <input
          id="terms"
          type="checkbox"
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
          className="mt-1 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="terms" className="text-sm text-slate-600">
          I agree to the{' '}
          <a href="/terms" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </a>
        </label>
      </div>

      {showDataSharing && setAcceptDataSharing !== undefined && (
        <div className="flex items-start gap-3">
          <input
            id="data-sharing"
            type="checkbox"
            checked={acceptDataSharing}
            onChange={(e) => setAcceptDataSharing(e.target.checked)}
            className="mt-1 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="data-sharing" className="text-sm text-slate-600">
            I consent to sharing my sleep diary data with{' '}
            <span className="font-medium">{therapistName || 'my therapist'}</span> for the purpose of CBT-I treatment.
            This includes sleep logs, questionnaire responses, and progress data.
          </label>
        </div>
      )}
    </div>
  )
}
