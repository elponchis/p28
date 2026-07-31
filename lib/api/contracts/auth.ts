import type { Session, User, SignUpProfileMetadata } from './dto';
import type { ApiError } from './errors';

export type AuthStateListener = (session: Session | null) => void;

/**
 * Auth contract. Adapters (e.g. Supabase) implement this.
 * App code uses only this interface via the facade.
 */
export interface AuthContract {
  signIn(email: string, password: string): Promise<{ session: Session } | { error: ApiError }>;
  /** metadata is forwarded as auth signUp options.data; the on_auth_user_created DB trigger reads it to create the profiles row. */
  signUp(
    email: string,
    password: string,
    metadata?: SignUpProfileMetadata
  ): Promise<{ session: Session } | { error: ApiError }>;
  /** Returns whether the email is available (not already registered). Does not create a user. */
  checkEmailAvailable(email: string): Promise<{ available: boolean } | { error: ApiError }>;
  signOut(): Promise<{ error?: ApiError }>;
  getSession(): Promise<Session | null>;
  getCurrentUser(): Promise<User | null>;
  onAuthStateChange(listener: AuthStateListener): () => void;
  /** Emails a password-recovery link. Always resolves without error (no email-existence leak) unless the request itself fails. */
  requestPasswordReset(email: string, redirectTo?: string): Promise<{ error?: ApiError }>;
  /** Establishes the short-lived recovery session from the tokens in the emailed link, so updatePassword can be called. */
  setSessionFromRecoveryTokens(
    accessToken: string,
    refreshToken: string
  ): Promise<{ session: Session } | { error: ApiError }>;
  /** Overwrites the current user's password in the DB. Requires an active (recovery or normal) session. */
  updatePassword(newPassword: string): Promise<{ error?: ApiError }>;
}
