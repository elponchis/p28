import type {
  Session as SupabaseSession,
  User as SupabaseUser,
  AuthError,
  SupabaseClient,
} from '@supabase/supabase-js';
import type { AuthContract, AuthStateListener } from '../../contracts';
import type { ApiError } from '../../contracts/errors';
import type { Session, User } from '../../contracts/dto';

function toApiError(err: AuthError | Error): ApiError {
  const message = err?.message ?? 'An error occurred';
  const code =
    'code' in err && typeof (err as AuthError).code === 'string'
      ? (err as AuthError).code
      : undefined;
  return { message, code };
}

function mapUser(u: SupabaseUser | null): User | null {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email ?? undefined,
    createdAt: u.created_at ? new Date(u.created_at).toISOString() : undefined,
  };
}

function mapSession(s: SupabaseSession | null): Session | null {
  if (!s?.user) return null;
  const user = mapUser(s.user);
  if (!user) return null;
  return {
    accessToken: s.access_token,
    refreshToken: s.refresh_token ?? undefined,
    expiresAt: s.expires_at ? new Date(s.expires_at * 1000).toISOString() : undefined,
    user,
  };
}

/**
 * Supabase auth adapter. Implements AuthContract with session persistence (AsyncStorage
 * is configured when creating the Supabase client in index.ts).
 */
export function createSupabaseAuthAdapter(getClient: () => SupabaseClient): AuthContract {
  return {
    async signIn(email: string, password: string) {
      try {
        const { data, error } = await getClient().auth.signInWithPassword({ email, password });
        if (error) return { error: toApiError(error) };
        const session = mapSession(data.session);
        if (!session) return { error: { message: 'No session returned', code: 'NO_SESSION' } };
        return { session };
      } catch (e) {
        return { error: toApiError(e instanceof Error ? e : new Error(String(e))) };
      }
    },

    async checkEmailAvailable(email: string) {
      try {
        const { data, error } = await getClient().rpc('check_email_exists', {
          check_email: email.trim(),
        });
        if (error) return { error: toApiError(error) };
        const exists = data === true;
        return { available: !exists };
      } catch (e) {
        return { error: toApiError(e instanceof Error ? e : new Error(String(e))) };
      }
    },

    async signUp(email: string, password: string) {
      try {
        const { data, error } = await getClient().auth.signUp({ email, password });
        if (error) return { error: toApiError(error) };
        // Empty identities = email already exists (Supabase returns success but no new identity)
        const identities = (data.user as { identities?: unknown[] } | undefined)?.identities;
        if (data.user && Array.isArray(identities) && identities.length === 0) {
          return {
            error: {
              message: 'An account with this email already exists. Please sign in instead.',
              code: 'email_exists',
            },
          };
        }
        const session = mapSession(data.session);
        if (session) return { session };
        // No session but user created = email confirmation required (Supabase "Confirm email" setting)
        if (data.user) {
          return {
            error: {
              message: 'Please check your email to confirm your account.',
              code: 'EMAIL_CONFIRMATION_REQUIRED',
            },
          };
        }
        return { error: { message: 'No session returned', code: 'NO_SESSION' } };
      } catch (e) {
        return { error: toApiError(e instanceof Error ? e : new Error(String(e))) };
      }
    },

    async signOut() {
      try {
        await getClient().auth.signOut();
        return {};
      } catch (e) {
        return { error: toApiError(e instanceof Error ? e : new Error(String(e))) };
      }
    },

    async getSession(): Promise<Session | null> {
      try {
        const {
          data: { session },
        } = await getClient().auth.getSession();
        return mapSession(session);
      } catch (e) {
        if (__DEV__ !== false) {
          console.warn('[auth adapter] getSession failed:', e instanceof Error ? e.message : e);
        }
        return null;
      }
    },

    async getCurrentUser(): Promise<User | null> {
      try {
        const {
          data: { user },
        } = await getClient().auth.getUser();
        return mapUser(user);
      } catch (e) {
        if (__DEV__ !== false) {
          console.warn('[auth adapter] getCurrentUser failed:', e instanceof Error ? e.message : e);
        }
        return null;
      }
    },

    onAuthStateChange(listener: AuthStateListener) {
      const {
        data: { subscription },
      } = getClient().auth.onAuthStateChange((_event: string, session: SupabaseSession | null) => {
        listener(mapSession(session));
      });
      return () => subscription.unsubscribe();
    },
  };
}
