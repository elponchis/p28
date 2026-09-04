/**
 * The growing window on a chat thread.
 *
 * The bug these cover: the window used to live in the screen's state and reach the query through
 * the queryFn closure, while the query key stayed the same. Pressing "load older" set the state
 * and refetched in the same tick, so the fetch went out with the closure the observer was still
 * holding — the old window — and the button did nothing, forever.
 */
import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestRenderer, { act } from 'react-test-renderer';

import { useChatMessagesQuery } from '@/hooks/useApiQueries';

// Without this React warns that every update happened outside act(), including the unmount.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const getChatMessages = jest.fn();

// Hoisted above the imports by ts-jest; the factory only dereferences the mock when called, so
// it does not race the const above it.
jest.mock('@/lib/api/adapters/supabase', () => ({
  auth: { onAuthStateChange: jest.fn().mockReturnValue(() => {}) },
  data: {
    getChatMessages: (...args: unknown[]) => getChatMessages(...args),
  },
  realtime: { subscribe: jest.fn(), unsubscribe: jest.fn() },
}));

type Hook = ReturnType<typeof useChatMessagesQuery>;

const message = (id: string) => ({ id, chatId: 'chat-1', body: id, createdAt: '2026-01-01' });

/** Whatever the caller asked for, as many messages as that. */
function respondWithFullPage() {
  getChatMessages.mockImplementation((_chatId: string, opts?: { limit?: number }) =>
    Promise.resolve(Array.from({ length: opts?.limit ?? 0 }, (_, i) => message(`m${i}`)))
  );
}

function renderChatMessages(props?: { chatId?: string; pageSize?: number }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const result: { current: Hook } = { current: undefined as unknown as Hook };

  function Probe({ chatId, pageSize }: { chatId: string; pageSize?: number }) {
    result.current = useChatMessagesQuery(chatId, { userId: 'u1', pageSize });
    return null;
  }

  const wrapper = (children: ReactNode) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      wrapper(<Probe chatId={props?.chatId ?? 'chat-1'} pageSize={props?.pageSize} />)
    );
  });

  return {
    result,
    rerender: (next: { chatId: string; pageSize?: number }) =>
      act(() => {
        renderer.update(wrapper(<Probe {...next} />));
      }),
    unmount: () => act(() => renderer.unmount()),
  };
}

/**
 * Lets the query settle. The fetch resolves on one task and React Query notifies on another, so
 * a single flush is not always enough — this drains until the data lands, or gives up and lets
 * the assertion report what is actually there.
 */
async function settle(flushes = 5) {
  for (let i = 0; i < flushes; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

describe('useChatMessagesQuery', () => {
  beforeEach(() => {
    getChatMessages.mockReset();
    respondWithFullPage();
  });

  it('opens on one page', async () => {
    const { result, unmount } = renderChatMessages({ pageSize: 50 });
    await settle();

    expect(getChatMessages).toHaveBeenCalledWith('chat-1', { userId: 'u1', limit: 50 });
    expect(result.current.data).toHaveLength(50);
    expect(result.current.limit).toBe(50);
    unmount();
  });

  it('asks for a wider window when told to load older messages', async () => {
    const { result, unmount } = renderChatMessages({ pageSize: 50 });
    await settle();

    await act(async () => {
      await result.current.loadOlder();
    });

    expect(getChatMessages).toHaveBeenLastCalledWith('chat-1', { userId: 'u1', limit: 100 });
    expect(result.current.data).toHaveLength(100);
    expect(result.current.limit).toBe(100);
    unmount();
  });

  it('keeps widening on each press', async () => {
    const { result, unmount } = renderChatMessages({ pageSize: 20 });
    await settle();

    await act(async () => {
      await result.current.loadOlder();
    });
    await act(async () => {
      await result.current.loadOlder();
    });

    expect(getChatMessages).toHaveBeenLastCalledWith('chat-1', { userId: 'u1', limit: 60 });
    expect(result.current.limit).toBe(60);
    unmount();
  });

  it('does not shrink the window on an ordinary refetch', async () => {
    const { result, unmount } = renderChatMessages({ pageSize: 50 });
    await settle();
    await act(async () => {
      await result.current.loadOlder();
    });

    // What a realtime message triggers. It must not walk the reader back up to the first page.
    await act(async () => {
      await result.current.refetch();
    });

    expect(getChatMessages).toHaveBeenLastCalledWith('chat-1', { userId: 'u1', limit: 100 });
    expect(result.current.data).toHaveLength(100);
    unmount();
  });

  it('starts a different thread at one page again', async () => {
    const { result, rerender, unmount } = renderChatMessages({ chatId: 'chat-1', pageSize: 50 });
    await settle();
    await act(async () => {
      await result.current.loadOlder();
    });

    rerender({ chatId: 'chat-2', pageSize: 50 });
    await settle();

    expect(getChatMessages).toHaveBeenLastCalledWith('chat-2', { userId: 'u1', limit: 50 });
    expect(result.current.limit).toBe(50);
    unmount();
  });
});
