/**
 * Unit tests for lib/i18n (t() and changeLanguage).
 * Run from project root: npm run test:unit
 */
import { changeLanguage, getLocale, preferredLanguageDisplayLabel, t } from '@/lib/i18n';

describe('i18n', () => {
  beforeEach(() => {
    changeLanguage('en');
  });

  describe('t()', () => {
    it('returns English string for en locale', () => {
      changeLanguage('en');
      expect(t('tabs.home')).toBe('Home');
      expect(t('profile.editProfile')).toBe('Edit profile');
      expect(t('language.english')).toBe('English');
    });

    it('returns Korean string for ko locale', () => {
      changeLanguage('ko');
      expect(t('tabs.home')).toBe('홈');
      expect(t('profile.editProfile')).toBe('프로필 수정');
      expect(t('language.korean')).toBe('한국어');
    });

    it('returns Khmer string for km locale', () => {
      changeLanguage('km');
      expect(t('tabs.home')).toBe('ផ្ទះ');
      expect(t('profile.editProfile')).toBe('កែសម្រួលប្រវត្តិរូប');
    });

    it('returns conduct keys for en, ko, km', () => {
      changeLanguage('en');
      expect(t('conduct.title')).toBe('Conduct guidelines');
      expect(t('conduct.intro').length).toBeGreaterThan(10);

      changeLanguage('ko');
      expect(t('conduct.title')).toBe('행동 지침');
      expect(t('conduct.intro').length).toBeGreaterThan(10);

      changeLanguage('km');
      expect(t('conduct.title')).toBe('វិធានសីលធម៌ក្នុងការប្រើប្រាស់');
      expect(t('conduct.intro').length).toBeGreaterThan(10);
    });

    it('interpolates params into translated string', () => {
      changeLanguage('en');
      expect(t('common.minutesAgo', { count: 5 })).toBe('5m ago');
      expect(t('common.hoursAgo', { count: 2 })).toBe('2h ago');

      changeLanguage('ko');
      expect(t('common.minutesAgo', { count: 5 })).toBe('5분 전');
      expect(t('common.hoursAgo', { count: 2 })).toBe('2시간 전');
    });

    it('falls back to en for unknown key', () => {
      changeLanguage('ko');
      expect(t('tabs.nonexistent')).toBe('tabs.nonexistent');
    });

    it('falls back to en for unsupported locale', () => {
      changeLanguage('fr' as 'en');
      expect(getLocale()).toBe('en');
      expect(t('tabs.home')).toBe('Home');
    });
  });

  describe('changeLanguage', () => {
    it('sets locale to supported value', () => {
      expect(changeLanguage('ko')).toBe('ko');
      expect(getLocale()).toBe('ko');
      expect(changeLanguage('km')).toBe('km');
      expect(getLocale()).toBe('km');
    });

    it('falls back to en for invalid locale', () => {
      expect(changeLanguage('xx')).toBe('en');
      expect(getLocale()).toBe('en');
    });
  });

  describe('getLocale', () => {
    it('returns current locale', () => {
      expect(getLocale()).toBe('en');
      changeLanguage('ko');
      expect(getLocale()).toBe('ko');
    });
  });

  describe('preferredLanguageDisplayLabel', () => {
    it('returns em dash for empty or missing', () => {
      expect(preferredLanguageDisplayLabel(undefined)).toBe('—');
      expect(preferredLanguageDisplayLabel(null)).toBe('—');
      expect(preferredLanguageDisplayLabel('')).toBe('—');
    });

    it('returns localized name for supported codes', () => {
      changeLanguage('en');
      expect(preferredLanguageDisplayLabel('en')).toBe('English');
      expect(preferredLanguageDisplayLabel('ko')).toBe('Korean');
      expect(preferredLanguageDisplayLabel('km')).toBe('Khmer');
      changeLanguage('ko');
      expect(preferredLanguageDisplayLabel('en')).toBe('영어');
    });

    it('returns raw code for unknown locale', () => {
      expect(preferredLanguageDisplayLabel('es')).toBe('es');
    });
  });
});
