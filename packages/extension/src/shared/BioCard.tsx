import type { CSSProperties } from 'react';
import type {
  CreatorProfileDTO,
  CompanionModuleDTO,
  DisplayGroup,
  Referrer,
} from '@creator-bio-hub/types';
import {
  DISPLAY_GROUP,
  DISPLAY_GROUP_ORDER,
  DISPLAY_GROUP_LABEL,
} from '@creator-bio-hub/types';
import { useState } from 'react';
import type { TwitchAuth } from '../hooks/useTwitchAuth';
import { ModuleRenderer } from './ModuleRenderer';
import { BitsButton } from './BitsButton';
import { ProductShowcase } from './ProductShowcase';

// ─── Group layout config ───────────────────────────────────────────────────────
// Controls how each DisplayGroup's modules are wrapped in the DOM.

const GROUP_WRAPPER: Record<DisplayGroup, string> = {
  CHANNEL_RESOURCES: 'action-grid',
  CREATOR_PARTNERS:  'partner-list',
  CREATOR_CHANNELS:  'social-grid',
  COMMUNITY_HUB:     'community-list',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  profile: CreatorProfileDTO;
  auth: TwitchAuth | null;
  referrer: Referrer;
  /** Shell class: 'bio-panel' | 'bio-mobile' | omit for overlay modal */
  wrapClass?: string;
}

// ─── BioCard ─────────────────────────────────────────────────────────────────

export function BioCard({ profile, auth, referrer, wrapClass }: Props) {
  const [upgraded, setUpgraded] = useState(false);
  const { brandAssets } = profile;
  const channelId = auth?.channelId ?? profile.profileId;
  const isPro = profile.plan === 'PRO' || upgraded;

  const bannerStyle = {
    '--banner-primary':   brandAssets.primaryColor,
    '--banner-secondary': brandAssets.secondaryColor,
    '--accent':           brandAssets.accentColor,
  } as CSSProperties;

  // Group visible modules by DisplayGroup, preserving position sort
  const grouped = groupModules(profile.modules);
  const hasContent = Object.values(grouped).some((arr) => arr.length > 0);

  return (
    <div className={wrapClass ?? ''} style={bannerStyle}>

      {/* ── Identity Header ── */}
      <div className="bio-header">
        <div className="bio-header__banner" />
        <div className="bio-header__avatar-wrap">
          <AvatarImage url={profile.avatarUrl} name={profile.displayName} />
        </div>
        <div className="bio-header__info">
          <div className="bio-header__name">
            {profile.displayName || 'Creator Companion'}
          </div>
          {profile.channelBio && (
            <div className="bio-header__bio">{profile.channelBio}</div>
          )}
          {isPro && (
            <div className="bio-header__badges">
              <span className="bio-badge bio-badge--accent">✦ Creator Pro</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Bits Actions ── */}
      <div className="bits-actions">
        <div className="bits-donate-row">
          <BitsButton channelId={channelId} sku="002X" label="300" icon="💜" className="bits-btn bits-btn--donate bits-btn--tier" />
          <BitsButton channelId={channelId} sku="001X" label="500" icon="💜" className="bits-btn bits-btn--donate bits-btn--tier" />
          <BitsButton channelId={channelId} sku="003X" label="1000" icon="💜" className="bits-btn bits-btn--donate bits-btn--tier" />
        </div>
      </div>

      {/* ── Digital Products ── */}
      <ProductShowcase channelId={channelId} token={auth?.token ?? null} />

      {/* ── Module Sections ── */}
      {!hasContent ? (
        <EmptyState />
      ) : (
        DISPLAY_GROUP_ORDER.map((group) => {
          const modules = grouped[group];
          if (!modules?.length) return null;
          return (
            <Section
              key={group}
              group={group}
              modules={modules}
              profileId={profile.profileId}
              auth={auth}
              referrer={referrer}
            />
          );
        })
      )}

      <div className="bio-footer">
        Creator Companion ·{' '}
        <a href="https://creatorbiohub.com" target="_blank" rel="noreferrer">
          Creator Bio Hub
        </a>
      </div>
    </div>
  );
}

// ─── AvatarImage ─────────────────────────────────────────────────────────────

function AvatarImage({ url, name }: { url?: string; name?: string }) {
  const [failed, setFailed] = useState(false);
  const letter = name?.[0]?.toUpperCase() ?? '?';

  if (!url || failed) {
    return <div className="bio-header__avatar-fallback">{letter}</div>;
  }
  return (
    <img
      className="bio-header__avatar"
      src={url}
      alt={name}
      onError={() => setFailed(true)}
    />
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

interface SectionProps {
  group: DisplayGroup;
  modules: CompanionModuleDTO[];
  profileId: string;
  auth: TwitchAuth | null;
  referrer: Referrer;
}

function Section({ group, modules, profileId, auth, referrer }: SectionProps) {
  const wrapperClass = GROUP_WRAPPER[group];

  // CHANNEL_RESOURCES: odd-last child needs full-width treatment
  const gridModifier =
    group === 'CHANNEL_RESOURCES' && modules.length % 2 !== 0
      ? `${wrapperClass} ${wrapperClass}--odd`
      : wrapperClass;

  return (
    <div className="bio-section">
      <div className="bio-section__title">{DISPLAY_GROUP_LABEL[group]}</div>
      <div className={gridModifier}>
        {modules.map((m) => (
          <ModuleRenderer key={m.id} module={m} profileId={profileId} auth={auth} referrer={referrer} />
        ))}
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="bio-empty">
      <div className="bio-empty__icon">🎮</div>
      <div className="bio-empty__title">Channel info coming soon</div>
      <div className="bio-empty__sub">
        This creator hasn't set up their companion yet.
      </div>
    </div>
  );
}

// ─── Grouping Logic ───────────────────────────────────────────────────────────

function groupModules(
  modules: CompanionModuleDTO[]
): Partial<Record<DisplayGroup, CompanionModuleDTO[]>> {
  const result: Partial<Record<DisplayGroup, CompanionModuleDTO[]>> = {};
  for (const m of modules) {
    const group = DISPLAY_GROUP[m.moduleKind];
    if (!result[group]) result[group] = [];
    result[group]!.push(m);
  }
  // Each group is already position-sorted because the API returns modules
  // ordered by position ASC. No re-sort needed.
  return result;
}
