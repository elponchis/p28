import type { ApiError } from './errors';

/**
 * Type guard: true when value is ApiError (has message and it's a string).
 * Use for any data API result (Profile | ApiError, Organization[] | ApiError, etc.).
 * Note: Success DTOs must not have a `message` property, or this guard may false-positive.
 */
export function isApiError(r: unknown): r is ApiError {
  return (
    typeof r === 'object' &&
    r !== null &&
    'message' in r &&
    typeof (r as ApiError).message === 'string'
  );
}
