#!/usr/bin/env node
/**
 * Jira REST client for the ticket automation (see .claude/rules/jira-ticket-automation.md).
 *
 * Credentials come from the environment first and from .env second, so the same script runs on
 * a laptop (where .env holds them) and in a cloud session (where the environment does, and there
 * is no .env). The token is never printed.
 *
 *   node scripts/jira.cjs whoami
 *   node scripts/jira.cjs projects
 *   node scripts/jira.cjs statuses <PROJECT_KEY>
 *   node scripts/jira.cjs todo <PROJECT_KEY>          # To Do issues, with description
 *   node scripts/jira.cjs issue <KEY>                 # one issue, with attachments listed
 *   node scripts/jira.cjs attachments <KEY> <dir>     # download a ticket's attachments
 *   node scripts/jira.cjs transitions <KEY>           # what states it can move to
 *   node scripts/jira.cjs move <KEY> "<STATUS NAME>"  # writes
 *   node scripts/jira.cjs comment <KEY> "<text>"      # writes
 *
 * Set OUT=<file> to write the output as UTF-8 to a file instead of stdout — Korean text survives
 * that on Windows, where a console code page may not.
 */
const fs = require('fs');
const path = require('path');

function readDotEnv() {
  const file = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(file)) return {};
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

const dotEnv = readDotEnv();
const setting = (name) => process.env[name] || dotEnv[name] || '';

// A board URL (…/jira/software/projects/KAN/boards/2) answers REST calls with HTML; keep the
// site root only, so a pasted address still works.
const BASE = setting('JIRA_BASE_URL').replace(/^(https?:\/\/[^/]+).*$/, '$1');
const AUTH =
  'Basic ' +
  Buffer.from(`${setting('JIRA_EMAIL')}:${setting('JIRA_API_TOKEN')}`).toString('base64');

