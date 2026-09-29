// Netlify version of the media API (server/index.js), backed by Netlify Blobs.
//   GET    /api/media          list gallery items
//   POST   /api/media          upload (multipart "files", header x-admin-key; keepNames=1 keeps file names as keys)
//   DELETE /api/media/<key>    delete (x-admin-key)
//   GET    /media/<key>        stream a file (supports Range for audio/video seeking)
import { getStore } from '@netlify/blobs';

const PREFIX = 'gallery/';
const ALLOWED = /^(image|video|audio)\//;
const MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.gif': 'image/gif', '.heic': 'image/heic', '.mp4': 'video/mp4', '.mov': 'video/quicktime',
  '.webm': 'video/webm', '.m4v': 'video/x-m4v', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4',
};
const ext = (name) => (name.match(/\.[^./]+$/)?.[0] || '').toLowerCase();
const mimeFor = (key) => MIME[ext(key)] || 'application/octet-stream';
const slug = (name) => name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'file';
const json = (body, status = 200) => Response.json(body, { status });

export default async (req) => {
  const url = new URL(req.url);
  const store = getStore({ name: 'media', consistency: 'strong' });
  const isAdmin = req.headers.get('x-admin-key') === (process.env.ADMIN_KEY || '') && !!process.env.ADMIN_KEY;

  // ---- file streaming ----
  if (url.pathname.startsWith('/media/')) {
    const key = decodeURIComponent(url.pathname.slice('/media/'.length));
    const data = await store.get(key, { type: 'arrayBuffer' });
    if (!data) return new Response('Not found', { status: 404 });
    const size = data.byteLength;
    const headers = {
      'Content-Type': mimeFor(key), 'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=86400',
      'Netlify-CDN-Cache-Control': 'public, max-age=31536000, durable',
    };
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') || '');
    if (m && (m[1] || m[2])) {
      const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
      const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
      if (start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
      return new Response(data.slice(start, end + 1), {
        status: 206, headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) },
      });
    }
    return new Response(data, { headers: { ...headers, 'Content-Length': String(size) } });
  }

  // ---- list ----
  if (req.method === 'GET' && url.pathname === '/api/media') {
    const { blobs } = await store.list({ prefix: PREFIX });
    const items = blobs
      .map(({ key }) => ({ key, url: `/media/${key}`, kind: mimeFor(key).split('/')[0] }))
      .filter((o) => ['image', 'video', 'audio'].includes(o.kind))
      .sort((a, b) => a.key.localeCompare(b.key));
    return json({ items }, 200);
  }

  // ---- upload ----
  if (req.method === 'POST' && url.pathname === '/api/media') {
    if (!isAdmin) return json({ error: 'Invalid admin key' }, 401);
    const form = await req.formData();
    const keep = form.get('keepNames') === '1';
    const saved = [];
    for (const f of form.getAll('files')) {
      if (typeof f === 'string' || !ALLOWED.test(f.type || mimeFor(f.name))) continue;
      const name = f.name.split('/').pop();
      const key = keep
        ? `${PREFIX}${name.replace(/[^a-zA-Z0-9._-]+/g, '-')}`
        : `${PREFIX}${Date.now()}-${Math.random().toString(16).slice(2, 8)}-${slug(name)}${ext(name) || '.' + f.type.split('/')[1]}`;
      await store.set(key, await f.arrayBuffer());
      saved.push({ key, url: `/media/${key}` });
    }
    return json({ saved });
  }

  // ---- delete ----
  if (req.method === 'DELETE' && url.pathname.startsWith('/api/media/')) {
    if (!isAdmin) return json({ error: 'Invalid admin key' }, 401);
    const key = decodeURIComponent(url.pathname.slice('/api/media/'.length));
    if (!key.startsWith(PREFIX)) return json({ error: 'bad key' }, 400);
    await store.delete(key);
    return json({ ok: true });
  }

  return json({ error: 'Not found' }, 404);
};

export const config = { path: ['/api/media', '/api/media/*', '/media/*'] };
