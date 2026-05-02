import type { FastifyInstance } from 'fastify';
import Stripe from 'stripe';
import { z } from 'zod';
import { prisma } from '../services/db';
import { requireBroadcaster, assertChannelOwnership } from '../middleware/verifyTwitchJwt';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2024-06-20',
});

const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID ?? '';
const SUCCESS_URL  = process.env.STRIPE_SUCCESS_URL  ?? 'https://creatorbiohub.com/setup?upgrade=success';
const CANCEL_URL   = process.env.STRIPE_CANCEL_URL   ?? 'https://creatorbiohub.com/setup?upgrade=cancel';

export async function billingRoutes(app: FastifyInstance) {

  /**
   * POST /v1/billing/checkout
   * Creates a Stripe Checkout session for Creator Pro subscription.
   * Returns { url } — the client redirects to it.
   */
  app.post(
    '/billing/checkout',
    { preHandler: requireBroadcaster },
    async (request, reply) => {
      const { channelId } = z
        .object({ channelId: z.string() })
        .parse(request.body);

      if (!assertChannelOwnership(request, reply, channelId)) return;

      // Get or create the Stripe customer for this creator
      const profile = await prisma.creatorProfile.findUnique({
        where:  { id: channelId },
        select: { stripeCustomerId: true, displayName: true },
      });

      let customerId = profile?.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          metadata: { channelId },
          name:     profile?.displayName ?? channelId,
        });
        customerId = customer.id;
        await prisma.creatorProfile.upsert({
          where:  { id: channelId },
          create: { id: channelId, displayName: '', stripeCustomerId: customerId },
          update: { stripeCustomerId: customerId },
        });
      }

      const session = await stripe.checkout.sessions.create({
        customer:   customerId,
        mode:       'subscription',
        line_items: [{ price: PRO_PRICE_ID, quantity: 1 }],
        success_url: SUCCESS_URL,
        cancel_url:  CANCEL_URL,
        subscription_data: {
          metadata: { channelId },
        },
      });

      return reply.send({ url: session.url });
    }
  );

  /**
   * POST /v1/billing/portal
   * Creates a Stripe Customer Portal session for managing / cancelling.
   * Returns { url }.
   */
  app.post(
    '/billing/portal',
    { preHandler: requireBroadcaster },
    async (request, reply) => {
      const { channelId } = z
        .object({ channelId: z.string() })
        .parse(request.body);

      if (!assertChannelOwnership(request, reply, channelId)) return;

      const profile = await prisma.creatorProfile.findUnique({
        where:  { id: channelId },
        select: { stripeCustomerId: true },
      });

      if (!profile?.stripeCustomerId) {
        return reply.code(400).send({ error: 'No active subscription found' });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer:   profile.stripeCustomerId,
        return_url: SUCCESS_URL,
      });

      return reply.send({ url: session.url });
    }
  );

  /**
   * GET /v1/billing/status/:channelId
   * Returns current plan and subscription status for the dashboard.
   */
  app.get(
    '/billing/status/:channelId',
    { preHandler: requireBroadcaster },
    async (request, reply) => {
      const { channelId } = request.params as { channelId: string };
      if (!assertChannelOwnership(request, reply, channelId)) return;

      const profile = await prisma.creatorProfile.findUnique({
        where:   { id: channelId },
        include: { subscription: true },
      });

      if (!profile) return reply.code(404).send({ error: 'Profile not found' });

      return reply.send({
        plan:         profile.plan,
        subscription: profile.subscription
          ? {
              status:          profile.subscription.status,
              currentPeriodEnd: profile.subscription.currentPeriodEnd.toISOString(),
            }
          : null,
      });
    }
  );
}
