#!/usr/bin/env node
/**
 * Turns a Vimeo folder into a Watch course.
 *
 * One folder, or several joined into a single course — a training-school course lives in three
 * folders on Vimeo and is one thing to the people watching it.
 *
 * Courses arrive unpublished unless --publish says so: visible to admins, nobody else, whatever
 * their group and dates say. Publishing stays something a person decides, and keeping it a flag
 * rather than a default keeps it one — an import that opens videos to everybody should have to
 * say so out loud.
 *
 * A whole catalogue goes in at once with --manifest: a JSON array of the same options, read from
 * disk as UTF-8, which on Windows is also the only reliable way to pass Korean titles through.
 * Titles already present are skipped rather than duplicated, so a manifest can be rerun.
 *
 * Reads VIMEO_ACCESS_TOKEN, EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.
 *
 *   node scripts/import-vimeo-folder.cjs --folder 12099375 --title "A. 개인경건 과정" --dry-run
 *   node scripts/import-vimeo-folder.cjs --folder 14392583,20054244,22863256 --title "D 과정"
 *   node scripts/import-vimeo-folder.cjs --manifest scripts/data/sinaesga-public.json --dry-run
 *
 * A manifest entry:
 *   { "folders": ["19136301", "19136299"], "title": "성경개관",
 *     "description": "기본 양육 과정 · 양육2단계 : 성장",
 *     "track": "general", "publish": true, "sortOrder": 12 }
 */
const fs = require('fs');
const path = require('path');

const TRACKS = ['general', 'training_school'];

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
    else if (arg === '--publish') args.publish = true;
    else if (arg === '--manifest') args.manifest = argv[++i];
    else if (arg === '--folder') args.folders = argv[++i].split(',').map((s) => s.trim());
    else if (arg === '--title') args.title = argv[++i];
    else if (arg === '--description') args.description = argv[++i];
    else if (arg === '--track') args.track = argv[++i];
    else if (arg === '--sort-order') args.sortOrder = Number(argv[++i]);
  }
  if (!args.manifest && (!args.folders || !args.title)) {
    console.error(
      'usage: --folder <id[,id...]> --title "<title>" [--description ...]\n' +
        '       [--track general|training_school] [--sort-order N] [--publish] [--dry-run]\n' +
        '   or: --manifest <file.json> [--dry-run]'
    );
    process.exit(1);
  }
  return args;
}

/** One import, however it was asked for. The defaults live here so both routes share them. */
function normalizeJob(job, index) {
  const folders = (Array.isArray(job.folders) ? job.folders : String(job.folders ?? '').split(','))
    .map((folder) => String(folder).trim())
    .filter(Boolean);
  if (folders.length === 0 || !job.title) {
    throw new Error(`Entry ${index + 1} needs folders and a title: ${JSON.stringify(job)}`);
  }
  const track = job.track ?? 'general';
  if (!TRACKS.includes(track)) {
    throw new Error(`Entry ${index + 1}: track must be one of ${TRACKS.join(', ')}`);
  }
  return {
    folders,
    title: job.title,
    description: job.description ?? null,
    track,
    publish: job.publish === true,
    sortOrder: Number.isFinite(job.sortOrder) ? job.sortOrder : 0,
  };
}

function jobsFrom(args) {
  if (args.manifest) {
    const parsed = JSON.parse(fs.readFileSync(args.manifest, 'utf8'));
    if (!Array.isArray(parsed)) throw new Error('A manifest is a JSON array of entries.');
    return parsed.map(normalizeJob);
  }
  return [
    normalizeJob(
      {
        folders: args.folders,
        title: args.title,
        description: args.description,
        track: args.track,
        publish: args.publish,
        sortOrder: args.sortOrder,
      },
      0
    ),
  ];
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

/** Returns false when a course of that title was already there, so a rerun is a no-op. */
async function importOne(env, job, dryRun) {
  const lessons = [];
  for (const folder of job.folders) {
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
    `/courses?select=id,title&title=eq.${encodeURIComponent(job.title)}`
  );
  if (existing.length > 0) {
    console.log(`skipped "${job.title}": a course of that name already exists (${existing[0].id})`);
    return false;
  }

  console.log(
    `\n→ "${job.title}" (${job.track}) — ${lessons.length} lessons, ` +
      `${job.publish ? 'published, open to everyone' : 'unpublished'}`
  );
  console.log(
    lessons
      .slice(0, 3)
      .map((l, i) => `   ${i + 1}. ${l.title}`)
      .join('\n')
  );
  if (lessons.length > 3) console.log(`   … ${lessons.length - 3} more`);

  if (dryRun) {
    console.log('   dry run — nothing written.');
    return true;
  }

  const [course] = await supabase(env, 'POST', '/courses', {
    group_id: null,
    title: job.title,
    description: job.description,
    track: job.track,
    sort_order: job.sortOrder,
    is_published: job.publish,
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
  console.log(`   wrote course ${course.id} and ${lessons.length} lessons.`);
  return true;
}

async function main() {
  const env = readEnv();
  const args = parseArgs(process.argv.slice(2));
  if (!env.VIMEO_ACCESS_TOKEN) throw new Error('VIMEO_ACCESS_TOKEN missing from .env');
  if (!env.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error('SUPABASE_SERVICE_ROLE_KEY missing from .env');

  const jobs = jobsFrom(args);
  const skipped = [];
  let written = 0;

  for (const job of jobs) {
    if (await importOne(env, job, args.dryRun)) written += 1;
    else skipped.push(job.title);
  }

  console.log(
    `\n${args.dryRun ? 'dry run: ' : ''}${written} of ${jobs.length} course(s)` +
      (skipped.length > 0 ? `; skipped ${skipped.length}: ${skipped.join(', ')}` : '')
  );
  if (written > 0 && !args.dryRun) {
    console.log('Unpublished ones open from the Watch admin screen.');
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
