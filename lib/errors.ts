import type { ApiError } from './api/contracts/errors';

/**
 * Maps ApiError to a user-facing message. Use in UI for display and retry cues.
 */
export function getUserFacingError(error: ApiError | null | undefined): string {
  if (!error) return 'Something went wrong. Please try again.';
  if (error.code === 'NOT_IMPLEMENTED') {
    return 'This feature is not available yet.';
  }
  if (
    error.code === 'invalid_credentials' ||
    error.message?.toLowerCase().includes('invalid login')
  ) {
    return 'Invalid email or password. Please try again.';
  }
  if (error.code === 'email_exists' || error.code === 'user_already_exists') {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (error.code === 'email_not_confirmed' || error.code === 'EMAIL_CONFIRMATION_REQUIRED') {
    return 'Please check your email to confirm your account.';
  }
  return error.message || 'Something went wrong. Please try again.';
}
