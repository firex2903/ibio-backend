/**
 * Internal platform routes — service-to-service only.
 * Protected by SERVICE_TOKEN, not Twitch JWT.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../services/db.js';
import { requireServiceKey } from '../middleware/requireServiceKey.js';
import { buildProfileDTO } from './creator.js';

const UpdateSchema = z.object({
  displayName:   z.string().max(64).optional(),
  channelBio:    z.string().max(200).optional(),
  avatarUrl:     z.string().max(500).optional(),
  plan:          z.enum(['STARTER', 'PRO']).optional(),
  brandAssets: z.object({
    primaryColor:   z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    accentColor:    z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  }).optional(),
});

const INCLUDE = { brandAssets: true, modules: true } as const;

export async function internalRoutes(app: FastifyInstance) {

  /** GET /v1/internal/creator/:channelId */
  app.get(
    '/internal/creator/:channelId',
    { preHandler: requireServiceKey },
    async (req, reply) => {
      const { channelId } = req.params as { channelId: string };
      const profile = await prisma.creatorProfile.findUnique({
        where: { id: channelId },
        include: INCLUDE,
      });
      if (!profile) return reply.code(404).send({ error: 'Not found' });
      return reply.send({ profile: buildProfileDTO(profile, false) });
    }
  );

  /** PUT /v1/internal/creator/:channelId */
  app.put(
    '/internal/creator/:channelId',
    { preHandler: requireServiceKey },
    async (req, reply) => {
      const { channelId } = req.params as { channelId: string };
      const parsed = UpdateSchema.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

      const { plan, brandAssets, ...profileFields } = parsed.data;

      await prisma.$transaction(async (tx) => {
        await tx.creatorProfile.upsert({
          where:  { id: channelId },
          create: { id: channelId, displayName: '', ...profileFields, ...(plan ? { plan } : {}) },
          update: { ...profileFields, ...(plan ? { plan } : {}) },
        });

        if (brandAssets && Object.keys(brandAssets).length > 0) {
          const filtered = Object.fromEntries(
            Object.entries(brandAssets).filter(([, v]) => v !== undefined)
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

  /** GET /v1/internal/creators — list all profiles */
  app.get(
    '/internal/creators',
    { preHandler: requireServiceKey },
    async (req, reply) => {
      const { page = '1', limit = '50' } = req.query as Record<string, string>;
      const skip = (Number(page) - 1) * Number(limit);
      const [total, items] = await Promise.all([
        prisma.creatorProfile.count(),
        prisma.creatorProfile.findMany({
          skip,
          take: Number(limit),
          include: INCLUDE,
          orderBy: { createdAt: 'desc' },
        }),
      ]);
      return reply.send({
        total,
        page: Number(page),
        items: items.map((p) => buildProfileDTO(p, false)),
      });
    }
  );
}
