import type { FastifyInstance } from 'fastify';
import Stripe from 'stripe';
import { prisma } from '../services/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2024-06-20',
});
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';

export async function webhookRoutes(app: FastifyInstance) {
  // Stripe signature verification requires the raw request body as a Buffer.
  // Register a content-type parser that preserves it before Fastify JSON-parses.
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (_req, body, done) => done(null, body)
  );

  app.post('/webhooks/stripe', async (request, reply) => {
    const sig = request.headers['stripe-signature'];
    if (!sig || typeof sig !== 'string') {
      return reply.code(400).send({ error: 'Missing stripe-signature header' });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        request.body as Buffer,
        sig,
        WEBHOOK_SECRET
      );
    } catch (err) {
      app.log.warn({ err }, 'Stripe webhook signature verification failed');
      return reply.code(400).send({ error: 'Invalid signature' });
    }

    try {
      await handleEvent(event);
    } catch (err) {
      // Log but return 200 — Stripe will retry on non-2xx
      app.log.error({ err, eventType: event.type }, 'Webhook handler error');
    }

    return reply.code(200).send({ received: true });
  });
}

// ─── Event Handlers ───────────────────────────────────────────────────────────

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await cancelSubscription(event.data.object as Stripe.Subscription);
      break;

    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    default:
      // Unhandled event types are silently acknowledged
      break;
  }
}

async function resolveChannelId(customerId: string): Promise<string | null> {
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;
  return (customer as Stripe.Customer).metadata?.channelId ?? null;
}

async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const channelId = await resolveChannelId(sub.customer as string);
  if (!channelId) return;

  const isActive = sub.status === 'active' || sub.status === 'trialing';
  const priceId  = sub.items.data[0]?.price.id ?? '';
  const periodEnd = new Date(sub.current_period_end * 1000);

  await prisma.$transaction([
    prisma.creatorProfile.upsert({
      where:  { id: channelId },
      create: { id: channelId, displayName: '', plan: isActive ? 'PRO' : 'STARTER' },
      update: { plan: isActive ? 'PRO' : 'STARTER' },
    }),
    prisma.creatorSubscription.upsert({
      where:  { profileId: channelId },
      create: {
        profileId:           channelId,
        stripeSubscriptionId: sub.id,
        stripePriceId:       priceId,
        status:              sub.status,
        currentPeriodEnd:    periodEnd,
      },
      update: {
        stripeSubscriptionId: sub.id,
        stripePriceId:       priceId,
        status:              sub.status,
        currentPeriodEnd:    periodEnd,
      },
    }),
  ]);
}

async function cancelSubscription(sub: Stripe.Subscription): Promise<void> {
  const channelId = await resolveChannelId(sub.customer as string);
  if (!channelId) return;

  await prisma.$transaction([
    prisma.creatorProfile.updateMany({
      where: { id: channelId },
      data:  { plan: 'STARTER' },
    }),
    prisma.creatorSubscription.updateMany({
      where: { stripeSubscriptionId: sub.id },
      data:  { status: 'canceled' },
    }),
  ]);
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  if (!invoice.subscription) return;
  const channelId = await resolveChannelId(invoice.customer as string);
  if (!channelId) return;

  await prisma.creatorSubscription.updateMany({
    where: { stripeSubscriptionId: invoice.subscription as string },
    data:  { status: 'past_due' },
  });
}
