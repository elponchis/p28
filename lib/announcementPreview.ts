/**
 * Whether a platform-wide announcement has more to it than the card's one-line preview shows.
 *
 * The card keeps to a fixed height so the home screen does not grow with whatever was posted;
 * anything longer than a glance lives behind "see all".
 */

/** Past this many characters a description will not fit the card's single line. */
export const ANNOUNCEMENT_PREVIEW_CHARS = 60;

export function isAnnouncementTruncated(title: string, description: string): boolean {
  const body = description.trim();
  return (
    body.length > ANNOUNCEMENT_PREVIEW_CHARS || body.includes('\n') || title.trim().includes('\n')
  );
}
