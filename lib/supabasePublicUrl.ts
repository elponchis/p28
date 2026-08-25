/**
 * Builds a public Storage object URL from a bucket + path, for buckets marked `public` (e.g.
 * assignment-materials, group-banners). Just string formatting against the public env vars — not
 * a supabase-js call, so it's safe to use outside the adapters/supabase layer.
 */
export function getPublicStorageUrl(bucket: string, path: string): string {
  const base = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '').replace(
    /\/$/,
    ''
  );
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}
