import { useEffect } from 'react';
import { Platform } from 'react-native';

/** Shown after the section name, so a browser tab says where in which app it is. */
const APP_NAME = 'P2:8';

/**
 * Names the browser tab after the section being viewed.
 *
 * The visible header used to be the only thing saying which section this was; with it gone on
 * desktop (KAN-40), a screen reader and the browser's own tab strip have nothing left. The title
 * was empty on every route before this — the static shell sets one, but nothing updates it as
 * the router moves — so this closes a gap rather than restoring something.
 *
 * Web only: on native the tab bar is on screen and there is no document to title.
 */
export function useWebDocumentTitle(section: string | undefined): void {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.title = section ? `${section} · ${APP_NAME}` : APP_NAME;
  }, [section]);
}
