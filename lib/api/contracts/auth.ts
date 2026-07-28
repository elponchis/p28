import type { Session, User } from './dto';
import type { ApiError } from './errors';

export type AuthStateListener = (session: Session | null) => void;

/**
 * Auth contract. Adapters (e.g. Supabase) implement this.
 * App code uses only this interface via the facade.
 */
export interface AuthContract {
  signIn(email: string, password: string): Promise<{ session: Session } | { error: ApiError }>;
  signUp(email: string, password: string): Promise<{ session: Session } | { error: ApiError }>;
  /** Returns whether the email is available (not already registered). Does not create a user. */
  checkEmailAvailable(email: string): Promise<{ available: boolean } | { error: ApiError }>;
  signOut(): Promise<{ error?: ApiError }>;
  getSession(): Promise<Session | null>;
  getCurrentUser(): Promise<User | null>;
  onAuthStateChange(listener: AuthStateListener): () => void;
}
