/**
 * Shared helpers for Expo push Edge Functions: CORS, JWT verification via GoTrue, chunked Expo send.
 */

export const corsHeaders: { [key: string]: string } = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function optionsResponse(): Response {
  return new Response('ok', { headers: corsHeaders });
}

type ExpoPushResult = { status?: string; id?: string; message?: string };

export type VerifyUserResult = { ok: true; userId: string } | { ok: false; response: Response };

/**
 * Validate JWT via GoTrue (works with JWT signing keys). Use when gateway verify_jwt is disabled.
 */
export async function verifyUserFromAuthorizationHeader(params: {
  supabaseUrl: string;
  anonKey: string;
  serviceKey: string;
  authHeader: string | null;
}) {
  const { supabaseUrl, anonKey, serviceKey, authHeader } = params;
  const jwt = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!jwt) {
    return { ok: false, response: json({ error: 'Unauthorized' }, 401) };
  }

  const apikey = anonKey ?? serviceKey;
  const authUserUrl = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`;
  const userRes = await fetch(authUserUrl, {
    headers: {
      Authorization: `Bearer ${jwt}`,
      apikey,
      Accept: 'application/json',
      'X-Supabase-Api-Version': '2024-01-01',
    },
  });
  if (!userRes.ok) {
    return { ok: false, response: json({ error: 'Unauthorized' }, 401) };
  }
  const userPayload = (await userRes.json().catch(() => null)) as { id?: string } | null;
  const userId = userPayload?.id;
  if (!userId || typeof userId !== 'string') {
    return { ok: false, response: json({ error: 'Unauthorized' }, 401) };
  }
  return { ok: true, userId };
}

export type ExpoChunkSendResult = {
  ticketsOk: number;
  ticketErrors: string[];
  successfulUserIds: { [userId: string]: true };
};

type ExpoPushMessage = { to: string; userId: string; [key: string]: unknown };

const EXPO_PUSH_CHUNK_SIZE = 99;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Sends Expo messages in chunks. Strips `userId` from each object before POSTing.
 */
export async function sendExpoPushInChunks(
  messages: ExpoPushMessage[],
  options?: { maxTicketErrors?: number }
) {
  const maxTicketErrors = options?.maxTicketErrors ?? 5;
  const successfulUserIds: { [userId: string]: true } = {};
  let ticketsOk = 0;
  const ticketErrors: string[] = [];

  for (let i = 0; messages.length > i; i += EXPO_PUSH_CHUNK_SIZE) {
    const chunk = messages.slice(i, i + EXPO_PUSH_CHUNK_SIZE);
    const payload = chunk.map(({ userId: _userId, ...rest }) => rest);

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });

    const rawText = await res.text();
    let parsed: { data?: ExpoPushResult[] } = {};
    try {
      parsed = JSON.parse(rawText) as { data?: ExpoPushResult[] };
    } catch {
      console.error('Expo push non-JSON response', res.status, rawText);
      continue;
    }

    if (!res.ok) {
      console.error('Expo push error', res.status, rawText);
      continue;
    }

    const results = parsed.data;
    if (!Array.isArray(results)) {
      console.error('Expo push missing data array', rawText);
      continue;
    }

    chunk.forEach((msg, idx) => {
      const r = results[idx];
      if (r && r.status === 'ok') {
        ticketsOk += 1;
        successfulUserIds[msg.userId] = true;
      } else if (r && r.status === 'error') {
        const line = r.message ?? JSON.stringify((r as { details?: unknown }).details ?? r);
        console.error('Expo ticket error', msg.to.slice(0, 24), line);
        if (maxTicketErrors > ticketErrors.length) ticketErrors.push(line);
      }
    });
  }

  return { ticketsOk, ticketErrors, successfulUserIds };
}
