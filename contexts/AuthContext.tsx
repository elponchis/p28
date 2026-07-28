/**
 * Auth context: session and loading state. Uses api.auth only (no adapter/SDK imports).
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { auth, type Session } from '@/lib/api';

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    auth.getSession().then((s) => {
      if (!cancelled) {
        setSession(s);
        setIsLoading(false);
      }
    });
    const unsubscribe = auth.onAuthStateChange((s) => {
      if (!cancelled) setSession(s);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await auth.signOut();
    setSession(null);
  }, []);

  const value: AuthContextValue = { session, isLoading, signOut };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
