import type { SupportOptionConfig } from '@creator-bio-hub/types';
import { navigateFromModule } from '../../lib/interactions';
import type { ModuleProps } from './types';

const PLATFORM_EMOJI: Record<string, string> = {
  'ko-fi':      '☕',
  streamlabs:   '🎮',
  patreon:      '🧡',
  paypal:       '💙',
  website:      '💜',
};

export function SupportOptionModule({ module, profileId, auth, referrer }: ModuleProps) {
  const cfg = module.config as SupportOptionConfig;

  return (
    <button
      className="action-btn action-btn--support"
      onClick={() =>
        navigateFromModule(
          cfg.url,
          { moduleId: module.id, profileId, referrer, viewerOpaqueId: auth?.userId || undefined },
          auth?.token
        )
      }
    >
      <span className="action-btn__icon" aria-hidden="true">
        {PLATFORM_EMOJI[cfg.platform] ?? '💜'}
      </span>
      <span className="action-btn__label">{module.title}</span>
    </button>
  );
}
