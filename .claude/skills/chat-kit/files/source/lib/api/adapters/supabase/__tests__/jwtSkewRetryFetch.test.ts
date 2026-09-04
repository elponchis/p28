import { createJwtSkewRetryFetch } from '@/lib/api/adapters/supabase/jwtSkewRetryFetch';

const jwtFuture = () =>
  new Response(JSON.stringify({ code: 'PGRST303', message: 'JWT issued at future' }), {
    status: 401,
    headers: { 'content-type': 'application/json' },
  });

const ok = (body = '[]') =>
  new Response(body, { status: 200, headers: { 'content-type': 'application/json' } });

/** No real waiting: the delays are the point of the wrapper, not of the test. */
const noDelays = [0, 0];

describe('createJwtSkewRetryFetch', () => {
  it('passes a successful response straight through', async () => {
    const base = jest.fn().mockResolvedValue(ok('[{"id":1}]'));
    const wrapped = createJwtSkewRetryFetch({ baseFetch: base, delaysMs: noDelays });

    const response = await wrapped('https://example.test/rest/v1/chats');

    expect(base).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual([{ id: 1 }]);
  });

  it('retries once when PostgREST calls the token future-dated, and returns the retry', async () => {
    const base = jest.fn().mockResolvedValueOnce(jwtFuture()).mockResolvedValueOnce(ok('[]'));
    const onRetry = jest.fn();
    const wrapped = createJwtSkewRetryFetch({ baseFetch: base, delaysMs: noDelays, onRetry });

    const response = await wrapped('https://example.test/rest/v1/chats');

    expect(base).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledWith(1);
    expect(response.status).toBe(200);
  });

  it('gives up after the configured attempts rather than retrying forever', async () => {
    const base = jest.fn().mockImplementation(() => Promise.resolve(jwtFuture()));
    const wrapped = createJwtSkewRetryFetch({
      baseFetch: base,
      delaysMs: noDelays,
      onRetry: () => {},
    });

    const response = await wrapped('https://example.test/rest/v1/chats');

    expect(base).toHaveBeenCalledTimes(noDelays.length + 1);
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: 'PGRST303' });
  });

  it('leaves the body readable for the caller', async () => {
    const base = jest.fn().mockResolvedValueOnce(jwtFuture()).mockResolvedValueOnce(ok('[]'));
    const wrapped = createJwtSkewRetryFetch({
      baseFetch: base,
      delaysMs: noDelays,
      onRetry: () => {},
    });

    const response = await wrapped('https://example.test/rest/v1/chats');

    expect(response.bodyUsed).toBe(false);
    expect(await response.json()).toEqual([]);
  });

  it('passes through a 401 that is not about clock skew', async () => {
    const unauthorized = new Response(JSON.stringify({ message: 'Invalid API key' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
    const base = jest.fn().mockResolvedValue(unauthorized);
    const wrapped = createJwtSkewRetryFetch({ baseFetch: base, delaysMs: noDelays });

    const response = await wrapped('https://example.test/rest/v1/chats');

    expect(base).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(401);
  });

  it('passes through a 401 with no JSON body', async () => {
    const base = jest.fn().mockResolvedValue(new Response('nope', { status: 401 }));
    const wrapped = createJwtSkewRetryFetch({ baseFetch: base, delaysMs: noDelays });

    const response = await wrapped('https://example.test/rest/v1/chats');

    expect(base).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(401);
  });

  it('resends the write, since PostgREST rejected the token before the statement ran', async () => {
    const base = jest.fn().mockResolvedValueOnce(jwtFuture()).mockResolvedValueOnce(ok('{}'));
    const wrapped = createJwtSkewRetryFetch({
      baseFetch: base,
      delaysMs: noDelays,
      onRetry: () => {},
    });

    const init = { method: 'POST', body: '{"body":"hello"}' };
    await wrapped('https://example.test/rest/v1/chat_messages', init);

    expect(base).toHaveBeenCalledTimes(2);
    expect(base.mock.calls[1][0]).toBe('https://example.test/rest/v1/chat_messages');
    expect(base.mock.calls[1][1]).toBe(init);
  });

  it('does not swallow a network failure', async () => {
    const base = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const wrapped = createJwtSkewRetryFetch({ baseFetch: base, delaysMs: noDelays });

    await expect(wrapped('https://example.test/rest/v1/chats')).rejects.toThrow('Failed to fetch');
    expect(base).toHaveBeenCalledTimes(1);
  });
});
