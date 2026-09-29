// Bucket abstraction: local folder by default, any S3-compatible bucket
// (AWS S3, Cloudflare R2, Supabase Storage, MinIO) when S3_BUCKET is set.
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';

const MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.gif': 'image/gif', '.heic': 'image/heic', '.mp4': 'video/mp4', '.mov': 'video/quicktime',
  '.webm': 'video/webm', '.m4v': 'video/x-m4v', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4',
};
export const mimeFor = (key) => MIME[path.extname(key).toLowerCase()] || 'application/octet-stream';

function localBucket(root) {
  const safe = (key) => {
    const p = path.resolve(root, key);
    if (!p.startsWith(path.resolve(root) + path.sep)) throw new Error('bad key');
    return p;
  };
  return {
    kind: `local (${root})`,
    async put(key, buf) {
      const p = safe(key);
      await fs.mkdir(path.dirname(p), { recursive: true });
      await fs.writeFile(p, buf);
    },
    async list(prefix = '') {
      const dir = safe(prefix || '.');
      const out = [];
      const walk = async (d) => {
        for (const e of await fs.readdir(d, { withFileTypes: true }).catch(() => [])) {
          const full = path.join(d, e.name);
          if (e.isDirectory()) await walk(full);
          else if (!e.name.startsWith('.')) {
            const st = await fs.stat(full);
            out.push({ key: path.relative(root, full).split(path.sep).join('/'), size: st.size, modified: st.mtime });
          }
        }
      };
      await walk(dir === path.resolve(root, '.') ? path.resolve(root) : dir);
      return out;
    },
    async head(key) {
      const st = await fs.stat(safe(key));
      return { size: st.size, type: mimeFor(key) };
    },
    // range: { start, end } inclusive, optional
    async get(key, range) {
      return createReadStream(safe(key), range || {});
    },
    async del(key) { await fs.unlink(safe(key)); },
  };
}

async function s3Bucket() {
  const { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } =
    await import('@aws-sdk/client-s3');
  const Bucket = process.env.S3_BUCKET;
  const client = new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: !!process.env.S3_ENDPOINT,
    credentials: process.env.S3_ACCESS_KEY_ID ? {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    } : undefined,
  });
  return {
    kind: `s3 (${Bucket})`,
    async put(key, buf) {
      await client.send(new PutObjectCommand({ Bucket, Key: key, Body: buf, ContentType: mimeFor(key) }));
    },
    async list(prefix = '') {
      const out = [];
      let ContinuationToken;
      do {
        const r = await client.send(new ListObjectsV2Command({ Bucket, Prefix: prefix, ContinuationToken }));
        for (const o of r.Contents || []) out.push({ key: o.Key, size: o.Size, modified: o.LastModified });
        ContinuationToken = r.IsTruncated ? r.NextContinuationToken : undefined;
      } while (ContinuationToken);
      return out;
    },
    async head(key) {
      const r = await client.send(new HeadObjectCommand({ Bucket, Key: key }));
      return { size: r.ContentLength, type: r.ContentType || mimeFor(key) };
    },
    async get(key, range) {
      const Range = range ? `bytes=${range.start}-${range.end}` : undefined;
      return (await client.send(new GetObjectCommand({ Bucket, Key: key, Range }))).Body;
    },
    async del(key) { await client.send(new DeleteObjectCommand({ Bucket, Key: key })); },
  };
}

export async function createBucket() {
  if (process.env.S3_BUCKET) return s3Bucket();
  return localBucket(path.resolve(process.env.LOCAL_BUCKET_DIR || 'bucket'));
}
