import type { ChannelEventConfig } from '@creator-bio-hub/types';
import { navigateFromModule } from '../../lib/interactions';
import type { ModuleProps } from './types';

function formatEventDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month:   'short',
      day:     'numeric',
      hour:    'numeric',
      minute:  '2-digit',
      timeZoneName: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ChannelEventModule({ module, profileId, auth, referrer }: ModuleProps) {
  const cfg = module.config as ChannelEventConfig;

  const interactionBase = {
    moduleId:       module.id,
    profileId,
    referrer,
    viewerOpaqueId: auth?.userId || undefined,
  };

  const handleClick = cfg.url
    ? () => navigateFromModule(cfg.url!, interactionBase, auth?.token)
    : undefined;

  return (
    <button
      className={`action-btn action-btn--event${!handleClick ? ' action-btn--no-link' : ''}`}
      onClick={handleClick}
      disabled={!handleClick}
      style={!handleClick ? { cursor: 'default', opacity: 0.85 } : undefined}
    >
      <span className="action-btn__icon" aria-hidden="true">🏆</span>
      <span className="action-btn__content">
        <span className="action-btn__label">{module.title}</span>
        {cfg.eventDate && (
          <span className="action-btn__sub">{formatEventDate(cfg.eventDate)}</span>
        )}
        {cfg.description && !cfg.eventDate && (
          <span className="action-btn__sub">{cfg.description}</span>
        )}
      </span>
    </button>
  );
}
