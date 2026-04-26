/**
 * Storage endpoints — replace Supabase Storage with direct S3 access.
 *
 * Two flows:
 *   POST /api/storage/sign-upload  -> presigned PUT URL (browser uploads directly to S3)
 *   POST /api/storage/sign-download -> presigned GET URL for private objects
 *   DELETE /api/storage/object     -> remove an object
 *   GET    /api/storage/public-url -> stable CDN URL for objects under /public
 *
 * The Supabase shim's `storage.from(bucket).upload/createSignedUrl/getPublicUrl`
 * calls now route to these endpoints, so existing UI code (whitelabel logos,
 * tender docs, employee docs, etc.) keeps working without changes.
 *
 * "Bucket" in Supabase terms maps to a path prefix in our single S3 bucket:
 *   public buckets  -> public/<bucket>/<key>   (CloudFront-fronted)
 *   private buckets -> private/<bucket>/<key>  (signed URLs only)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';

const PUBLIC_BUCKETS = new Set([
  'sop-images',
  'organization-assets',
  'tenant-logos',
]);

let s3: S3Client | null = null;
function getS3(): S3Client {
  if (!s3) s3 = new S3Client({ region: config.s3.region });
  return s3;
}

function objectKey(bucket: string, path: string): string {
  const isPublic = PUBLIC_BUCKETS.has(bucket);
  const prefix = isPublic ? 'public' : 'private';
  // Normalize path — strip leading slashes
  const clean = path.replace(/^\/+/, '');
  return `${prefix}/${bucket}/${clean}`;
}

const signUploadSchema = z.object({
  bucket: z.string().min(1).max(64),
  path: z.string().min(1).max(512),
  contentType: z.string().min(1).max(128).optional(),
  expiresIn: z.number().int().min(60).max(3600).default(900),
});

const signDownloadSchema = z.object({
  bucket: z.string().min(1).max(64),
  path: z.string().min(1).max(512),
  expiresIn: z.number().int().min(60).max(3600).default(900),
});

const deleteSchema = z.object({
  bucket: z.string().min(1).max(64),
  path: z.string().min(1).max(512),
});

export async function storageRoutes(app: FastifyInstance) {
  app.post('/sign-upload', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = signUploadSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }
    const { bucket, path, contentType, expiresIn } = parsed.data;
    const Key = objectKey(bucket, path);

    try {
      const url = await getSignedUrl(
        getS3(),
        new PutObjectCommand({
          Bucket: config.s3.bucket,
          Key,
          ContentType: contentType,
        }),
        { expiresIn },
      );
      return { url, method: 'PUT', key: Key, expiresIn };
    } catch (err: any) {
      logger.error({ err, bucket, path }, 'sign-upload failed');
      return reply.status(500).send({ error: 'Failed to sign upload URL', message: err.message });
    }
  });

  app.post('/sign-download', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = signDownloadSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }
    const { bucket, path, expiresIn } = parsed.data;
    const Key = objectKey(bucket, path);

    try {
      const url = await getSignedUrl(
        getS3(),
        new GetObjectCommand({ Bucket: config.s3.bucket, Key }),
        { expiresIn },
      );
      return { url, method: 'GET', key: Key, expiresIn };
    } catch (err: any) {
      logger.error({ err, bucket, path }, 'sign-download failed');
      return reply.status(500).send({ error: 'Failed to sign download URL', message: err.message });
    }
  });

  app.delete('/object', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = deleteSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    }
    const { bucket, path } = parsed.data;
    const Key = objectKey(bucket, path);

    try {
      await getS3().send(new DeleteObjectCommand({ Bucket: config.s3.bucket, Key }));
      return reply.status(204).send();
    } catch (err: any) {
      logger.error({ err, bucket, path }, 'storage delete failed');
      return reply.status(500).send({ error: 'Failed to delete object', message: err.message });
    }
  });

  app.get('/public-url', async (request: FastifyRequest) => {
    const q = request.query as { bucket?: string; path?: string };
    if (!q.bucket || !q.path) {
      return { publicUrl: '' };
    }
    const Key = objectKey(q.bucket, q.path);
    const isPublic = PUBLIC_BUCKETS.has(q.bucket);
    if (!isPublic) {
      // Non-public buckets must use signed download
      return { publicUrl: '' };
    }
    const cdnHost = process.env['PUBLIC_ASSET_HOST'];
    if (cdnHost) {
      // Strip the `public/` prefix because CloudFront origin path already adds it
      const cdnKey = Key.replace(/^public\//, '');
      return { publicUrl: `${cdnHost.replace(/\/$/, '')}/${cdnKey}` };
    }
    // Fall back to direct S3 URL
    return {
      publicUrl: `https://${config.s3.bucket}.s3.${config.s3.region}.amazonaws.com/${Key}`,
    };
  });
}
