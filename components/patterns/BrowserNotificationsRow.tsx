/**
 * The "browser notifications" switch.
 *
 * Self-contained on purpose: it owns its own availability check, permission state and busy flag,
 * so a screen can drop it in without knowing anything about Web Push. Two screens render the
 * notification preferences in this app, and a toggle that lives in only one of them is a toggle
 * the user cannot find.
 *
 * Renders nothing where the browser cannot deliver — no VAPID key configured, or an environment
 * without the APIs. A switch that cannot work is worse than no switch.
 */
import { useCallback, useEffect, useState } from 'react';

import { LabeledSwitchRow } from '@/components/patterns/LabeledSwitchRow';
import { t } from '@/lib/i18n';
import {
  disableWebPush,
  enableWebPush,
  isWebPushConfigured,
  isWebPushEnabled,
  isWebPushSupported,
} from '@/lib/webPush';

/** How long the switch waits on the browser's permission prompt before becoming usable again. */
const PROMPT_TIMEOUT_MS = 30000;

export interface BrowserNotificationsRowProps {
  userId: string | undefined;
}

export function BrowserNotificationsRow({ userId }: BrowserNotificationsRowProps) {
  const available = isWebPushSupported() && isWebPushConfigured();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!available) return;
    void isWebPushEnabled().then(setEnabled);
  }, [available]);

  const handleToggle = useCallback(
    async (next: boolean) => {
      if (!userId) return;
      setBusy(true);

      // Declining the prompt is a real answer, not an error to shout about; the switch springing
      // back says it.
      const attempt = next ? enableWebPush(userId) : disableWebPush().then(() => false);

      // The permission prompt has no deadline: a user who ignores it rather than answering leaves
      // requestPermission() pending forever, and awaiting that alone would leave the switch
      // disabled for the rest of the session. The busy state stops waiting while the attempt
      // keeps running, so a late answer still moves the switch.
      void attempt.then(setEnabled).catch(() => setEnabled(false));
      await Promise.race([
        attempt.catch(() => undefined),
        new Promise((resolve) => setTimeout(resolve, PROMPT_TIMEOUT_MS)),
      ]);
      setBusy(false);
    },
    [userId]
  );

  if (!available) return null;

  return (
    <LabeledSwitchRow
      label={t('notifications.browserNotifications')}
      value={enabled}
      onValueChange={handleToggle}
      disabled={busy}
      accessibilityLabel={t('notifications.browserNotifications')}
      accessibilityHint={t('notifications.browserNotificationsHint')}
    />
  );
}
