import { useState } from 'react';
import type { PartnerCardConfig } from '@creator-bio-hub/types';
import { navigateFromModule, engageModule } from '../../lib/interactions';
import type { ModuleProps } from './types';

export function PartnerCardModule({ module, profileId, auth, referrer }: ModuleProps) {
  const cfg = module.config as PartnerCardConfig;
  const [copied, setCopied] = useState(false);

  const interactionBase = {
    moduleId:      module.id,
    profileId,
    referrer,
    viewerOpaqueId: auth?.userId || undefined,
  };

  const handleCta = () =>
    navigateFromModule(cfg.url, interactionBase, auth?.token);

  const copyPerkCode = async () => {
    if (!cfg.viewerPerkCode) return;
    try { await navigator.clipboard.writeText(cfg.viewerPerkCode); } catch { /* fallback */ }
    engageModule(interactionBase, auth?.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="partner-card">
      {cfg.imageUrl && (
        <img
          className="partner-card__img"
          src={cfg.imageUrl}
          alt={module.title}
          loading="lazy"
        />
      )}
      <div className="partner-card__body">
        <div className="partner-card__title">{module.title}</div>
        {cfg.description && (
          <div className="partner-card__description">{cfg.description}</div>
        )}

        {cfg.viewerPerkCode && (
          <button
            className={`perk-chip${copied ? ' perk-chip--copied' : ''}`}
            onClick={copyPerkCode}
            title="Tap to copy viewer perk"
          >
            <span className="perk-chip__badge">Viewer Perk</span>
            <span className="perk-chip__code">{cfg.viewerPerkCode}</span>
            <span className="perk-chip__action">
              {copied ? '✓ Copied!' : cfg.viewerPerkDescription ?? 'Copy'}
            </span>
          </button>
        )}

        <button className="partner-card__cta" onClick={handleCta}>
          {cfg.ctaLabel ?? 'Learn More'}
        </button>
      </div>
    </div>
  );
}
