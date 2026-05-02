/**
 * Dev-only routes — never registered in production.
 * GET /v1/dev/token?channelId=xxx  → signed broadcaster JWT for local testing
 */
import type { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';

const EXT_SECRET = Buffer.from(process.env.TWITCH_EXT_SECRET ?? '', 'base64');

export async function devRoutes(app: FastifyInstance) {
  app.get('/dev/token', async (req, reply) => {
    const { channelId } = req.query as { channelId?: string };
    if (!channelId) return reply.code(400).send({ error: 'channelId required' });

    const token = jwt.sign(
      {
        exp:            Math.floor(Date.now() / 1000) + 3600,
        opaque_user_id: `U${channelId}`,
        user_id:        channelId,
        channel_id:     channelId,
        role:           'broadcaster',
        is_unlinked:    false,
        pubsub_perms:   { listen: ['broadcast'], send: ['broadcast'] },
      },
      EXT_SECRET,
      { algorithm: 'HS256' }
    );

    return { token, channelId };
  });
}
