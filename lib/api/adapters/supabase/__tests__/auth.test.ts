/**
 * Story 1.4: Unit tests for Supabase auth adapter.
 * Mocks Supabase client; verifies signIn/signUp/signOut/session mapping to contract types and ApiError.
 */
import type { Session as SupabaseSession, User as SupabaseUser } from '@supabase/supabase-js';
import { createSupabaseAuthAdapter } from '../auth';

function mockSession(overrides: Partial<SupabaseSession> = {}): SupabaseSession {
  return {
    access_token: 'access',
    refresh_token: 'refresh',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: mockUser(),
    ...overrides,
  } as SupabaseSession;
}

function mockUser(overrides: Partial<SupabaseUser> = {}): SupabaseUser {
  return {
    id: 'user-1',
    email: 'a@b.co',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  } as SupabaseUser;
}

describe('Supabase auth adapter', () => {
  it('signIn maps success to Session', async () => {
    const session = mockSession();
    const getClient = () =>
      ({
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({ data: { session }, error: null }),
        },
      }) as any;
    const adapter = createSupabaseAuthAdapter(getClient);
    const result = await adapter.signIn('a@b.co', 'pass');
    expect(result).toHaveProperty('session');
    expect((result as any).session.accessToken).toBe('access');
    expect((result as any).session.user.id).toBe('user-1');
    expect((result as any).session.user.email).toBe('a@b.co');
  });

  it('signIn maps Supabase error to ApiError', async () => {
    const getClient = () =>
      ({
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({
            data: { session: null },
            error: { message: 'Invalid login credentials', code: 'invalid_credentials' },
          }),
        },
      }) as any;
    const adapter = createSupabaseAuthAdapter(getClient);
    const result = await adapter.signIn('a@b.co', 'wrong');
    expect(result).toHaveProperty('error');
    expect((result as any).error.message).toBe('Invalid login credentials');
    expect((result as any).error.code).toBe('invalid_credentials');
  });

  it('checkEmailAvailable returns available: true when email does not exist', async () => {
    const getClient = () =>
      ({
        rpc: jest.fn().mockResolvedValue({ data: false, error: null }),
      }) as any;
    const adapter = createSupabaseAuthAdapter(getClient);
    const result = await adapter.checkEmailAvailable('new@b.co');
    expect(result).toEqual({ available: true });
  });

  it('checkEmailAvailable returns available: false when email exists', async () => {
    const getClient = () =>
      ({
        rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
      }) as any;
    const adapter = createSupabaseAuthAdapter(getClient);
    const result = await adapter.checkEmailAvailable('taken@b.co');
    expect(result).toEqual({ available: false });
  });

  it('checkEmailAvailable returns error when rpc fails', async () => {
    const getClient = () =>
      ({
        rpc: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Function not found', code: 'PGRST202' },
        }),
      }) as any;
    const adapter = createSupabaseAuthAdapter(getClient);
    const result = await adapter.checkEmailAvailable('a@b.co');
    expect(result).toHaveProperty('error');
    expect((result as any).error.message).toBe('Function not found');
  });

  it('signUp maps success to Session with response user', async () => {
    const signUpEmail = 'new@b.co';
    const session = mockSession({
      user: mockUser({ email: signUpEmail, created_at: '2024-06-01T00:00:00Z' }),
    });
    const getClient = () =>
      ({
        auth: {
          signUp: jest.fn().mockResolvedValue({ data: { session }, error: null }),
        },
      }) as any;
    const adapter = createSupabaseAuthAdapter(getClient);
    const result = await adapter.signUp(signUpEmail, 'pass');
    expect(result).toHaveProperty('session');
    expect((result as any).session.user.email).toBe(signUpEmail);
  });

  it('signUp returns EMAIL_CONFIRMATION_REQUIRED when user created but no session', async () => {
    const getClient = () =>
      ({
        auth: {
          signUp: jest.fn().mockResolvedValue({
            data: { session: null, user: mockUser({ email: 'new@b.co' }) },
            error: null,
          }),
        },
      }) as any;
    const adapter = createSupabaseAuthAdapter(getClient);
    const result = await adapter.signUp('new@b.co', 'pass');
    expect(result).toHaveProperty('error');
    expect((result as any).error.code).toBe('EMAIL_CONFIRMATION_REQUIRED');
    expect((result as any).error.message).toContain('check your email');
  });

  it('signOut returns empty on success', async () => {
    const getClient = () =>
      ({
        auth: { signOut: jest.fn().mockResolvedValue(undefined) },
      }) as any;
    const adapter = createSupabaseAuthAdapter(getClient);
    const result = await adapter.signOut();
    expect(result).not.toHaveProperty('error');
  });

  it('getSession returns null when no session', async () => {
    const getClient = () =>
      ({
        auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null } }) },
      }) as any;
    const adapter = createSupabaseAuthAdapter(getClient);
    const session = await adapter.getSession();
    expect(session).toBeNull();
  });

  it('getSession maps Supabase session to contract Session', async () => {
    const supabaseSession = mockSession();
    const getClient = () =>
      ({
        auth: { getSession: jest.fn().mockResolvedValue({ data: { session: supabaseSession } }) },
      }) as any;
    const adapter = createSupabaseAuthAdapter(getClient);
    const session = await adapter.getSession();
    expect(session).not.toBeNull();
    expect(session!.accessToken).toBe('access');
    expect(session!.user.id).toBe('user-1');
  });

  it('getCurrentUser returns null when no user', async () => {
    const getClient = () =>
      ({
        auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
      }) as any;
    const adapter = createSupabaseAuthAdapter(getClient);
    const user = await adapter.getCurrentUser();
    expect(user).toBeNull();
  });

  it('onAuthStateChange invokes listener and returns unsubscribe', () => {
    const listener = jest.fn();
    const unsubscribe = jest.fn();
    const getClient = () =>
      ({
        auth: {
          onAuthStateChange: jest.fn().mockImplementation((cb: (e: string, s: null) => void) => {
            cb('INITIAL_SESSION', null);
            return { data: { subscription: { unsubscribe } } };
          }),
        },
      }) as any;
    const adapter = createSupabaseAuthAdapter(getClient);
    const off = adapter.onAuthStateChange(listener);
    expect(listener).toHaveBeenCalledWith(null);
    off();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
