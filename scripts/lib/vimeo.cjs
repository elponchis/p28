/**
 * The bits both Vimeo scripts need: the two APIs, and how to read a video's id and its thumbnail.
 *
 * Shared rather than copied because the thumbnail rule in particular is one someone will want to
 * change once — importing a course and backfilling an old one should not disagree about which
 * size a cover is.
 */
const fs = require('fs');
const path = require('path');

function readEnv() {
  const file = path.join(__dirname, '..', '..', '.env');
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const at = trimmed.indexOf('=');
    if (at === -1) continue;
    env[trimmed.slice(0, at)] = trimmed
      .slice(at + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
  }
  return env;
}

async function vimeo(token, url) {
  const res = await fetch(`https://api.vimeo.com${url}`, {
    headers: {
      Authorization: `bearer ${token}`,
      Accept: 'application/vnd.vimeo.*+json;version=3.4',
    },
  });
  if (!res.ok) throw new Error(`Vimeo ${url} → ${res.status} ${await res.text()}`);
  return res.json();
}

async function supabase(env, method, pathAndQuery, body) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  const base = env.EXPO_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const res = await fetch(`${base}/rest/v1${pathAndQuery}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${method} ${pathAndQuery} → ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

/** The numeric id out of https://vimeo.com/860457836/d4612a48c0 or a player URL. */
function vimeoIdFromUrl(url) {
  const match = /vimeo\.com\/(?:video\/)?(\d+)/.exec(String(url || ''));
  return match ? match[1] : null;
}

/**
 * A cover big enough for the widest card without being a 1920 poster: cards top out around 380px,
 * so 960 covers a 2× screen. Falls back to the largest size on offer when that one is missing.
 */
const COVER_WIDTH = 960;

function pickThumbnail(sizes) {
  if (!Array.isArray(sizes) || sizes.length === 0) return null;
  const ordered = [...sizes].sort((a, b) => a.width - b.width);
  const fitting = ordered.filter((s) => s.width <= COVER_WIDTH);
  const chosen = fitting.length > 0 ? fitting[fitting.length - 1] : ordered[0];
  return chosen.link || null;
}

module.exports = { readEnv, vimeo, supabase, vimeoIdFromUrl, pickThumbnail, COVER_WIDTH };
