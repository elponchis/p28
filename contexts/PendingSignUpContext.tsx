/**
 * Holds email/password between sign-up and onboarding so the account
 * is only created when the user completes onboarding. Optionally holds
 * userId when signUp has already succeeded (so onboarding skips it).
 */
import React, { createContext, useCallback, useContext, useState } from 'react';

type PendingSignUp = { email: string; password: string; userId?: string } | null;

type PendingSignUpContextValue = {
  pendingSignUp: PendingSignUp;
  setPendingSignUp: (email: string, password: string, userId?: string) => void;
  clearPendingSignUp: () => void;
};

const PendingSignUpContext = createContext<PendingSignUpContextValue | null>(null);

export function PendingSignUpProvider({ children }: { children: React.ReactNode }) {
  const [pendingSignUp, setPendingState] = useState<PendingSignUp>(null);

  const setPendingSignUp = useCallback((email: string, password: string, userId?: string) => {
    setPendingState({ email, password, userId });
  }, []);

  const clearPendingSignUp = useCallback(() => {
    setPendingState(null);
  }, []);

  const value: PendingSignUpContextValue = {
    pendingSignUp,
    setPendingSignUp,
    clearPendingSignUp,
  };

  return <PendingSignUpContext.Provider value={value}>{children}</PendingSignUpContext.Provider>;
}

export function usePendingSignUp(): PendingSignUpContextValue {
  const ctx = useContext(PendingSignUpContext);
  if (!ctx) throw new Error('usePendingSignUp must be used within PendingSignUpProvider');
  return ctx;
}
