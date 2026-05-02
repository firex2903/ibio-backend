import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../services/db';
import {
  requireBroadcaster,
  assertChannelOwnership,
} from '../middleware/verifyTwitchJwt';
import { validateModuleConfig } from '../lib/moduleConfigSchemas';
import { isPlanPro } from './creator';
import {
  PRO_ONLY_KINDS,
  STARTER_MODULE_LIMIT,
  type ModuleKind,
} from '@creator-bio-hub/types';

// ─── Zod Payloads ─────────────────────────────────────────────────────────────

const MODULE_KINDS = z.enum([
  'CHANNEL_LINK', 'COMMUNITY_SPACE', 'STREAM_SCHEDULE',
  'PARTNER_CARD', 'VIEWER_PERK',
  'SUPPORT_OPTION', 'MERCH_SHOWCASE', 'CHANNEL_EVENT', 'QUICK_ACTION',
]);

const CreateModuleSchema = z.object({
  moduleKind: MODULE_KINDS,
  title:      z.string().min(1).max(80),
  subtitle:   z.string().max(120).optional(),
  position:   z.number().int().min(0).optional(),
  config:     z.record(z.unknown()),
});

const UpdateModuleSchema = z.object({
  title:    z.string().min(1).max(80).optional(),
  subtitle: z.string().max(120).optional().nullable(),
  visible:  z.boolean().optional(),
  config:   z.record(z.unknown()).optional(),
});

const ReorderSchema = z.object({
  order: z.array(z.string().cuid()).min(1),
});

// ─── Plan Enforcement ─────────────────────────────────────────────────────────

