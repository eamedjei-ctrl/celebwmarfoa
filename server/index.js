import 'dotenv/config';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import multer from 'multer';
import { createBucket, mimeFor } from './storage.js';

const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'marfoa-admin';
const PREFIX = 'gallery/';
const ALLOWED = /^(image|video|audio)\//;

const bucket = await createBucket();
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

const requireAdmin = (req, res, next) =>
  req.get('x-admin-key') === ADMIN_KEY ? next() : res.status(401).json({ error: 'Invalid admin key' });

const slug = (name) => path.basename(name, path.extname(name)).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'file';

// List everything in the gallery, oldest first so the story reads in upload order.
app.get('/api/media', async (_req, res) => {
  try {
    const items = (await bucket.list(PREFIX))
      .map((o) => {
        const type = mimeFor(o.key);
        return { key: o.key, url: `/media/${o.key}`, kind: type.split('/')[0], size: o.size, modified: o.modified };
      })
      .filter((o) => ['image', 'video', 'audio'].includes(o.kind))
      .sort((a, b) => a.key.localeCompare(b.key));
    res.json({ items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not list media' });
  }
});

app.post('/api/media', requireAdmin, upload.array('files', 50), async (req, res) => {
  const saved = [];
  for (const f of req.files || []) {
    if (!ALLOWED.test(f.mimetype)) continue;
    const ext = path.extname(f.originalname).toLowerCase() || '.' + f.mimetype.split('/')[1];
    const key = `${PREFIX}${Date.now()}-${crypto.randomBytes(3).toString('hex')}-${slug(f.originalname)}${ext}`;
    await bucket.put(key, f.buffer);
    saved.push({ key, url: `/media/${key}` });
  }
  res.json({ saved });
});

app.delete('/api/media/*key', requireAdmin, async (req, res) => {
  const key = [].concat(req.params.key).join('/');
  if (!key.startsWith(PREFIX)) return res.status(400).json({ error: 'bad key' });
  try { await bucket.del(key); res.json({ ok: true }); }
  catch { res.status(404).json({ error: 'not found' }); }
});

// Stream objects out of the bucket (supports byte ranges so videos can seek).
app.get('/media/*key', async (req, res) => {
  const key = [].concat(req.params.key).join('/');
  let meta;
  try { meta = await bucket.head(key); } catch { return res.status(404).end(); }
  res.set({ 'Content-Type': meta.type, 'Cache-Control': 'public, max-age=86400', 'Accept-Ranges': 'bytes' });
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  let range;
  if (m && (m[1] || m[2])) {
    const start = m[1] ? Number(m[1]) : Math.max(0, meta.size - Number(m[2]));
    const end = m[1] && m[2] ? Math.min(Number(m[2]), meta.size - 1) : meta.size - 1;
    if (start > end) return res.status(416).set('Content-Range', `bytes */${meta.size}`).end();
    range = { start, end };
    res.status(206).set('Content-Range', `bytes ${start}-${end}/${meta.size}`);
  }
  res.set('Content-Length', range ? range.end - range.start + 1 : meta.size);
  if (req.method === 'HEAD') return res.end();
  const stream = await bucket.get(key, range);
  stream.on('error', () => res.destroy());
  stream.pipe(res);
});

app.use(express.static(path.resolve('public'), { extensions: ['html'] }));

app.listen(PORT, () => console.log(`🎂 Birthday site on http://localhost:${PORT}  ·  bucket: ${bucket.kind}`));
