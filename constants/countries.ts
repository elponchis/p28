/**
 * Static country list for group location.
 * ISO 3166-1 alpha-2 codes with display names.
 * "Online" for virtual/remote groups.
 */
export const COUNTRIES = [
  { code: 'Online', name: 'Online' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'KR', name: 'South Korea' },
  { code: 'KH', name: 'Cambodia' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' },
  { code: 'SG', name: 'Singapore' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'PH', name: 'Philippines' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'TH', name: 'Thailand' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'AR', name: 'Argentina' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'EG', name: 'Egypt' },
  { code: 'KE', name: 'Kenya' },
  { code: 'GH', name: 'Ghana' },
] as const;

export type CountryCode = (typeof COUNTRIES)[number]['code'];
