import type { MerchShowcaseConfig } from '@creator-bio-hub/types';
import { navigateFromModule } from '../../lib/interactions';
import type { ModuleProps } from './types';

export function MerchShowcaseModule({ module, profileId, auth, referrer }: ModuleProps) {
  const cfg = module.config as MerchShowcaseConfig;

  const interactionBase = {
    moduleId:       module.id,
    profileId,
    referrer,
    viewerOpaqueId: auth?.userId || undefined,
  };

  // If image provided, render full card; otherwise render action button
  if (cfg.imageUrl) {
    return (
      <div className="merch-card">
        <img
          className="merch-card__img"
          src={cfg.imageUrl}
          alt={module.title}
          loading="lazy"
        />
        <div className="merch-card__body">
          <div className="merch-card__title">{module.title}</div>
          {cfg.description && (
            <div className="merch-card__desc">{cfg.description}</div>
          )}
          <button
            className="merch-card__cta"
            onClick={() => navigateFromModule(cfg.url, interactionBase, auth?.token)}
          >
            View Merch
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      className="action-btn action-btn--merch"
      onClick={() => navigateFromModule(cfg.url, interactionBase, auth?.token)}
    >
      <span className="action-btn__icon" aria-hidden="true">👕</span>
      <span className="action-btn__label">{module.title}</span>
    </button>
  );
}
