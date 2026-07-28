import React, { createContext, useContext, useMemo, useState } from 'react';
import { changeLanguage, getLocale } from '@/lib/i18n';

type LocaleContextValue = {
  /** Current app locale/language code (en, ko, km). */
  locale: string;
  setLocale: (next: string) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<string>(() => getLocale());

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale: (next) => {
        const normalized = changeLanguage(next);
        setLocaleState(normalized);
      },
    }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
