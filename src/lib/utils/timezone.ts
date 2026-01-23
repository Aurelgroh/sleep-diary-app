/**
 * Timezone validation utilities
 */

// List of valid IANA timezones (common ones for North America/Europe)
// This is a subset - Intl.supportedValuesOf('timeZone') provides the full list
// but we validate using Intl.DateTimeFormat which handles all valid timezones
const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Europe/Zurich',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Asia/Tokyo',
  'Asia/Singapore',
  'UTC',
]

/**
 * Validate that a timezone string is a valid IANA timezone
 * @param timezone The timezone string to validate
 * @returns True if valid, false otherwise
 */
export function isValidTimezone(timezone: string): boolean {
  if (!timezone || typeof timezone !== 'string') {
    return false
  }

  try {
    // Intl.DateTimeFormat will throw for invalid timezones
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

/**
 * Get the user's browser timezone
 * Falls back to UTC if detection fails
 */
export function getBrowserTimezone(): string {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (isValidTimezone(timezone)) {
      return timezone
    }
  } catch {
    // Ignore errors
  }
  return 'UTC'
}

/**
 * Sanitize a timezone string - returns the timezone if valid, or UTC as fallback
 */
export function sanitizeTimezone(timezone: string | undefined | null): string {
  if (timezone && isValidTimezone(timezone)) {
    return timezone
  }
  return 'UTC'
}

export { COMMON_TIMEZONES }
