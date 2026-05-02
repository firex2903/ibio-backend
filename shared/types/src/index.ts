// ─────────────────────────────────────────────────────────────────────────────
// Creator Companion — Shared Type System
// Primary entity: CompanionModule. Everything is a typed module.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Primitive Enums ─────────────────────────────────────────────────────────

export type Plan = 'STARTER' | 'PRO';

export type ModuleKind =
  | 'CHANNEL_LINK'     // Creator on another platform
  | 'COMMUNITY_SPACE'  // Community group / server
  | 'STREAM_SCHEDULE'  // Display-only schedule — no URL required
  | 'PARTNER_CARD'     // Creator partner with optional viewer perk  [Pro]
  | 'VIEWER_PERK'      // Standalone copyable perk code              [Pro]
  | 'SUPPORT_OPTION'   // Way to support the creator
  | 'MERCH_SHOWCASE'   // Merch store with optional preview
  | 'CHANNEL_EVENT'    // Tournament / event / signup
  | 'QUICK_ACTION';    // Custom CTA button

export type DisplayGroup =
  | 'CHANNEL_RESOURCES'  // Support, Merch, Events, Quick Actions — rendered first
  | 'CREATOR_PARTNERS'   // Partner cards, Viewer perks
  | 'CREATOR_CHANNELS'   // Platform links
  | 'COMMUNITY_HUB';     // Community spaces + Stream schedule

export type InteractionKind =
  | 'MODULE_OPENED'     // Viewer expanded / viewed a module section
  | 'MODULE_ENGAGED'    // Viewer interacted without navigating (e.g. copied perk code)
  | 'MODULE_NAVIGATED'; // Viewer followed the module URL

export type Referrer = 'PANEL' | 'OVERLAY' | 'MOBILE';

export type SocialPlatform =
  | 'twitter' | 'youtube' | 'instagram' | 'tiktok' | 'discord'
  | 'twitch'  | 'kick'    | 'facebook'  | 'linkedin' | 'github'
  | 'patreon' | 'ko-fi'   | 'telegram'  | 'whatsapp' | 'website'
  | 'custom';

export type CommunityPlatform =
  | 'discord' | 'telegram' | 'whatsapp' | 'website' | 'custom';

export type SupportPlatform =
  | 'ko-fi' | 'streamlabs' | 'patreon' | 'paypal' | 'website';

// ─── Module Config Schemas ────────────────────────────────────────────────────
// Each ModuleKind has exactly one config interface.
// The JSON column in the DB stores one of these shapes.

export interface ChannelLinkConfig {
  platform: SocialPlatform;
  url: string;
  displayLabel?: string;        // overrides title for display, optional
}

export interface CommunitySpaceConfig {
  platform: CommunityPlatform;
  url: string;
  memberCount?: string;         // e.g. "12.4k members"
}

export interface StreamScheduleConfig {
  entries: StreamScheduleEntry[];
}

export interface StreamScheduleEntry {
  day: string;                  // "Monday"
  time: string;                 // "8:00 PM EST"
  label?: string;               // "Ranked Grind"
}

export interface PartnerCardConfig {  // Pro only
  url: string;
  imageUrl?: string;
  description?: string;
  ctaLabel?: string;            // defaults to "Learn More"
  viewerPerkCode?: string;      // e.g. "STREAM15"
  viewerPerkDescription?: string; // e.g. "15% off for viewers"
}

export interface ViewerPerkConfig {  // Pro only — standalone perk card
  perkCode: string;
  perkDescription: string;
  partnerName: string;
  url?: string;
}

export interface SupportOptionConfig {
  platform: SupportPlatform;
  url: string;
}

export interface MerchShowcaseConfig {
  url: string;
  imageUrl?: string;
  description?: string;
}

export interface ChannelEventConfig {
  url?: string;
  eventDate?: string;           // ISO-8601 date string
  description?: string;
}

export interface QuickActionConfig {
  url: string;
  icon?: string;                // emoji e.g. "⚡"
  color?: string;               // hex e.g. "#ff4ecd"
}

// ─── Discriminated Union — narrows config by moduleKind ──────────────────────

export type TypedModuleConfig =
  | { moduleKind: 'CHANNEL_LINK';    config: ChannelLinkConfig }
  | { moduleKind: 'COMMUNITY_SPACE'; config: CommunitySpaceConfig }
  | { moduleKind: 'STREAM_SCHEDULE'; config: StreamScheduleConfig }
  | { moduleKind: 'PARTNER_CARD';    config: PartnerCardConfig }
  | { moduleKind: 'VIEWER_PERK';     config: ViewerPerkConfig }
  | { moduleKind: 'SUPPORT_OPTION';  config: SupportOptionConfig }
  | { moduleKind: 'MERCH_SHOWCASE';  config: MerchShowcaseConfig }
  | { moduleKind: 'CHANNEL_EVENT';   config: ChannelEventConfig }
  | { moduleKind: 'QUICK_ACTION';    config: QuickActionConfig };

// Helper — extract config type from moduleKind string literal
export type ConfigForKind<K extends ModuleKind> =
  Extract<TypedModuleConfig, { moduleKind: K }>['config'];

