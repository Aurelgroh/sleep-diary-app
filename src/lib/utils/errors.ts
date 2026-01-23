/**
 * User-friendly error messages
 * Maps technical errors to actionable user guidance
 */

// Common Supabase/Auth error codes and user-friendly messages
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'invalid_credentials': 'The email or password you entered is incorrect. Please try again.',
  'Invalid login credentials': 'The email or password you entered is incorrect. Please try again.',
  'Email not confirmed': 'Please check your email and click the confirmation link before signing in.',
  'User not found': 'No account found with this email address. Please check your email or sign up.',
  'Invalid email': 'Please enter a valid email address.',
  'Signup disabled': 'New account registration is currently disabled. Please contact support.',
  'Email rate limit exceeded': 'Too many attempts. Please wait a few minutes before trying again.',
  'over_email_send_rate_limit': 'Too many emails sent. Please wait a few minutes before trying again.',
  'weak_password': 'Password is too weak. Please use at least 8 characters with a mix of letters and numbers.',
}

// Database error codes
export const DB_ERROR_MESSAGES: Record<string, string> = {
  '23505': 'This record already exists.',
  '23503': 'Cannot complete this action because related data exists.',
  '42501': 'You do not have permission to perform this action.',
  'PGRST301': 'Session expired. Please refresh the page and try again.',
}

/**
 * Get a user-friendly error message from a Supabase auth error
 */
export function getAuthErrorMessage(error: { message?: string; code?: string } | string): string {
  const errorMessage = typeof error === 'string' ? error : error.message || ''
  const errorCode = typeof error === 'string' ? '' : error.code || ''

  // Check for known error codes first
  if (errorCode && AUTH_ERROR_MESSAGES[errorCode]) {
    return AUTH_ERROR_MESSAGES[errorCode]
  }

  // Check for known error messages
  for (const [key, message] of Object.entries(AUTH_ERROR_MESSAGES)) {
    if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
      return message
    }
  }

  // Return the original message if it's reasonably user-friendly
  if (errorMessage && !errorMessage.includes('PGRST') && !errorMessage.includes('JWT')) {
    return errorMessage
  }

  // Fallback
  return 'Unable to sign in. Please check your credentials and try again.'
}

/**
 * Get a user-friendly error message from a database error
 */
export function getDbErrorMessage(error: { code?: string; message?: string }): string {
  if (error.code && DB_ERROR_MESSAGES[error.code]) {
    return DB_ERROR_MESSAGES[error.code]
  }

  // Check message for known patterns
  if (error.message?.includes('duplicate key')) {
    return 'This record already exists.'
  }

  if (error.message?.includes('foreign key')) {
    return 'Cannot complete this action because related data exists.'
  }

  if (error.message?.includes('permission denied')) {
    return 'You do not have permission to perform this action.'
  }

  return 'Unable to save changes. Please try again.'
}

/**
 * User-friendly message for network/connection errors
 */
export function getNetworkErrorMessage(): string {
  return 'Unable to connect to the server. Please check your internet connection and try again.'
}

/**
 * User-friendly message for unexpected errors with support guidance
 */
export function getUnexpectedErrorMessage(includeSupport = true): string {
  const base = 'An unexpected error occurred.'
  return includeSupport
    ? `${base} If this problem persists, please contact support.`
    : base
}
