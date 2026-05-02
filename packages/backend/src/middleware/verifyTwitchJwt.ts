import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import type { TwitchExtensionClaims } from '@creator-bio-hub/types';

// Twitch Extension secret is base64-encoded in the Developer Console.
// Decode once at module load — fail fast if missing.
const EXT_SECRET_B64 = process.env.TWITCH_EXT_SECRET ?? '';
if (!EXT_SECRET_B64 && process.env.NODE_ENV !== 'test') {
  throw new Error('TWITCH_EXT_SECRET environment variable is required');
}
const EXT_SECRET = Buffer.from(EXT_SECRET_B64, 'base64');

// Augment FastifyRequest so downstream handlers get typed claims.
declare module 'fastify' {
  interface FastifyRequest {
    twitchClaims?: TwitchExtensionClaims;
  }
}

function extractToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7);
}

/**
 * Verifies the Twitch Extension JWT and attaches claims to the request.
 * Allows all roles (broadcaster / viewer / external).
 */
export async function verifyTwitchJwt(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const token = extractToken(request);
  if (!token) {
    return reply.code(401).send({ error: 'Missing Authorization header' });
  }
  try {
    const claims = jwt.verify(token, EXT_SECRET) as TwitchExtensionClaims;
    request.twitchClaims = claims;
  } catch (err) {
    const msg = err instanceof jwt.TokenExpiredError ? 'Token expired' : 'Invalid token';
    return reply.code(401).send({ error: msg });
  }
}

/**
 * Like verifyTwitchJwt but additionally enforces the broadcaster role.
 * Use on routes that mutate channel data.
 */
export async function requireBroadcaster(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  await verifyTwitchJwt(request, reply);
  if (reply.sent) return; // verifyTwitchJwt already replied with an error
  if (request.twitchClaims!.role !== 'broadcaster') {
    return reply.code(403).send({ error: 'Broadcaster role required' });
  }
}

/**
 * Asserts that the authenticated broadcaster owns the requested channel.
 * Call after requireBroadcaster when the route param is :channelId.
 */
export function assertChannelOwnership(
  request: FastifyRequest,
  reply: FastifyReply,
  channelId: string
): boolean {
  if (request.twitchClaims!.channel_id !== channelId) {
    reply.code(403).send({ error: 'Cannot modify another channel' });
    return false;
  }
  return true;
}
