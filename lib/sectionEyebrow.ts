import type { SupportedLocale } from '@/lib/i18n';

/**
 * Whether the small English label over a home section title earns its place.
 *
 * The label is a typographic mark, not a second reading of the title: set against Hangul or
 * Khmer, a line of Latin capitals marks where a section starts. Set against an English title it
 * is the same words twice — GROUPS over "Your Groups", NEWS over "Latest Updates" — so English
 * keeps the rule and the serif title and drops the label.
 */
export function showsSectionEyebrow(locale: SupportedLocale): boolean {
  return locale !== 'en';
}
