import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import { creatorRoutes } from './routes/creator';
import { moduleRoutes } from './routes/modules';
import { insightsRoutes } from './routes/insights';
import { billingRoutes } from './routes/billing';
import { webhookRoutes } from './routes/webhooks';
import { internalRoutes } from './routes/internal';
import { bitsRoutes } from './routes/bits';
import { productsRoutes } from './routes/products';
import { devRoutes } from './routes/dev';

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    ...(process.env.NODE_ENV === 'development' && {
      transport: { target: 'pino-pretty' },
    }),
  },
});

// ─── Security & middleware ────────────────────────────────────────────────────

await app.register(helmet, { contentSecurityPolicy: false });
await app.register(multipart, { limits: { fileSize: 100 * 1024 * 1024 } });

await app.register(cors, {
  origin: [
    /\.twitch\.tv$/,
    /\.ext-twitch\.tv$/,
    /\.extension-files\.twitch\.tv$/,
    /\.lhr\.life$/,
    /\.trycloudflare\.com$/,
    'https://creatorbiohub.com',
    ...(process.env.NODE_ENV === 'development'
      ? ['http://localhost:8080', 'http://localhost:3000']
      : []),
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

await app.register(rateLimit, {
  max:        120,
  timeWindow: '1 minute',
  // Interactions endpoint gets a higher limit — fire-and-forget from extension
  keyGenerator: (req) => {
    if (req.url?.includes('/interactions')) return `interact-${req.ip}`;
    return req.ip ?? 'unknown';
  },
});

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/health', async () => ({ ok: true, ts: new Date().toISOString() }));

// ─── API v1 ───────────────────────────────────────────────────────────────────

await app.register(creatorRoutes,  { prefix: '/v1' });
await app.register(moduleRoutes,   { prefix: '/v1' });
await app.register(insightsRoutes, { prefix: '/v1' });
await app.register(billingRoutes,  { prefix: '/v1' });
await app.register(webhookRoutes,  { prefix: '/v1' });
await app.register(internalRoutes,  { prefix: '/v1' });
await app.register(bitsRoutes,      { prefix: '/v1' });
await app.register(productsRoutes,  { prefix: '/v1' });
if (process.env.NODE_ENV === 'development') {
  await app.register(devRoutes, { prefix: '/v1' });
  app.log.warn('⚠️  Dev routes enabled — disable in production');
}

// ─── Start ────────────────────────────────────────────────────────────────────

const port = Number(process.env.PORT ?? 3001);
await app.listen({ port, host: '0.0.0.0' });

// ─── Graceful shutdown ────────────────────────────────────────────────────────

const shutdown = async (signal: string) => {
  app.log.info(`Received ${signal} — shutting down gracefully`);
  await app.close();
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT',  () => void shutdown('SIGINT'));