async function enforceModuleCreation(
  channelId: string,
  kind: ModuleKind,
  reply: Parameters<typeof requireBroadcaster>[1]
): Promise<boolean> {
  const isPro = await isPlanPro(channelId);

  if (PRO_ONLY_KINDS.has(kind) && !isPro) {
    reply.code(403).send({
      error: `The ${kind} module requires Creator Pro`,
      upgradeRequired: true,
    });
    return false;
  }

  if (!isPro) {
    const count = await prisma.companionModule.count({
      where: { profileId: channelId },
    });
    if (count >= STARTER_MODULE_LIMIT) {
      reply.code(403).send({
        error: `Starter plan is limited to ${STARTER_MODULE_LIMIT} modules`,
        upgradeRequired: true,
      });
      return false;
    }
  }

  return true;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function moduleRoutes(app: FastifyInstance) {

  /**
   * POST /v1/creator/:channelId/modules
   * Create a new CompanionModule. Validates config schema for the given kind.
   */
  app.post(
    '/creator/:channelId/modules',
    { preHandler: requireBroadcaster },
    async (request, reply) => {
      const { channelId } = request.params as { channelId: string };
      if (!assertChannelOwnership(request, reply, channelId)) return;

      const parsed = CreateModuleSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }

      const { moduleKind, title, subtitle, position, config } = parsed.data;

      // Plan gate
      if (!(await enforceModuleCreation(channelId, moduleKind as ModuleKind, reply))) return;

      // Config schema validation
      const configResult = validateModuleConfig(moduleKind as ModuleKind, config);
      if (!configResult.success) {
        return reply.code(400).send({
          error: 'Invalid module config',
          details: configResult.error.flatten(),
        });
      }

      // Determine position — append to end if not specified
      const insertPosition =
        position ??
        (await prisma.companionModule.count({ where: { profileId: channelId } }));

      // Ensure profile exists before creating module
      await prisma.creatorProfile.upsert({
        where:  { id: channelId },
        create: { id: channelId, displayName: '' },
        update: {},
      });

      const module = await prisma.companionModule.create({
        data: {
          profileId: channelId,
          moduleKind: moduleKind as any,
          title,
          subtitle: subtitle ?? null,
          position: insertPosition,
          config: configResult.data,
        },
      });

      return reply.code(201).send({ module: serializeModule(module) });
    }
  );

  /**
   * PUT /v1/creator/:channelId/modules/:moduleId
   * Update title, subtitle, visibility, or config of an existing module.
   */
  app.put(
    '/creator/:channelId/modules/:moduleId',
    { preHandler: requireBroadcaster },
    async (request, reply) => {
      const { channelId, moduleId } = request.params as {
        channelId: string;
        moduleId: string;
      };
      if (!assertChannelOwnership(request, reply, channelId)) return;

      const existing = await prisma.companionModule.findFirst({
        where: { id: moduleId, profileId: channelId },
      });
      if (!existing) {
        return reply.code(404).send({ error: 'Module not found' });
      }

      const parsed = UpdateModuleSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }

      const { title, subtitle, visible, config } = parsed.data;

      // Validate new config if provided
      let safeConfig: Record<string, unknown> | undefined;
      if (config !== undefined) {
        const configResult = validateModuleConfig(
          existing.moduleKind as ModuleKind,
          config
        );
        if (!configResult.success) {
          return reply.code(400).send({
            error: 'Invalid module config',
            details: configResult.error.flatten(),
          });
        }
        safeConfig = configResult.data;
      }

      const updated = await prisma.companionModule.update({
        where: { id: moduleId },
        data: {
          ...(title    !== undefined && { title }),
          ...(subtitle !== undefined && { subtitle }),
          ...(visible  !== undefined && { visible }),
          ...(safeConfig !== undefined && { config: safeConfig }),
        },
      });

      return reply.send({ module: serializeModule(updated) });
    }
  );

  /**
   * DELETE /v1/creator/:channelId/modules/:moduleId
   */
  app.delete(
    '/creator/:channelId/modules/:moduleId',
    { preHandler: requireBroadcaster },
    async (request, reply) => {
      const { channelId, moduleId } = request.params as {
        channelId: string;
        moduleId: string;
      };
      if (!assertChannelOwnership(request, reply, channelId)) return;

      const existing = await prisma.companionModule.findFirst({
        where: { id: moduleId, profileId: channelId },
      });
      if (!existing) {
        return reply.code(404).send({ error: 'Module not found' });
      }

      await prisma.companionModule.delete({ where: { id: moduleId } });
      return reply.code(204).send();
    }
  );

  /**
   * PATCH /v1/creator/:channelId/modules/reorder
   * Accepts a complete ordered array of module IDs.
   * Sets position = index in that array atomically.
   */
  app.patch(
    '/creator/:channelId/modules/reorder',
    { preHandler: requireBroadcaster },
    async (request, reply) => {
      const { channelId } = request.params as { channelId: string };
      if (!assertChannelOwnership(request, reply, channelId)) return;

      const parsed = ReorderSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }

      const { order } = parsed.data;

      // Verify all IDs belong to this channel
      const modules = await prisma.companionModule.findMany({
        where: { profileId: channelId },
        select: { id: true },
      });
      const ownedIds = new Set(modules.map((m) => m.id));
      const invalid = order.filter((id) => !ownedIds.has(id));
      if (invalid.length > 0) {
        return reply.code(400).send({ error: 'Unknown module IDs', ids: invalid });
      }

      // Bulk update positions in a single transaction
      await prisma.$transaction(
        order.map((id, index) =>
          prisma.companionModule.update({
            where: { id },
            data:  { position: index },
          })
        )
      );

      return reply.send({ ok: true });
    }
  );

  /**
   * PATCH /v1/creator/:channelId/modules/:moduleId/visibility
   * Toggle a single module's visible flag — used by Stream Controls.
   */
  app.patch(
    '/creator/:channelId/modules/:moduleId/visibility',
    { preHandler: requireBroadcaster },
    async (request, reply) => {
      const { channelId, moduleId } = request.params as {
        channelId: string;
        moduleId: string;
      };
      if (!assertChannelOwnership(request, reply, channelId)) return;

      const { visible } = z
        .object({ visible: z.boolean() })
        .parse(request.body);

      const existing = await prisma.companionModule.findFirst({
        where: { id: moduleId, profileId: channelId },
      });
      if (!existing) {
        return reply.code(404).send({ error: 'Module not found' });
      }

      const updated = await prisma.companionModule.update({
        where: { id: moduleId },
        data:  { visible },
      });

      return reply.send({ module: serializeModule(updated) });
    }
  );

  /**
   * POST /v1/interactions
   * Fire-and-forget viewer interaction recording.
   * Accepts any valid extension JWT role.
   */
  app.post(
    '/interactions',
    async (request, reply) => {
      // Extract token manually — we don't fail hard on missing auth here
      // because interaction recording should never block the viewer UX
      const schema = z.object({
        moduleId:        z.string(),
        profileId:       z.string(),
        interactionKind: z.enum(['MODULE_OPENED', 'MODULE_ENGAGED', 'MODULE_NAVIGATED']),
        referrer:        z.enum(['PANEL', 'OVERLAY', 'MOBILE']),
        viewerOpaqueId:  z.string().optional(),
      });

      const parsed = schema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid payload' });
      }

      const { moduleId, profileId, interactionKind, referrer, viewerOpaqueId } = parsed.data;

      // Verify the module belongs to the profile before recording
      const module = await prisma.companionModule.findFirst({
        where: { id: moduleId, profileId },
        select: { id: true },
      });
      if (!module) {
        return reply.code(404).send({ error: 'Module not found' });
      }

      await prisma.viewerInteraction.create({
        data: {
          profileId,
          moduleId,
          interactionKind: interactionKind as any,
          referrer:        referrer as any,
          viewerOpaqueId:  viewerOpaqueId ?? null,
        },
      });

      return reply.code(204).send();
    }
  );
}

// ─── Serializer ───────────────────────────────────────────────────────────────

function serializeModule(m: {
  id: string;
  moduleKind: string;
  title: string;
  subtitle: string | null;
  position: number;
  visible: boolean;
  config: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id:         m.id,
    moduleKind: m.moduleKind,
    title:      m.title,
    subtitle:   m.subtitle ?? undefined,
    position:   m.position,
    visible:    m.visible,
    config:     m.config,
    createdAt:  m.createdAt.toISOString(),
    updatedAt:  m.updatedAt.toISOString(),
  };
}
