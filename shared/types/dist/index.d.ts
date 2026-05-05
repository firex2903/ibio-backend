export type Plan = 'STARTER' | 'PRO';
export type ModuleKind = 'CHANNEL_LINK' | 'COMMUNITY_SPACE' | 'STREAM_SCHEDULE' | 'PARTNER_CARD' | 'VIEWER_PERK' | 'SUPPORT_OPTION' | 'MERCH_SHOWCASE' | 'CHANNEL_EVENT' | 'QUICK_ACTION';
export type DisplayGroup = 'CHANNEL_RESOURCES' | 'CREATOR_PARTNERS' | 'CREATOR_CHANNELS' | 'COMMUNITY_HUB';
export type InteractionKind = 'MODULE_OPENED' | 'MODULE_ENGAGED' | 'MODULE_NAVIGATED';
export type Referrer = 'PANEL' | 'OVERLAY' | 'MOBILE';
export type SocialPlatform = 'twitter' | 'youtube' | 'instagram' | 'tiktok' | 'discord' | 'twitch' | 'kick' | 'facebook' | 'linkedin' | 'github' | 'patreon' | 'ko-fi' | 'telegram' | 'whatsapp' | 'website' | 'custom';
export type CommunityPlatform = 'discord' | 'telegram' | 'whatsapp' | 'website' | 'custom';
export type SupportPlatform = 'ko-fi' | 'streamlabs' | 'patreon' | 'paypal' | 'website';
export interface ChannelLinkConfig {
    platform: SocialPlatform;
    url: string;
    displayLabel?: string;
}
export interface CommunitySpaceConfig {
    platform: CommunityPlatform;
    url: string;
    memberCount?: string;
}
export interface StreamScheduleConfig {
    entries: StreamScheduleEntry[];
}
export interface StreamScheduleEntry {
    day: string;
    time: string;
    label?: string;
}
export interface PartnerCardConfig {
    url: string;
    imageUrl?: string;
    description?: string;
    ctaLabel?: string;
    viewerPerkCode?: string;
    viewerPerkDescription?: string;
}
export interface ViewerPerkConfig {
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
    eventDate?: string;
    description?: string;
}
export interface QuickActionConfig {
    url: string;
    icon?: string;
    color?: string;
}
export type TypedModuleConfig = {
    moduleKind: 'CHANNEL_LINK';
    config: ChannelLinkConfig;
} | {
    moduleKind: 'COMMUNITY_SPACE';
    config: CommunitySpaceConfig;
} | {
    moduleKind: 'STREAM_SCHEDULE';
    config: StreamScheduleConfig;
} | {
    moduleKind: 'PARTNER_CARD';
    config: PartnerCardConfig;
} | {
    moduleKind: 'VIEWER_PERK';
    config: ViewerPerkConfig;
} | {
    moduleKind: 'SUPPORT_OPTION';
    config: SupportOptionConfig;
} | {
    moduleKind: 'MERCH_SHOWCASE';
    config: MerchShowcaseConfig;
} | {
    moduleKind: 'CHANNEL_EVENT';
    config: ChannelEventConfig;
} | {
    moduleKind: 'QUICK_ACTION';
    config: QuickActionConfig;
};
export type ConfigForKind<K extends ModuleKind> = Extract<TypedModuleConfig, {
    moduleKind: K;
}>['config'];
export interface BrandAssets {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    overlayPosition?: string;
    overlayBgColor?: string;
    overlayBgImageUrl?: string;
}
export interface CompanionModuleDTO {
    id: string;
    moduleKind: ModuleKind;
    title: string;
    subtitle?: string;
    position: number;
    visible: boolean;
    config: Record<string, unknown>;
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
    order: string[];
}
export interface ViewerInteractionPayload {
    moduleId: string;
    profileId: string;
    interactionKind: InteractionKind;
    referrer: Referrer;
    viewerOpaqueId?: string;
}
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
/** ModuleKinds restricted to the Pro plan */
export declare const PRO_ONLY_KINDS: ReadonlySet<ModuleKind>;
/** Max modules on Starter plan */
export declare const STARTER_MODULE_LIMIT = 5;
/** Maps each ModuleKind to the DisplayGroup that renders it */
export declare const DISPLAY_GROUP: Record<ModuleKind, DisplayGroup>;
/** Display order for the four groups, top to bottom */
export declare const DISPLAY_GROUP_ORDER: DisplayGroup[];
/** Human-readable section headers shown to viewers */
export declare const DISPLAY_GROUP_LABEL: Record<DisplayGroup, string>;
/** Human-readable labels shown in Companion Setup (broadcaster config) */
export declare const MODULE_KIND_LABEL: Record<ModuleKind, string>;
export interface TwitchExtensionClaims {
    exp: number;
    opaque_user_id: string;
    user_id?: string;
    channel_id: string;
    role: 'broadcaster' | 'viewer' | 'external';
    pubsub_perms?: {
        listen: string[];
        send: string[];
    };
}
