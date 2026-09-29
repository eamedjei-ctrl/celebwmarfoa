// Uploads everything in ./seed into the bucket's gallery/ prefix (skips files already there).
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createBucket } from './storage.js';

const bucket = await createBucket();
const existing = new Set((await bucket.list('gallery/')).map((o) => path.basename(o.key)));
const files = (await fs.readdir('seed')).filter((f) => !f.startsWith('.')).sort();

for (const [i, f] of files.entries()) {
  const name = `seed-${String(i + 1).padStart(3, '0')}-${f.toLowerCase().replace(/[^a-z0-9.]+/g, '-')}`;
  if (existing.has(name)) { console.log('skip', name); continue; }
  await bucket.put(`gallery/${name}`, await fs.readFile(path.join('seed', f)));
  console.log('uploaded', name, '→', bucket.kind);
}
