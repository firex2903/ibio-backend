import type { CSSProperties } from 'react';
import type { ChannelLinkConfig } from '@creator-bio-hub/types';
import { PLATFORM_ICONS, PLATFORM_COLORS } from '../../lib/platformIcons';
import { navigateFromModule } from '../../lib/interactions';
import type { ModuleProps } from './types';

export function ChannelLinkModule({ module, profileId, auth, referrer }: ModuleProps) {
  const cfg = module.config as ChannelLinkConfig;
  const iconPath = PLATFORM_ICONS[cfg.platform] ?? PLATFORM_ICONS.custom;
  const color    = PLATFORM_COLORS[cfg.platform] ?? '#9147FF';

  const handleClick = () =>
    navigateFromModule(
      cfg.url,
      { moduleId: module.id, profileId, referrer, viewerOpaqueId: auth?.userId || undefined },
      auth?.token
    );

  return (
    <button
      className="social-btn"
      onClick={handleClick}
      title={cfg.url}
      style={{ '--platform-color': color, '--platform-glow': color + '55' } as CSSProperties}
    >
      <svg className="social-btn__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d={iconPath} />
      </svg>
      <span className="social-btn__label">{cfg.displayLabel ?? module.title}</span>
    </button>
  );
}
