#!/usr/bin/env node
/**
 * Turns a Vimeo folder into a Watch course.
 *
 * One folder, or several joined into a single course — a training-school course lives in three
 * folders on Vimeo and is one thing to the people watching it.
 *
 * Courses arrive unpublished: visible to admins, nobody else, whatever their group and dates say.
 * Publishing is a decision about who and when, which belongs to whoever is opening the term, not
 * to an import script that happens to run first.
 *
 * Reads VIMEO_ACCESS_TOKEN, EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.
 *
 *   node scripts/import-vimeo-folder.cjs --folder 12099375 --title "A. 개인경건 과정" --dry-run
 *   node scripts/import-vimeo-folder.cjs --folder 14392583,20054244,22863256 --title "D 과정"
 */
const fs = require('fs');
const path = require('path');

function readEnv() {
  const file = path.join(__dirname, '..', '.env');
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

function parseArgs(argv) {
  const args = { dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--folder') args.folders = argv[++i].split(',').map((s) => s.trim());
    else if (arg === '--title') args.title = argv[++i];
    else if (arg === '--description') args.description = argv[++i];
  }
  if (!args.folders || !args.title) {
    console.error(
      'usage: --folder <id[,id...]> --title "<course title>" [--description ...] [--dry-run]'
    );
    process.exit(1);
  }
  return args;
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

/** Vimeo hands back newest first; a course is watched oldest first. */
function lessonsFromFolder(videos) {
  return [...videos].reverse().map((v) => ({
    title: (v.name || '').replace(/\.(mp4|mov|m4v)$/i, '').trim(),
    // The whole link, hash and all: an unlisted video without its hash answers "Private video".
    videoUrl: v.link,
  }));
}

async function main() {
  const env = readEnv();
  const args = parseArgs(process.argv.slice(2));
  if (!env.VIMEO_ACCESS_TOKEN) throw new Error('VIMEO_ACCESS_TOKEN missing from .env');
  if (!env.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error('SUPABASE_SERVICE_ROLE_KEY missing from .env');

  const lessons = [];
  for (const folder of args.folders) {
    const data = await vimeo(
      env.VIMEO_ACCESS_TOKEN,
      `/me/projects/${folder}/videos?per_page=100&fields=uri,name,link,privacy.embed`
    );
    const restricted = data.data.filter((v) => v.privacy?.embed === 'whitelist').length;
    console.log(
      `folder ${folder}: ${data.data.length} videos` +
        (restricted ? `  (${restricted} embed-restricted — check the domain allow list)` : '')
    );
    lessons.push(...lessonsFromFolder(data.data));
  }

  const existing = await supabase(
    env,
    'GET',
    `/courses?select=id,title&title=eq.${encodeURIComponent(args.title)}`
  );
  if (existing.length > 0) {
    console.error(
      `A course titled "${args.title}" already exists (${existing[0].id}). Nothing written.`
    );
    process.exit(1);
  }

  console.log(`\n→ course "${args.title}" with ${lessons.length} lessons, unpublished`);
  console.log(
    lessons
      .slice(0, 3)
      .map((l, i) => `   ${i + 1}. ${l.title}`)
      .join('\n')
  );
  if (lessons.length > 3) console.log(`   … ${lessons.length - 3} more`);

  if (args.dryRun) {
    console.log('\ndry run — nothing written.');
    return;
  }

  const [course] = await supabase(env, 'POST', '/courses', {
    group_id: null,
    title: args.title,
    description: args.description ?? null,
    sort_order: 0,
    is_published: false,
  });
  await supabase(
    env,
    'POST',
    '/lessons',
    lessons.map((l, i) => ({
      course_id: course.id,
      title: l.title,
      video_url: l.videoUrl,
      sort_order: i,
    }))
  );
  console.log(`\nwrote course ${course.id} and ${lessons.length} lessons.`);
  console.log('Assign a group and a term in the admin screen to open it.');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
