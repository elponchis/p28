#!/usr/bin/env node
/**
 * Gives every course a cover: the thumbnail of its first video.
 *
 * A shelf of courses with no covers is a wall of grey placeholders — the Watch tab shows an icon
 * where the picture should be, and one folder looks like the next. Vimeo already has a frame for
 * every video, so the first lesson's thumbnail becomes the course's.
 *
 * Only courses without a cover are touched, so this is safe to rerun and will not overwrite one
 * somebody set by hand. --force replaces them anyway; --dry-run says what it would do.
 *
 *   node scripts/set-course-covers.cjs --dry-run
 *   node scripts/set-course-covers.cjs
 */
const { readEnv, vimeo, supabase, vimeoIdFromUrl, pickThumbnail } = require('./lib/vimeo.cjs');

function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    force: argv.includes('--force'),
  };
}

async function main() {
  const env = readEnv();
  const args = parseArgs(process.argv.slice(2));
  if (!env.VIMEO_ACCESS_TOKEN) throw new Error('VIMEO_ACCESS_TOKEN missing from .env');
  if (!env.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error('SUPABASE_SERVICE_ROLE_KEY missing from .env');

  const courses = await supabase(
    env,
    'GET',
    '/courses?select=id,title,cover_image_url&order=sort_order'
  );

  let set = 0;
  const skipped = [];

  for (const course of courses) {
    if (course.cover_image_url && !args.force) {
      skipped.push(`${course.title} (has one)`);
      continue;
    }

    const [lesson] = await supabase(
      env,
      'GET',
      `/lessons?course_id=eq.${course.id}&select=title,video_url&order=sort_order&limit=1`
    );
    const videoId = lesson ? vimeoIdFromUrl(lesson.video_url) : null;
    if (!videoId) {
      skipped.push(`${course.title} (no first video on Vimeo)`);
      continue;
    }

    const video = await vimeo(env.VIMEO_ACCESS_TOKEN, `/videos/${videoId}?fields=pictures.sizes`);
    const cover = pickThumbnail(video.pictures?.sizes);
    if (!cover) {
      skipped.push(`${course.title} (Vimeo has no thumbnail)`);
      continue;
    }

    console.log(`${course.title}\n   ← ${lesson.title}\n   ${cover}`);
    if (!args.dryRun) {
      await supabase(env, 'PATCH', `/courses?id=eq.${course.id}`, { cover_image_url: cover });
    }
    set += 1;
  }

  console.log(
    `\n${args.dryRun ? 'dry run: ' : ''}${set} of ${courses.length} course(s) covered` +
      (skipped.length > 0 ? `\nskipped:\n   ${skipped.join('\n   ')}` : '')
  );
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