// ─── Core Domain DTOs ────────────────────────────────────────────────────────

export interface BrandAssets {
  primaryColor: string;   // header gradient start
  secondaryColor: string; // header gradient end
  accentColor: string;    // neon accent — Pro only customizable
}

export interface CompanionModuleDTO {
  id: string;
  moduleKind: ModuleKind;
  title: string;
  subtitle?: string;
  position: number;
  visible: boolean;
  config: Record<string, unknown>; // narrowed on client via TypedModuleConfig
  createdAt: string;
  updatedAt: string;
}

export interface CreatorProfileDTO {
  profileId: string;
  displayName: string;
  channelBio: string;
  avatarUrl: string;
  plan: Plan;
  brandAssets: BrandAssets;
  modules: CompanionModuleDTO[];
  createdAt: string;
  updatedAt: string;
}

// ─── API Request Payloads ─────────────────────────────────────────────────────

export interface UpdateProfilePayload {
  displayName?: string;
  channelBio?: string;
  avatarUrl?: string;
  brandAssets?: Partial<BrandAssets>;
}

export interface CreateModulePayload {
  moduleKind: ModuleKind;
  title: string;
  subtitle?: string;
  position?: number;
  config: Record<string, unknown>;
}

export interface UpdateModulePayload {
  title?: string;
  subtitle?: string;
  visible?: boolean;
  config?: Record<string, unknown>;
}

export interface ReorderModulesPayload {
  order: string[]; // complete array of module IDs in desired position order
}

// ─── Interaction Tracking ─────────────────────────────────────────────────────

export interface ViewerInteractionPayload {
  moduleId: string;
  profileId: string;
  interactionKind: InteractionKind;
  referrer: Referrer;
  viewerOpaqueId?: string;
}

// ─── Viewer Insights (Pro only) ───────────────────────────────────────────────

export interface ModuleInsightDTO {
  moduleId: string;
  moduleKind: ModuleKind;
  title: string;
  totalInteractions: number;
  last7d: number;
  last30d: number;
  byKind: Partial<Record<InteractionKind, number>>;
}

export interface CreatorInsightsDTO {
  profileId: string;
  totalInteractions: number;
  last7d: number;
  last30d: number;
  modules: ModuleInsightDTO[];
  topModule: ModuleInsightDTO | null;
}

// ─── Plan Gates — single source of truth ─────────────────────────────────────

/** ModuleKinds restricted to the Pro plan */
export const PRO_ONLY_KINDS: ReadonlySet<ModuleKind> = new Set([
  'PARTNER_CARD',
  'VIEWER_PERK',
]);

/** Max modules on Starter plan */
export const STARTER_MODULE_LIMIT = 5;

/** Maps each ModuleKind to the DisplayGroup that renders it */
export const DISPLAY_GROUP: Record<ModuleKind, DisplayGroup> = {
  SUPPORT_OPTION:  'CHANNEL_RESOURCES',
  MERCH_SHOWCASE:  'CHANNEL_RESOURCES',
  CHANNEL_EVENT:   'CHANNEL_RESOURCES',
  QUICK_ACTION:    'CHANNEL_RESOURCES',
  PARTNER_CARD:    'CREATOR_PARTNERS',
  VIEWER_PERK:     'CREATOR_PARTNERS',
  CHANNEL_LINK:    'CREATOR_CHANNELS',
  COMMUNITY_SPACE: 'COMMUNITY_HUB',
  STREAM_SCHEDULE: 'COMMUNITY_HUB',
};

/** Display order for the four groups, top to bottom */
export const DISPLAY_GROUP_ORDER: DisplayGroup[] = [
  'CHANNEL_RESOURCES',
  'CREATOR_PARTNERS',
  'CREATOR_CHANNELS',
  'COMMUNITY_HUB',
];

/** Human-readable section headers shown to viewers */
export const DISPLAY_GROUP_LABEL: Record<DisplayGroup, string> = {
  CHANNEL_RESOURCES: 'Channel Resources',
  CREATOR_PARTNERS:  'Creator Partners',
  CREATOR_CHANNELS:  'Creator Channels',
  COMMUNITY_HUB:     'Community Hub',
};

/** Human-readable labels shown in Companion Setup (broadcaster config) */
export const MODULE_KIND_LABEL: Record<ModuleKind, string> = {
  CHANNEL_LINK:    'Creator Channel',
  COMMUNITY_SPACE: 'Community Space',
  STREAM_SCHEDULE: 'Stream Schedule',
  PARTNER_CARD:    'Creator Partner',
  VIEWER_PERK:     'Viewer Perk',
  SUPPORT_OPTION:  'Viewer Support',
  MERCH_SHOWCASE:  'Merch Showcase',
  CHANNEL_EVENT:   'Channel Event',
  QUICK_ACTION:    'Quick Action',
};

// ─── Twitch JWT Claims (unchanged — Twitch-defined shape) ─────────────────────

export interface TwitchExtensionClaims {
  exp: number;
  opaque_user_id: string;
  user_id?: string;
  channel_id: string;
  role: 'broadcaster' | 'viewer' | 'external';
  pubsub_perms?: { listen: string[]; send: string[] };
}
