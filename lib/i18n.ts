/**
 * App i18n: EN, KO (Korean), KM (Khmer).
 * Locale codes ISO 639-1: en, ko, km.
 * Use t(key) for translated strings; changeLanguage(locale) to switch.
 * Fallback: missing keys or unsupported locale → English.
 */
import { en, type TranslationShape } from './i18n/locales/en';
import { ko } from './i18n/locales/ko';
import { km } from './i18n/locales/km';

export type SupportedLocale = 'en' | 'ko' | 'km';

const resources: Record<SupportedLocale, TranslationShape> = {
  en,
  ko,
  km,
};

const FALLBACK: SupportedLocale = 'en';

let currentLocale: SupportedLocale = 'en';

function isSupported(locale: string): locale is SupportedLocale {
  return locale === 'en' || locale === 'ko' || locale === 'km';
}

/**
 * Get current app locale (en, ko, km).
 */
export function getLocale(): SupportedLocale {
  return currentLocale;
}

/**
 * Set app language. Use after user selects language or when hydrating from profile.
 * Invalid locale falls back to 'en'.
 */
export function changeLanguage(locale: string): SupportedLocale {
  const next = isSupported(locale) ? locale : FALLBACK;
  currentLocale = next;
  return next;
}

function getNested(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

/**
 * Translate key (e.g. 'tabs.home', 'profile.editProfile').
 * Returns English fallback for missing keys or unsupported locale.
 * Supports interpolation: t('common.minutesAgo', { count: 5 }) → "5m ago".
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const locale = isSupported(currentLocale) ? currentLocale : FALLBACK;
  const dict = resources[locale] ?? resources.en;
  let value = getNested(dict as Record<string, unknown>, key);
  if (typeof value !== 'string') {
    value = getNested(resources.en as Record<string, unknown>, key);
  }
  let result = typeof value === 'string' ? value : key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      result = result.replace(`{{${k}}}`, String(v));
    }
  }
  return result;
}

/**
 * User-facing label for a profile/group preferred_language code (en, ko, km).
 * Unknown codes are shown as-is; missing/empty shows an em dash.
 */
export function preferredLanguageDisplayLabel(code: string | undefined | null): string {
  if (code == null || code === '') return '—';
  if (code === 'en') return t('language.english');
  if (code === 'ko') return t('language.korean');
  if (code === 'km') return t('language.khmer');
  return code;
}

export { SupportedLocale as Locale };
