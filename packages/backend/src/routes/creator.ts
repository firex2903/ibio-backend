import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../services/db';
import {
  verifyTwitchJwt,
  requireBroadcaster,
  assertChannelOwnership,
} from '../middleware/verifyTwitchJwt';
import type { CreatorProfileDTO, BrandAssets, CompanionModuleDTO } from '@creator-bio-hub/types';

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
      primaryColor:   z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      accentColor:    z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
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

// ─── Shared Plan Helper ───────────────────────────────────────────────────────

export async function isPlanPro(channelId: string): Promise<boolean> {
  const profile = await prisma.creatorProfile.findUnique({
    where: { id: channelId },
    select: { plan: true },
  });
  return profile?.plan === 'PRO';
}
