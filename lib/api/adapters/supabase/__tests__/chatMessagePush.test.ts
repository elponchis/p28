/**
 * createChatMessage fires the chat push Edge Function.
 *
 * The invoke is deliberately not awaited inside the adapter, so these tests flush the
 * microtask queue before asserting — and the "never fails the send" case is the point of the
 * whole arrangement: Expo being down must not turn into a message the user thinks was lost.
 */
import { isApiError } from '../../../contracts/guards';
import { createSupabaseDataAdapter } from '../data';

type GetClient = Parameters<typeof createSupabaseDataAdapter>[0];

const MESSAGE_ROW = {
  id: 'msg-1',
  chat_id: 'chat-1',
  user_id: 'user-1',
  body: 'hello',
  created_at: '2026-09-03T10:00:00.000Z',
  updated_at: null,
  deleted_at: null,
  parent_message_id: null,
  image_urls: [],
  attachments: [],
};

function makeClient(options?: { invoke?: jest.Mock }) {
  const invoke =
    options?.invoke ?? jest.fn().mockResolvedValue({ data: { ok: true }, error: null });

  const from = jest.fn((table: string) => {
    if (table === 'chat_messages') {
      return {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: MESSAGE_ROW, error: null }),
          }),
        }),
      };
    }
    if (table === 'profiles') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { display_name: 'Sender', first_name: null, last_name: null, avatar_url: null },
              error: null,
            }),
          }),
        }),
      };
    }
    throw new Error(`unexpected table ${table}`);
  });

  const client = { from, functions: { invoke } };
  return { getClient: (() => client) as unknown as GetClient, invoke };
}

/** Lets the un-awaited invoke inside the adapter run before assertions. */
async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('createChatMessage push notification', () => {
  it('invokes send-chat-message with the new message id', async () => {
    const { getClient, invoke } = makeClient();
    const adapter = createSupabaseDataAdapter(getClient);

    const result = await adapter.createChatMessage('chat-1', 'user-1', { body: 'hello' });
    await flushMicrotasks();

    expect(isApiError(result)).toBe(false);
    expect(invoke).toHaveBeenCalledWith('send-chat-message', { body: { messageId: 'msg-1' } });
  });

  it('still returns the sent message when the push call fails', async () => {
    const invoke = jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { getClient } = makeClient({ invoke });
    const adapter = createSupabaseDataAdapter(getClient);

    const result = await adapter.createChatMessage('chat-1', 'user-1', { body: 'hello' });
    await flushMicrotasks();

    expect(isApiError(result)).toBe(false);
    if (!isApiError(result)) {
      expect(result.id).toBe('msg-1');
    }
    warn.mockRestore();
  });

  it('still returns the sent message when the push call throws', async () => {
    const invoke = jest.fn().mockRejectedValue(new Error('network down'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { getClient } = makeClient({ invoke });
    const adapter = createSupabaseDataAdapter(getClient);

    const result = await adapter.createChatMessage('chat-1', 'user-1', { body: 'hello' });
    await flushMicrotasks();

    expect(isApiError(result)).toBe(false);
    warn.mockRestore();
  });

  it('does not fire when the message is rejected before it is stored', async () => {
    const { getClient, invoke } = makeClient();
    const adapter = createSupabaseDataAdapter(getClient);

    // No body and no attachments: rejected by validation, so nothing was sent to notify about.
    const result = await adapter.createChatMessage('chat-1', 'user-1', { body: '   ' });
    await flushMicrotasks();

    expect(isApiError(result)).toBe(true);
    expect(invoke).not.toHaveBeenCalled();
  });
});
