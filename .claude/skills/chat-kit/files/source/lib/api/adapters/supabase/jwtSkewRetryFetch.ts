/**
 * A fetch wrapper that rides out "JWT issued at future".
 *
 * PostgREST rejects a token whose `iat` is ahead of its own clock, with 401 and PGRST303. The
 * token is minted by the Auth service, checked by PostgREST, and the two do not always agree on
 * the time: measured against production, a freshly refreshed token was called "issued at future"
 * two seconds after it was issued, by an instance whose clock was that far behind — while a
 * sibling request carrying the identical token succeeded.
 *
 * So it lands as an occasional single failed request in the minute after a token refresh, which
 * is roughly once an hour per open client. Reads survived it because React Query retries; a
 * mutation does not retry by default, so a message sent inside that window failed outright with
 * an error about JWTs.
 *
 * Retrying is safe even for writes: PostgREST rejects the token before the statement reaches the
 * database, so the retried request cannot be a second write.
 */

/**
 * The shape of fetch this wrapper accepts and returns. Spelled out rather than `typeof fetch`
 * because the DOM and React Native typings each declare their own overloads of it, and the two
 * are not assignable to one another.
 */
export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/** PostgREST's code for a token whose issued-at is ahead of the server's clock. */
const JWT_ISSUED_AT_FUTURE = 'PGRST303';

/**
 * Waits before each retry. The skew seen in production was seconds, not milliseconds, so an
 * immediate retry would just fail again; two attempts spaced like this outlast it without
 * holding a genuinely broken request for long.
 */
export const JWT_SKEW_RETRY_DELAYS_MS = [1000, 2000];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** True when this response is PostgREST refusing a token it thinks was issued in the future. */
async function isClockSkewRejection(response: Response): Promise<boolean> {
  if (response.status !== 401) return false;
  // The caller still has to read the body, so inspect a clone.
  try {
    const body = (await response.clone().json()) as { code?: unknown };
    return body?.code === JWT_ISSUED_AT_FUTURE;
  } catch {
    return false;
  }
}

export interface JwtSkewRetryFetchOptions {
  /** The fetch to wrap. Defaults to the global one. */
  baseFetch?: FetchLike;
  /** How long to wait before each retry, in order. */
  delaysMs?: number[];
  /** Called once per retry, so the condition leaves a trace without the caller seeing an error. */
  onRetry?: (attempt: number) => void;
}

/**
 * Wraps a fetch so that PGRST303 is retried a couple of times before the caller ever sees it.
 * Every other response, error and status is passed straight through.
 */
export function createJwtSkewRetryFetch(options: JwtSkewRetryFetchOptions = {}): FetchLike {
  const {
    baseFetch = (input: RequestInfo | URL, init?: RequestInit) => globalThis.fetch(input, init),
    delaysMs = JWT_SKEW_RETRY_DELAYS_MS,
    onRetry = (attempt: number) =>
      console.warn(
        `[supabase] token rejected as issued in the future; retrying (attempt ${attempt})`
      ),
  } = options;

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    // A Request carries its body as a stream that the first attempt consumes, so keep a copy to
    // retry from. A plain url + init pair can be re-sent as it is.
    const retryInput = input instanceof Request ? input.clone() : input;

    let response = await baseFetch(input, init);
    for (let attempt = 1; attempt <= delaysMs.length; attempt += 1) {
      if (!(await isClockSkewRejection(response))) return response;
      onRetry(attempt);
      await sleep(delaysMs[attempt - 1]);
      response = await baseFetch(
        retryInput instanceof Request ? retryInput.clone() : retryInput,
        init
      );
    }
    return response;
  };
}
