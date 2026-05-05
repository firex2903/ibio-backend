/**
 * Digital Products — CRUD + file upload + download
 * POST   /v1/creator/:channelId/products          — create + upload file
 * GET    /v1/creator/:channelId/products          — list (public, active only unless authed)
 * PUT    /v1/creator/:channelId/products/:id      — update meta (no file replace)
 * DELETE /v1/creator/:channelId/products/:id      — deactivate (soft delete)
 * GET    /v1/download/:token                      — serve file (validates token)
 * POST   /v1/bits/product-purchase               — bits receipt → issue download token
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createWriteStream, createReadStream, existsSync, mkdirSync } from 'fs';
import { unlink } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../services/db.js';
import { requireBroadcaster, assertChannelOwnership } from '../middleware/verifyTwitchJwt.js';
import { uploadToR2, getFromR2, r2Configured } from '../services/r2.js';
import jwt from 'jsonwebtoken';

const UPLOADS_DIR = path.resolve('uploads');
mkdirSync(UPLOADS_DIR, { recursive: true });
const EXT_SECRET  = Buffer.from(process.env.TWITCH_EXT_SECRET ?? '', 'base64');

// Allowed MIME types for uploads
const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm',
  'application/pdf', 'application/zip',
]);

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

// Price → SKU map (must match Twitch Dev Console)
export const PRICE_SKU_MAP: Record<number, string> = {
  300:  '002X',
  500:  '001X',
  1000: '003X',
};

interface BitsClaims {
  topic: string;
  channel_id: string;
  user_id: string;
  data: {
    transactionId: string;
    product: { sku: string; cost: { amount: number } };
    userId: string;
  };
}

export async function productsRoutes(app: FastifyInstance) {

  // ── List products (public) ────────────────────────────────────────────────
  app.get('/creator/:channelId/products', async (req) => {
    const { channelId } = req.params as { channelId: string };
    const products = await prisma.digitalProduct.findMany({
      where: { profileId: channelId, active: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, description: true,
        priceBits: true, priceSku: true,
        fileName: true, mimeType: true, fileSize: true,
        _count: { select: { purchases: true } },
      },
    });
    return { products };
  });

  // ── Create product + upload file ──────────────────────────────────────────
  app.post('/creator/:channelId/products', {
    preHandler: requireBroadcaster,
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { channelId } = req.params as { channelId: string };
    if (!assertChannelOwnership(req, reply, channelId)) return;

    // Parse multipart: read all parts (fields + file)
    const parts = (req as any).parts() as AsyncIterable<any>;
    const fields: Record<string, string> = {};
    let fileKey = ''; let fileName = ''; let mimeType = '';
    let fileSize = 0; let filePath = '';

    for await (const part of parts) {
      if (part.file) {
        // It's the file part
        if (!ALLOWED_TYPES.has(part.mimetype)) {
          await part.file.resume(); // drain
          return reply.code(400).send({ error: 'File type not allowed' });
        }
        const ext = path.extname(part.filename) || '';
        fileKey   = `${crypto.randomUUID()}${ext}`;
        fileName  = part.filename;
        mimeType  = part.mimetype;

        // Buffer file in memory (capped at MAX_FILE_SIZE)
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) {
          fileSize += chunk.length;
          if (fileSize > MAX_FILE_SIZE) {
            return reply.code(413).send({ error: 'File too large (max 100 MB)' });
          }
          chunks.push(chunk as Buffer);
        }
        const body = Buffer.concat(chunks);

        if (r2Configured) {
          try {
            await uploadToR2(`products/${fileKey}`, body, mimeType);
          } catch (err: any) {
            req.log.error({ err }, 'R2 upload failed');
            return reply.code(500).send({ error: 'Upload failed' });
          }
        } else {
          // Local disk fallback
          filePath = path.join(UPLOADS_DIR, fileKey);
          const ws = createWriteStream(filePath);
          ws.write(body);
          await new Promise<void>((res, rej) => { ws.end(); ws.on('finish', res); ws.on('error', rej); });
        }
      } else {
        fields[part.fieldname] = part.value as string;
      }
    }

    if (!fileKey) return reply.code(400).send({ error: 'No file uploaded' });

    const title       = fields.title?.trim();
    const description = fields.description?.trim() ?? '';
    const priceBits   = parseInt(fields.priceBits ?? '0', 10);

    if (!title) return reply.code(400).send({ error: 'Title required' });
    if (!PRICE_SKU_MAP[priceBits]) {
      return reply.code(400).send({ error: 'Invalid price. Use 300, 500, or 1000 bits.' });
    }

    const product = await prisma.digitalProduct.create({
      data: {
        profileId:   channelId,
        title,
        description,
        priceBits,
        priceSku:    PRICE_SKU_MAP[priceBits],
        fileKey,
        fileName,
        fileSize,
        mimeType,
      },
    });

    return reply.code(201).send({ product });
  });

  // ── Update product meta ───────────────────────────────────────────────────
  app.put('/creator/:channelId/products/:id', {
    preHandler: requireBroadcaster,
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { channelId, id } = req.params as { channelId: string; id: string };
    if (!assertChannelOwnership(req, reply, channelId)) return;

    const { title, description, priceBits, active } = req.body as {
      title?: string; description?: string; priceBits?: number; active?: boolean;
    };

    const update: Record<string, unknown> = {};
    if (title !== undefined)       update.title       = title;
    if (description !== undefined) update.description = description;
    if (active !== undefined)      update.active      = active;
    if (priceBits !== undefined) {
      if (!PRICE_SKU_MAP[priceBits]) return reply.code(400).send({ error: 'Invalid price' });
      update.priceBits = priceBits;
      update.priceSku  = PRICE_SKU_MAP[priceBits];
    }

    const product = await prisma.digitalProduct.update({ where: { id }, data: update });
    return { product };
  });

  // ── Delete (soft) ─────────────────────────────────────────────────────────
  app.delete('/creator/:channelId/products/:id', {
    preHandler: requireBroadcaster,
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { channelId, id } = req.params as { channelId: string; id: string };
    if (!assertChannelOwnership(req, reply, channelId)) return;

    await prisma.digitalProduct.update({ where: { id }, data: { active: false } });
    return { ok: true };
  });

  // ── Purchase via Bits → issue download token ──────────────────────────────
  app.post('/bits/product-purchase', async (req, reply) => {
    const { transactionReceipt, channelId, productId, _test } = req.body as {
      transactionReceipt?: string;
      channelId: string;
      productId: string;
      _test?: boolean;
    };

    if (!channelId || !productId) {
      return reply.code(400).send({ error: 'Missing fields' });
    }

    const product = await prisma.digitalProduct.findUnique({ where: { id: productId } });
    if (!product || !product.active) return reply.code(404).send({ error: 'Product not found' });

    let buyerUserId = 'test_user';
    let txId        = `test_${crypto.randomUUID()}`;

    // ── Test mode (development only) ──────────────────────────────────────
    if (_test) {
      if (process.env.NODE_ENV !== 'development') {
        return reply.code(403).send({ error: 'Test mode only available in development' });
      }
      // Skip receipt verification — issue token directly
    } else {
      // ── Production: verify Bits receipt ──────────────────────────────────
      if (!transactionReceipt) return reply.code(400).send({ error: 'Missing receipt' });

      let claims: BitsClaims;
      try {
        claims = jwt.verify(transactionReceipt, EXT_SECRET) as BitsClaims;
      } catch {
        return reply.code(400).send({ error: 'Invalid receipt' });
      }

      if (claims.topic !== 'bits_transaction_receipt') {
        return reply.code(400).send({ error: 'Wrong receipt type' });
      }

      const paid = claims.data.product.cost.amount;
      if (paid < product.priceBits) {
        return reply.code(400).send({ error: 'Insufficient bits' });
      }

      buyerUserId = claims.data.userId;
      txId        = claims.data.transactionId;

      // Idempotency
      const existing = await prisma.digitalPurchase.findUnique({ where: { txId } });
      if (existing) return { ok: true, downloadToken: existing.downloadToken };
    }

    const purchase = await prisma.digitalPurchase.create({
      data: {
        productId,
        buyerUserId,
        txId,
        downloadToken: crypto.randomUUID(),
        maxDownloads:  5,
        expiresAt:     new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { ok: true, downloadToken: purchase.downloadToken };
  });

  // ── Image preview (public, images only, no download header) ─────────────
  app.get('/preview/:productId', async (req, reply) => {
    const { productId } = req.params as { productId: string };
    const product = await prisma.digitalProduct.findUnique({
      where: { id: productId, active: true },
      select: { fileKey: true, mimeType: true },
    });
    if (!product || !product.mimeType.startsWith('image/')) {
      return reply.code(404).send({ error: 'Not found' });
    }
    reply.header('Content-Type', product.mimeType);
    reply.header('Cache-Control', 'public, max-age=3600');
    if (r2Configured) {
      return reply.send(await getFromR2(`products/${product.fileKey}`));
    }
    const filePath = path.join(UPLOADS_DIR, product.fileKey);
    if (!existsSync(filePath)) return reply.code(404).send({ error: 'File not found' });
    return reply.send(createReadStream(filePath));
  });

  // ── Download ──────────────────────────────────────────────────────────────
  app.get('/download/:token', async (req, reply) => {
    const { token } = req.params as { token: string };

    const purchase = await prisma.digitalPurchase.findUnique({
      where: { downloadToken: token },
      include: { product: true },
    });

    if (!purchase) return reply.code(404).send({ error: 'Invalid download link' });
    if (purchase.expiresAt < new Date()) return reply.code(410).send({ error: 'Link expired' });
    if (purchase.downloadCount >= purchase.maxDownloads) {
      return reply.code(410).send({ error: 'Download limit reached' });
    }

    await prisma.digitalPurchase.update({
      where: { id: purchase.id },
      data:  { downloadCount: { increment: 1 } },
    });

    reply.header('Content-Type', purchase.product.mimeType);
    reply.header('Content-Disposition', `attachment; filename="${purchase.product.fileName}"`);
    reply.header('Content-Length', purchase.product.fileSize);

    if (r2Configured) {
      return reply.send(await getFromR2(`products/${purchase.product.fileKey}`));
    }
    const filePath = path.join(UPLOADS_DIR, purchase.product.fileKey);
    if (!existsSync(filePath)) return reply.code(404).send({ error: 'File not found' });
    return reply.send(createReadStream(filePath));
  });
}
