// Uploads every file in the local ./bucket/gallery folder to a deployed site, keeping the same
// file names (so photo and playlist order are preserved). Skips files already there.
//
//   SITE=https://your-site.netlify.app ADMIN_KEY=... npm run push-media
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';

const SITE = (process.env.SITE || '').replace(/\/$/, '');
const KEY = process.env.ADMIN_KEY;
if (!SITE || !KEY) {
  console.error('Usage: SITE=https://your-site.netlify.app ADMIN_KEY=... npm run push-media');
  process.exit(1);
}
const dir = path.resolve(process.env.LOCAL_BUCKET_DIR || 'bucket', 'gallery');
const files = (await fs.readdir(dir)).filter((f) => !f.startsWith('.')).sort();
const existing = new Set(((await (await fetch(`${SITE}/api/media`)).json()).items || []).map((i) => i.key.split('/').pop()));

let uploaded = 0;
for (const name of files) {
  if (existing.has(name)) { console.log('exists  ', name); continue; }
  const fd = new FormData();
  fd.append('keepNames', '1');
  fd.append('files', new Blob([await fs.readFile(path.join(dir, name))]), name);
  const r = await fetch(`${SITE}/api/media`, { method: 'POST', headers: { 'x-admin-key': KEY }, body: fd });
  if (!r.ok) { console.error('FAILED  ', name, r.status, await r.text()); process.exit(1); }
  uploaded++;
  console.log('uploaded', name);
}
const { items } = await (await fetch(`${SITE}/api/media`)).json();
console.log(`\n${uploaded} uploaded · ${items.length} items live on ${SITE} · ${files.length} local files`);
process.exit(items.length >= files.length ? 0 : 1);
