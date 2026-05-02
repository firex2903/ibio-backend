import type { FastifyRequest, FastifyReply } from 'fastify';

const SERVICE_TOKEN = process.env.SERVICE_TOKEN ?? '';

export async function requireServiceKey(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!SERVICE_TOKEN) {
    return reply.code(503).send({ error: 'Service not configured' });
  }
  const auth = request.headers.authorization;
  if (!auth?.startsWith('Bearer ') || auth.slice(7) !== SERVICE_TOKEN) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
}
