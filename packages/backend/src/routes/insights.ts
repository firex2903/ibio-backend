import type { FastifyInstance } from 'fastify';
import { prisma } from '../services/db';
import { requireBroadcaster, assertChannelOwnership } from '../middleware/verifyTwitchJwt';
import type {
  CreatorInsightsDTO,
  ModuleInsightDTO,
  InteractionKind,
  ModuleKind,
} from '@creator-bio-hub/types';

// ─── Time Windows ─────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function insightsRoutes(app: FastifyInstance) {

  /**
   * GET /v1/creator/:channelId/insights
   * Pro-only. Aggregated ViewerInteraction counts across all modules.
   * Uses three groupBy queries (all-time, 7d, 30d) instead of N×3 per module.
   */
  app.get(
    '/creator/:channelId/insights',
    { preHandler: requireBroadcaster },
    async (request, reply) => {
      const { channelId } = request.params as { channelId: string };
      if (!assertChannelOwnership(request, reply, channelId)) return;

      const profile = await prisma.creatorProfile.findUnique({
        where:  { id: channelId },
        select: { plan: true, modules: { select: { id: true, moduleKind: true, title: true } } },
      });
      if (!profile) return reply.code(404).send({ error: 'Profile not found' });
      if (profile.plan !== 'PRO') {
        return reply.code(403).send({ error: 'Viewer Insights requires Creator Pro', upgradeRequired: true });
      }

      const ago7  = daysAgo(7);
      const ago30 = daysAgo(30);

      // Three batch queries — O(1) round trips regardless of module count
      const [allTimeRows, rows7d, rows30d] = await Promise.all([
        prisma.viewerInteraction.groupBy({
          by:    ['moduleId', 'interactionKind'],
          where: { profileId: channelId },
          _count: { id: true },
        }),
        prisma.viewerInteraction.groupBy({
          by:    ['moduleId'],
          where: { profileId: channelId, createdAt: { gte: ago7 } },
          _count: { id: true },
        }),
        prisma.viewerInteraction.groupBy({
          by:    ['moduleId'],
          where: { profileId: channelId, createdAt: { gte: ago30 } },
          _count: { id: true },
        }),
      ]);

      // Index by moduleId for O(1) lookup during assembly
      const byKindIndex = new Map<string, Partial<Record<InteractionKind, number>>>();
      let totalAllTime = 0;
      for (const row of allTimeRows) {
        const entry = byKindIndex.get(row.moduleId) ?? {};
        entry[row.interactionKind as InteractionKind] = row._count.id;
        byKindIndex.set(row.moduleId, entry);
        totalAllTime += row._count.id;
      }

      const idx7d  = new Map(rows7d.map((r)  => [r.moduleId, r._count.id]));
      const idx30d = new Map(rows30d.map((r) => [r.moduleId, r._count.id]));

      let total7d  = 0;
      let total30d = 0;
      rows7d.forEach((r)  => { total7d  += r._count.id; });
      rows30d.forEach((r) => { total30d += r._count.id; });

      const modules: ModuleInsightDTO[] = profile.modules.map((m) => {
        const byKind = byKindIndex.get(m.id) ?? {};
        const totalInteractions = Object.values(byKind).reduce((s, n) => s + (n ?? 0), 0);
        return {
          moduleId:          m.id,
          moduleKind:        m.moduleKind as ModuleKind,
          title:             m.title,
          totalInteractions,
          last7d:            idx7d.get(m.id)  ?? 0,
          last30d:           idx30d.get(m.id) ?? 0,
          byKind,
        };
      });

      modules.sort((a, b) => b.totalInteractions - a.totalInteractions);
      const topModule = modules.find((m) => m.totalInteractions > 0) ?? null;

      const insights: CreatorInsightsDTO = {
        profileId:         channelId,
        totalInteractions: totalAllTime,
        last7d:            total7d,
        last30d:           total30d,
        modules,
        topModule,
      };

      return reply.send({ insights });
    }
  );
}
