import type { CommunitySpaceConfig } from '@creator-bio-hub/types';
import { navigateFromModule } from '../../lib/interactions';
import type { ModuleProps } from './types';

const PLATFORM_EMOJI: Record<string, string> = {
  discord:  '🎮',
  telegram: '✈️',
  whatsapp: '💬',
  website:  '🌐',
  custom:   '🔗',
};

function safeHostname(url: string): string {
  try   { return new URL(url).hostname.replace('www.', ''); }
  catch { return ''; }
}

export function CommunitySpaceModule({ module, profileId, auth, referrer }: ModuleProps) {
  const cfg = module.config as CommunitySpaceConfig;

  const handleClick = () =>
    navigateFromModule(
      cfg.url,
      { moduleId: module.id, profileId, referrer, viewerOpaqueId: auth?.userId || undefined },
      auth?.token
    );

  return (
    <button className="community-item" onClick={handleClick}>
      <div className="community-item__icon-wrap">
        <span aria-hidden="true">{PLATFORM_EMOJI[cfg.platform] ?? '🔗'}</span>
      </div>
      <div className="community-item__body">
        <span className="community-item__label">{module.title}</span>
        <span className="community-item__sub">
          {cfg.memberCount ? cfg.memberCount : safeHostname(cfg.url)}
        </span>
      </div>
      <span className="community-item__arrow" aria-hidden="true">›</span>
    </button>
  );
}
