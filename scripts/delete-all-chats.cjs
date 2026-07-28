/**
 * Deletes all chats from the database. Cascade removes chat_members, chat_messages,
 * chat_folder_items, and chat_message_reactions.
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env (service role bypasses RLS).
 * Run: npm run db:delete-chats
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load .env from project root
try {
  const envPath = path.join(__dirname, '..', '.env');
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
} catch {}

const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    'Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Add them to .env (see .env.example).'
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const { error } = await supabase.from('chats').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) {
    console.error('Failed to delete chats:', error.message);
    process.exit(1);
  }
  console.log('Deleted all chats.');
}

main();
