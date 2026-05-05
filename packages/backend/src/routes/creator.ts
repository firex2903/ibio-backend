import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import path from 'path';
import crypto from 'crypto';
import { createWriteStream, createReadStream, existsSync, mkdirSync } from 'fs';
import { prisma } from '../services/db';
import { uploadToR2, r2Configured } from '../services/r2';
import {
  verifyTwitchJwt,
  requireBroadcaster,
  assertChannelOwnership,
} from '../middleware/verifyTwitchJwt';
import type { CreatorProfileDTO, BrandAssets, CompanionModuleDTO } from '@creator-bio-hub/types';

const AVATARS_DIR  = path.resolve('uploads/avatars');
const OVERLAYS_DIR = path.resolve('uploads/overlays');
const BANNERS_DIR  = path.resolve('uploads/banners');
mkdirSync(AVATARS_DIR,  { recursive: true });
mkdirSync(OVERLAYS_DIR, { recursive: true });
mkdirSync(BANNERS_DIR,  { recursive: true });

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function buildProfileDTO(
  profile: {
    id: string;
    displayName: string;
    channelBio: string;
    avatarUrl: string;
    plan: string;
    createdAt: Date;
    updatedAt: Date;
    brandAssets: {
      primaryColor: string;
      secondaryColor: string;
      accentColor: string;
      overlayPosition: string;
      overlayBgColor: string;
      overlayBgImageUrl: string;
    } | null;
    modules: Array<{
      id: string;
      moduleKind: string;
      title: string;
      subtitle: string | null;
      position: number;
      visible: boolean;
      config: unknown;
      createdAt: Date;
      updatedAt: Date;
    }>;
  },
  visibleOnly = true
): CreatorProfileDTO {
  const defaultBrand: BrandAssets = {
    primaryColor: '#9147FF',
    secondaryColor: '#1a0a2e',
    accentColor: '#9147FF',
    overlayPosition: 'left',
    overlayBgColor: '',
    overlayBgImageUrl: '',
  };

  const modules: CompanionModuleDTO[] = profile.modules
    .filter((m) => !visibleOnly || m.visible)
    .sort((a, b) => a.position - b.position)
    .map((m) => ({
      id: m.id,
      moduleKind: m.moduleKind as CompanionModuleDTO['moduleKind'],
      title: m.title,
      subtitle: m.subtitle ?? undefined,
      position: m.position,
      visible: m.visible,
      config: m.config as Record<string, unknown>,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }));

  return {
    profileId: profile.id,
    displayName: profile.displayName,
    channelBio: profile.channelBio,
    avatarUrl: profile.avatarUrl,
    plan: profile.plan === 'PRO' ? 'PRO' : 'STARTER',
    brandAssets: profile.brandAssets ?? defaultBrand,
    modules,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

const PROFILE_INCLUDE = {
  brandAssets: true,
  modules: true,
} as const;

// ─── Zod Payloads ─────────────────────────────────────────────────────────────

const UpdateProfileSchema = z.object({
  displayName: z.string().max(64).optional(),
  channelBio:  z.string().max(200).optional(),
  avatarUrl:   z.string().max(500).optional(),
  brandAssets: z
    .object({
      primaryColor:     z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      secondaryColor:   z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      accentColor:      z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      overlayPosition:  z.enum(['left', 'right']).optional(),
      overlayBgColor:        z.string().max(50).optional(),
      overlayBgImageUrl:     z.string().max(500).optional(),
      featuredBannerUrl:     z.string().max(500).optional(),
      featuredBannerImageUrl: z.string().max(500).optional(),
      featuredBannerLabel:   z.string().max(80).optional(),
    })
    .optional(),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function creatorRoutes(app: FastifyInstance) {

  /**
   * GET /v1/creator/:channelId/profile
   * Public read — any valid extension JWT (viewer or broadcaster).
   * Returns visible modules only.
   */
  app.get(
    '/creator/:channelId/profile',
    { preHandler: verifyTwitchJwt },
    async (request, reply) => {
      const { channelId } = request.params as { channelId: string };

      const profile = await prisma.creatorProfile.findUnique({
        where: { id: channelId },
        include: PROFILE_INCLUDE,
      });

      if (!profile) {
        // Return an initialised empty shell — the panel renders "coming soon"
        const empty: CreatorProfileDTO = {
          profileId: channelId,
          displayName: '',
          channelBio: '',
          avatarUrl: '',
          plan: 'STARTER',
          brandAssets: { primaryColor: '#9147FF', secondaryColor: '#1a0a2e', accentColor: '#9147FF' },
          modules: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return reply.send({ profile: empty });
      }

      return reply.send({ profile: buildProfileDTO(profile, true) });
    }
  );

  /**
   * PUT /v1/creator/:channelId/profile
   * Broadcaster only. Upserts channel identity and brand assets.
   * Does NOT touch modules (managed separately via /modules routes).
   */
  app.put(
    '/creator/:channelId/profile',
    { preHandler: requireBroadcaster },
    async (request, reply) => {
      const { channelId } = request.params as { channelId: string };
      if (!assertChannelOwnership(request, reply, channelId)) return;

      const parsed = UpdateProfileSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }

      const { brandAssets, ...profileFields } = parsed.data;
      const isPro = await isPlanPro(channelId);

      // accentColor is Pro-only — strip it on Starter
      const safeBrandAssets = brandAssets
        ? { ...brandAssets, accentColor: isPro ? brandAssets.accentColor : undefined }
        : undefined;

      await prisma.$transaction(async (tx) => {
        await tx.creatorProfile.upsert({
          where:  { id: channelId },
          create: { id: channelId, displayName: '', ...profileFields },
          update: profileFields,
        });

        if (safeBrandAssets && Object.keys(safeBrandAssets).length > 0) {
          const filtered = Object.fromEntries(
            Object.entries(safeBrandAssets).filter(([, v]) => v !== undefined)
          );
          await tx.brandAssets.upsert({
            where:  { profileId: channelId },
            create: { profileId: channelId, ...filtered },
            update: filtered,
          });
        }
      });

      return reply.send({ ok: true });
    }
  );

  /**
   * POST /v1/creator/:channelId/avatar
   * Broadcaster only. Accepts multipart image upload, stores it, returns fileKey.
   * Frontend constructs URL as ${API_BASE}/avatars/${fileKey}
   */
  app.post(
    '/creator/:channelId/avatar',
    { preHandler: requireBroadcaster },
    async (request, reply) => {
      const { channelId } = request.params as { channelId: string };
      if (!assertChannelOwnership(request, reply, channelId)) return;
      return handleImageUpload(request, reply, channelId, 'avatars', AVATARS_DIR);
    }
  );

  /**
   * GET /v1/avatars/:filename
   * Public — serves uploaded avatar images.
   */
  app.get('/avatars/:filename', async (request, reply) => {
    const { filename } = request.params as { filename: string };
    if (filename.includes('..') || filename.includes('/')) {
      return reply.code(400).send({ error: 'Invalid filename' });
    }
    const filePath = path.join(AVATARS_DIR, filename);
    if (!existsSync(filePath)) return reply.code(404).send({ error: 'Not found' });
    return reply.send(createReadStream(filePath));
  });

  /**
   * POST /v1/creator/:channelId/overlay-bg
   * Broadcaster only. Uploads overlay button background image.
   */
  app.post(
    '/creator/:channelId/overlay-bg',
    { preHandler: requireBroadcaster },
    async (request, reply) => {
      const { channelId } = request.params as { channelId: string };
      if (!assertChannelOwnership(request, reply, channelId)) return;
      return handleImageUpload(request, reply, channelId, 'overlays', OVERLAYS_DIR);
    }
  );

  /**
   * GET /v1/overlay-bgs/:filename
   * Public — serves uploaded overlay background images.
   */
  app.get('/overlay-bgs/:filename', async (request, reply) => {
    const { filename } = request.params as { filename: string };
    if (filename.includes('..') || filename.includes('/')) {
      return reply.code(400).send({ error: 'Invalid filename' });
    }
    const filePath = path.join(OVERLAYS_DIR, filename);
    if (!existsSync(filePath)) return reply.code(404).send({ error: 'Not found' });
    return reply.send(createReadStream(filePath));
  });

  /**
   * POST /v1/creator/:channelId/featured-banner
   * Broadcaster only. Uploads featured banner background image.
   */
  app.post(
    '/creator/:channelId/featured-banner',
    { preHandler: requireBroadcaster },
    async (request, reply) => {
      const { channelId } = request.params as { channelId: string };
      if (!assertChannelOwnership(request, reply, channelId)) return;
      return handleImageUpload(request, reply, channelId, 'banners', BANNERS_DIR);
    }
  );

  /**
   * GET /v1/banners/:filename
   * Public — serves uploaded banner images.
   */
  app.get('/banners/:filename', async (request, reply) => {
    const { filename } = request.params as { filename: string };
    if (filename.includes('..') || filename.includes('/')) {
      return reply.code(400).send({ error: 'Invalid filename' });
    }
    const filePath = path.join(BANNERS_DIR, filename);
    if (!existsSync(filePath)) return reply.code(404).send({ error: 'Not found' });
    return reply.send(createReadStream(filePath));
  });

  /**
   * GET /v1/creator/:channelId/profile/full
   * Broadcaster only — returns all modules including hidden ones, for Companion Setup.
   */
  app.get(
    '/creator/:channelId/profile/full',
    { preHandler: requireBroadcaster },
    async (request, reply) => {
      const { channelId } = request.params as { channelId: string };
      if (!assertChannelOwnership(request, reply, channelId)) return;

      const profile = await prisma.creatorProfile.findUnique({
        where: { id: channelId },
        include: PROFILE_INCLUDE,
      });

      if (!profile) {
        // Return an empty shell so the Config panel renders an empty form
        // rather than erroring on first visit before any profile exists.
        const empty: CreatorProfileDTO = {
          profileId:    channelId,
          displayName:  '',
          channelBio:   '',
          avatarUrl:    '',
          plan:         'STARTER',
          brandAssets:  { primaryColor: '#9147FF', secondaryColor: '#1a0a2e', accentColor: '#9147FF' },
          modules:      [],
          createdAt:    new Date().toISOString(),
          updatedAt:    new Date().toISOString(),
        };
        return reply.send({ profile: empty });
      }

      return reply.send({ profile: buildProfileDTO(profile, false) });
    }
  );
}

// ─── Image Upload Helper (R2 with local-disk fallback) ───────────────────────

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

async function handleImageUpload(
  request: any,
  reply: any,
  channelId: string,
  prefix: 'avatars' | 'overlays',
  fallbackDir: string,
): Promise<any> {
  const parts = request.parts() as AsyncIterable<any>;
  for await (const part of parts) {
    if (part.file) {
      if (!ALLOWED_IMAGE_TYPES.has(part.mimetype)) {
        await part.file.resume();
        return reply.code(400).send({ error: 'Only image files allowed (jpeg/png/webp/gif)' });
      }
      const ext = path.extname(part.filename as string) || '.jpg';
      const fileKey = `${channelId}-${crypto.randomUUID()}${ext}`;

      // Buffer the file (size already capped by fastify-multipart 100MB)
      const chunks: Buffer[] = [];
      for await (const chunk of part.file) chunks.push(chunk as Buffer);
      const body = Buffer.concat(chunks);

      // Prefer R2 if configured, otherwise write to local disk (ephemeral on Railway)
      if (r2Configured) {
        try {
          const url = await uploadToR2(`${prefix}/${fileKey}`, body, part.mimetype);
          return reply.send({ fileKey, url });
        } catch (err: any) {
          request.log.error({ err }, 'R2 upload failed');
          return reply.code(500).send({ error: 'Upload failed' });
        }
      } else {
        const filePath = path.join(fallbackDir, fileKey);
        const ws = createWriteStream(filePath);
        ws.write(body);
        await new Promise<void>((res, rej) => { ws.end(); ws.on('finish', res); ws.on('error', rej); });
        return reply.send({ fileKey });
      }
    }
  }
  return reply.code(400).send({ error: 'No file uploaded' });
}

// ─── Shared Plan Helper ───────────────────────────────────────────────────────

export async function isPlanPro(channelId: string): Promise<boolean> {
  const profile = await prisma.creatorProfile.findUnique({
    where: { id: channelId },
    select: { plan: true },
  });
  return profile?.plan === 'PRO';
}
