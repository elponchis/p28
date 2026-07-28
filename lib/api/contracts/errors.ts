/**
 * API error shape. All backend errors are normalized to this type by adapters.
 * UI and hooks handle only ApiError; use getUserFacingError (e.g. in lib/errors.ts) for display.
 */
export interface ApiError {
  message: string;
  code?: string;
}
