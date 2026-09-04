/**
 * Extract http(s) URLs from plain text. Order preserved; duplicates removed (first occurrence wins).
 */
const URL_IN_TEXT_RE = /https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+/gi;

export function extractUrlsFromText(text: string | null | undefined): string[] {
  if (!text || !text.trim()) return [];
  const re = new RegExp(URL_IN_TEXT_RE.source, URL_IN_TEXT_RE.flags);
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const u = m[0];
    if (!seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}
