// Copies every object from the local ./bucket folder into the S3-compatible bucket configured in .env.
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createBucket } from './storage.js';

if (!process.env.S3_BUCKET) {
  console.error('Set S3_BUCKET (and the other S3_* values) in .env first.');
  process.exit(1);
}
const root = path.resolve(process.env.LOCAL_BUCKET_DIR || 'bucket');
const cloud = await createBucket();
const already = new Set((await cloud.list('')).map((o) => o.key));

const walk = async (dir) => (await Promise.all((await fs.readdir(dir, { withFileTypes: true })).map((e) => {
  const full = path.join(dir, e.name);
  return e.isDirectory() ? walk(full) : e.name.startsWith('.') ? [] : [full];
}))).flat();

let copied = 0;
for (const file of await walk(root)) {
  const key = path.relative(root, file).split(path.sep).join('/');
  if (already.has(key)) { console.log('exists ', key); continue; }
  await cloud.put(key, await fs.readFile(file));
  copied++;
  console.log('copied ', key);
}
const after = await cloud.list('');
const local = await walk(root);
console.log(`\n${copied} copied · ${after.length} objects in ${cloud.kind} · ${local.length} local files`);
process.exit(after.length >= local.length ? 0 : 1);
