"use strict";
// ─────────────────────────────────────────────────────────────────────────────
// Creator Companion — Shared Type System
// Primary entity: CompanionModule. Everything is a typed module.
// ─────────────────────────────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODULE_KIND_LABEL = exports.DISPLAY_GROUP_LABEL = exports.DISPLAY_GROUP_ORDER = exports.DISPLAY_GROUP = exports.STARTER_MODULE_LIMIT = exports.PRO_ONLY_KINDS = void 0;
// ─── Plan Gates — single source of truth ─────────────────────────────────────
/** ModuleKinds restricted to the Pro plan */
exports.PRO_ONLY_KINDS = new Set([
    'PARTNER_CARD',
    'VIEWER_PERK',
]);
/** Max modules on Starter plan */
exports.STARTER_MODULE_LIMIT = 5;
/** Maps each ModuleKind to the DisplayGroup that renders it */
exports.DISPLAY_GROUP = {
    SUPPORT_OPTION: 'CHANNEL_RESOURCES',
    MERCH_SHOWCASE: 'CHANNEL_RESOURCES',
    CHANNEL_EVENT: 'CHANNEL_RESOURCES',
    QUICK_ACTION: 'CHANNEL_RESOURCES',
    PARTNER_CARD: 'CREATOR_PARTNERS',
    VIEWER_PERK: 'CREATOR_PARTNERS',
    CHANNEL_LINK: 'CREATOR_CHANNELS',
    COMMUNITY_SPACE: 'COMMUNITY_HUB',
    STREAM_SCHEDULE: 'COMMUNITY_HUB',
};
/** Display order for the four groups, top to bottom */
exports.DISPLAY_GROUP_ORDER = [
    'CHANNEL_RESOURCES',
    'CREATOR_PARTNERS',
    'CREATOR_CHANNELS',
    'COMMUNITY_HUB',
];
/** Human-readable section headers shown to viewers */
exports.DISPLAY_GROUP_LABEL = {
    CHANNEL_RESOURCES: 'Channel Resources',
    CREATOR_PARTNERS: 'Creator Partners',
    CREATOR_CHANNELS: 'Creator Channels',
    COMMUNITY_HUB: 'Community Hub',
};
/** Human-readable labels shown in Companion Setup (broadcaster config) */
exports.MODULE_KIND_LABEL = {
    CHANNEL_LINK: 'Creator Channel',
    COMMUNITY_SPACE: 'Community Space',
    STREAM_SCHEDULE: 'Stream Schedule',
    PARTNER_CARD: 'Creator Partner',
    VIEWER_PERK: 'Viewer Perk',
    SUPPORT_OPTION: 'Viewer Support',
    MERCH_SHOWCASE: 'Merch Showcase',
    CHANNEL_EVENT: 'Channel Event',
    QUICK_ACTION: 'Quick Action',
};
