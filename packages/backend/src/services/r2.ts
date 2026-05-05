// Cloudflare R2 storage helper. S3-compatible API.
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const accountId   = process.env.R2_ACCOUNT_ID ?? '';
const accessKey   = process.env.R2_ACCESS_KEY_ID ?? '';
const secretKey   = process.env.R2_SECRET_ACCESS_KEY ?? '';
const bucket      = process.env.R2_BUCKET_NAME ?? '';
const publicBase  = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, ''); // no trailing slash

export const r2Configured = Boolean(accountId && accessKey && secretKey && bucket && publicBase);

const client = r2Configured
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    })
  : null;

export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  if (!client) throw new Error('R2 not configured (missing env vars)');
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  return `${publicBase}/${key}`;
}
