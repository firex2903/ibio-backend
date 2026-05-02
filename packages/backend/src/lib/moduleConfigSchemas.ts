import { z } from 'zod';
import type { ModuleKind } from '@creator-bio-hub/types';

// ─── Platform Enums ───────────────────────────────────────────────────────────

const SocialPlatform = z.enum([
  'twitter', 'youtube', 'instagram', 'tiktok', 'discord',
  'twitch',  'kick',    'facebook',  'linkedin', 'github',
  'patreon', 'ko-fi',   'telegram',  'whatsapp', 'website', 'custom',
]);

const CommunityPlatform = z.enum([
  'discord', 'telegram', 'whatsapp', 'website', 'custom',
]);

const SupportPlatform = z.enum([
  'ko-fi', 'streamlabs', 'patreon', 'paypal', 'website',
]);

// ─── Per-Kind Config Schemas ──────────────────────────────────────────────────

const ChannelLinkConfig = z.object({
  platform:     SocialPlatform,
  url:          z.string().url(),
  displayLabel: z.string().max(64).optional(),
});

const CommunitySpaceConfig = z.object({
  platform:    CommunityPlatform,
  url:         z.string().url(),
  memberCount: z.string().max(32).optional(),
});

const StreamScheduleConfig = z.object({
  entries: z
    .array(
      z.object({
        day:   z.string().max(16),
        time:  z.string().max(32),
        label: z.string().max(64).optional(),
      })
    )
    .min(1)
    .max(7),
});

const PartnerCardConfig = z.object({
  url:                    z.string().url(),
  imageUrl:               z.string().url().optional(),
  description:            z.string().max(200).optional(),
  ctaLabel:               z.string().max(32).optional(),
  viewerPerkCode:         z.string().max(32).optional(),
  viewerPerkDescription:  z.string().max(80).optional(),
});

const ViewerPerkConfig = z.object({
  perkCode:        z.string().min(1).max(32),
  perkDescription: z.string().min(1).max(80),
  partnerName:     z.string().min(1).max(64),
  url:             z.string().url().optional(),
});

const SupportOptionConfig = z.object({
  platform: SupportPlatform,
  url:      z.string().url(),
});

const MerchShowcaseConfig = z.object({
  url:         z.string().url(),
  imageUrl:    z.string().url().optional(),
  description: z.string().max(200).optional(),
});

const ChannelEventConfig = z.object({
  url:         z.string().url().optional(),
  eventDate:   z.string().datetime().optional(),
  description: z.string().max(200).optional(),
}).refine(
  (d) => d.url !== undefined || d.description !== undefined,
  { message: 'A channel event must have at least a URL or description' }
);

const QuickActionConfig = z.object({
  url:   z.string().url(),
  icon:  z.string().max(8).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

// ─── Lookup Table ─────────────────────────────────────────────────────────────
// satisfies ensures every ModuleKind is covered — compile-time exhaustiveness.

export const MODULE_CONFIG_SCHEMAS = {
  CHANNEL_LINK:    ChannelLinkConfig,
  COMMUNITY_SPACE: CommunitySpaceConfig,
  STREAM_SCHEDULE: StreamScheduleConfig,
  PARTNER_CARD:    PartnerCardConfig,
  VIEWER_PERK:     ViewerPerkConfig,
  SUPPORT_OPTION:  SupportOptionConfig,
  MERCH_SHOWCASE:  MerchShowcaseConfig,
  CHANNEL_EVENT:   ChannelEventConfig,
  QUICK_ACTION:    QuickActionConfig,
} satisfies Record<ModuleKind, z.ZodTypeAny>;

// ─── Validate Helper ──────────────────────────────────────────────────────────

export function validateModuleConfig(
  kind: ModuleKind,
  rawConfig: unknown
): { success: true; data: Record<string, unknown> } | { success: false; error: z.ZodError } {
  const schema = MODULE_CONFIG_SCHEMAS[kind];
  const result = schema.safeParse(rawConfig);
  if (result.success) {
    return { success: true, data: result.data as Record<string, unknown> };
  }
  return { success: false, error: result.error };
}
