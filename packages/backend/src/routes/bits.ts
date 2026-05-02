/**
 * Bits transaction verification & fulfillment.
 * Called by the extension frontend after Twitch.ext.bits.onTransactionComplete.
 */
import type { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import { prisma } from '../services/db.js';

const EXT_SECRET = Buffer.from(process.env.TWITCH_EXT_SECRET ?? '', 'base64');

// SKUs configured in Twitch Developer Console
export const BITS_SKUS = {
  DONATION_300:  '002X',  // 300 bits
  DONATION_500:  '001X',  // 500 bits
  DONATION_1000: '003X',  // 1000 bits
  PRO_UPGRADE:   '001S',  // 1000 bits — Plan pro
} as const;

const PRO_SKUS  = new Set([BITS_SKUS.PRO_UPGRADE]);
const DONA_SKUS = new Set([BITS_SKUS.DONATION_300, BITS_SKUS.DONATION_500, BITS_SKUS.DONATION_1000]);

interface BitsClaims {
  topic: 'bits_transaction_receipt';
  channel_id: string;
  user_id: string;
  data: {
    transactionId: string;
    product: { sku: string; cost: { amount: number; type: 'bits' } };
    userId: string;
    timestamp: string;
  };
}

export async function bitsRoutes(app: FastifyInstance) {

  /**
   * POST /v1/bits/transaction
   * Body: { transactionReceipt: string (JWT), channelId: string }
   */
  app.post('/bits/transaction', async (req, reply) => {
    const { transactionReceipt, channelId } = req.body as {
      transactionReceipt: string;
      channelId: string;
    };

    if (!transactionReceipt || !channelId) {
      return reply.code(400).send({ error: 'Missing fields' });
    }

    let claims: BitsClaims;
    try {
      claims = jwt.verify(transactionReceipt, EXT_SECRET) as BitsClaims;
    } catch {
      return reply.code(400).send({ error: 'Invalid receipt' });
    }

    if (claims.topic !== 'bits_transaction_receipt') {
      return reply.code(400).send({ error: 'Wrong receipt type' });
    }

    const sku = claims.data.product.sku;
    const bits = claims.data.product.cost.amount;

    if (PRO_SKUS.has(sku)) {
      // Upgrade the channel to Pro
      await prisma.creatorProfile.upsert({
        where:  { id: channelId },
        create: { id: channelId, displayName: '', plan: 'PRO' },
        update: { plan: 'PRO' },
      });
      return reply.send({ ok: true, action: 'upgraded', plan: 'PRO' });
    }

    // Donation — log it (future: store in donations table)
    app.log.info({ channelId, sku, bits, txId: claims.data.transactionId }, 'bits donation received');
    return reply.send({ ok: true, action: 'donated', bits });
  });
}