async function jira(method, pathAndQuery, body) {
  const res = await fetch(`${BASE}${pathAndQuery}`, {
    method,
    headers: {
      Authorization: AUTH,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${pathAndQuery} → ${res.status} ${text.slice(0, 400)}`);
  if (text.trimStart().startsWith('<')) {
    throw new Error(`${method} ${pathAndQuery} returned HTML — is JIRA_BASE_URL the site root?`);
  }
  return text ? JSON.parse(text) : null;
}

/** Atlassian Document Format to readable text. */
function adfToText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.type === 'text') return node.text || '';
  const inner = (node.content || []).map(adfToText).join('');
  if (node.type === 'paragraph' || node.type === 'heading') return inner + '\n';
  if (node.type === 'listItem') return '- ' + inner;
  if (node.type === 'codeBlock') return '```\n' + inner + '\n```\n';
  if (node.type === 'hardBreak') return '\n';
  return inner;
}

/** Plain text to ADF paragraphs, one per line, so a multi-line comment keeps its breaks. */
function textToAdf(text) {
  return {
    type: 'doc',
    version: 1,
    content: String(text)
      .split('\n')
      .map((line) => ({
        type: 'paragraph',
        content: line ? [{ type: 'text', text: line }] : [],
      })),
  };
}

async function search(jql, fields) {
  // /search was replaced by /search/jql; fall back for sites that still have the old one.
  try {
    return await jira('POST', '/rest/api/3/search/jql', { jql, fields, maxResults: 50 });
  } catch (e) {
    if (!/→ (404|410)/.test(String(e.message))) throw e;
    const q = encodeURIComponent(jql);
    return jira('GET', `/rest/api/3/search?jql=${q}&maxResults=50&fields=${fields.join(',')}`);
  }
}

const out = [];
const say = (line) => out.push(line);

(async () => {
  const [action, a, b] = process.argv.slice(2);

  if (!BASE || !setting('JIRA_EMAIL') || !setting('JIRA_API_TOKEN')) {
    throw new Error('JIRA_BASE_URL / JIRA_EMAIL / JIRA_API_TOKEN are not set');
  }

  if (action === 'whoami') {
    const me = await jira('GET', '/rest/api/3/myself');
    say(`site: ${BASE}`);
    say(`user: ${me.displayName}  active=${me.active}`);
  } else if (action === 'projects') {
    const res = await jira('GET', '/rest/api/3/project/search?maxResults=50');
    say(`${res.total} project(s)`);
    for (const p of res.values) say(`   ${p.key.padEnd(10)} ${p.name}`);
  } else if (action === 'statuses') {
    const res = await jira('GET', `/rest/api/3/project/${a}/statuses`);
    for (const type of res) {
      say(`${type.name}:`);
      for (const s of type.statuses) say(`   ${s.name}  [${s.statusCategory?.name}]`);
    }
  } else if (action === 'todo') {
    // Filtered on the category and re-checked on the status name: a search can lag a transition
    // by a moment, and a ticket someone just finished must not be picked up again.
    const res = await search(`project = ${a} AND statusCategory = "To Do" ORDER BY created DESC`, [
      'summary',
      'status',
      'issuetype',
      'labels',
      'description',
      'attachment',
    ]);
    const issues = res.issues.filter((i) => i.fields.status?.statusCategory?.key === 'new');
    say(`${issues.length} issue(s) in To Do`);
    for (const i of issues) {
      const f = i.fields;
      say('');
      say(
        `== ${i.key}  [${f.status?.name}]  ${f.issuetype?.name}  attachments=${(f.attachment || []).length}`
      );
      say(`   ${f.summary}`);
      const desc = adfToText(f.description).trim();
      if (desc)
        say(
          desc
            .split('\n')
            .map((l) => '   | ' + l)
            .join('\n')
        );
    }
  } else if (action === 'issue') {
    const i = await jira(
      'GET',
      `/rest/api/3/issue/${a}?fields=summary,status,description,attachment,comment,parent`
    );
    const f = i.fields;
    say(`${i.key} [${f.status?.name}] ${f.summary}`);
    if (f.parent) say(`parent: ${f.parent.key}`);
    const desc = adfToText(f.description).trim();
    if (desc) say(desc);
    for (const att of f.attachment || []) say(`attachment: ${att.filename} (${att.mimeType})`);
    for (const c of f.comment?.comments || []) say(`comment: ${adfToText(c.body).trim()}`);
  } else if (action === 'attachments') {
    const dir = b || '.';
    fs.mkdirSync(dir, { recursive: true });
    const i = await jira('GET', `/rest/api/3/issue/${a}?fields=attachment`);
    for (const att of i.fields.attachment || []) {
      const res = await fetch(att.content, { headers: { Authorization: AUTH } });
      const file = path.join(dir, `${a}-${att.id}-${att.filename}`);
      fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      say(file);
    }
    if (out.length === 0) say('no attachments');
  } else if (action === 'transitions') {
    const res = await jira('GET', `/rest/api/3/issue/${a}/transitions`);
    for (const t of res.transitions) say(`${t.id}  →  ${t.to?.name}   (${t.name})`);
  } else if (action === 'move') {
    const res = await jira('GET', `/rest/api/3/issue/${a}/transitions`);
    const wanted = String(b).toLowerCase();
    const t = res.transitions.find(
      (x) => x.to?.name?.toLowerCase() === wanted || x.name?.toLowerCase() === wanted
    );
    if (!t) {
      throw new Error(
        `No transition to "${b}". Available: ${res.transitions.map((x) => x.to?.name).join(', ')}`
      );
    }
    await jira('POST', `/rest/api/3/issue/${a}/transitions`, { transition: { id: t.id } });
    say(`${a} → ${t.to.name}`);
  } else if (action === 'comment') {
    await jira('POST', `/rest/api/3/issue/${a}/comment`, { body: textToAdf(b) });
    say(`commented on ${a}`);
  } else {
    throw new Error(
      'usage: whoami | projects | statuses <KEY> | todo <KEY> | issue <KEY> | attachments <KEY> <dir> | transitions <KEY> | move <KEY> "<STATUS>" | comment <KEY> "<text>"'
    );
  }

  const text = out.join('\n');
  if (process.env.OUT) fs.writeFileSync(process.env.OUT, text, 'utf8');
  else console.log(text);
})().catch((e) => {
  console.error(String(e.message).slice(0, 600));
  process.exit(1);
});
