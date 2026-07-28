/**
 * Supabase adapter: wires auth, data, realtime from env.
 * Only this folder may import @supabase/supabase-js.
 * Session persisted via AsyncStorage so session survives app restart (Story 1.4).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAuthAdapter } from './auth';
import { createSupabaseDataAdapter } from './data';
import { createSupabaseRealtimeAdapter } from './realtime';

function getSupabaseClient(): SupabaseClient {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY (or EXPO_PUBLIC_* variants) must be set');
  }
  return createClient(url, key, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!client) {
    client = getSupabaseClient();
  }
  return client;
}

export const auth = createSupabaseAuthAdapter(getClient);
export const data = createSupabaseDataAdapter(getClient);
export const realtime = createSupabaseRealtimeAdapter(getClient);
