import type { CSSProperties } from 'react';
import type { QuickActionConfig } from '@creator-bio-hub/types';
import { navigateFromModule } from '../../lib/interactions';
import type { ModuleProps } from './types';

export function QuickActionModule({ module, profileId, auth, referrer }: ModuleProps) {
  const cfg = module.config as QuickActionConfig;

  const customStyle = cfg.color
    ? ({
        background:  cfg.color,
        boxShadow:   `0 0 20px ${cfg.color}55`,
        borderColor: `${cfg.color}44`,
      } as CSSProperties)
    : undefined;

  return (
    <button
      className="action-btn action-btn--quick"
      style={customStyle}
      onClick={() =>
        navigateFromModule(
          cfg.url,
          { moduleId: module.id, profileId, referrer, viewerOpaqueId: auth?.userId || undefined },
          auth?.token
        )
      }
    >
      {cfg.icon && (
        <span className="action-btn__icon" aria-hidden="true">{cfg.icon}</span>
      )}
      <span className="action-btn__label">{module.title}</span>
    </button>
  );
}
