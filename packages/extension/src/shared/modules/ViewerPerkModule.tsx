import { useState } from 'react';
import type { ViewerPerkConfig } from '@creator-bio-hub/types';
import { engageModule, navigateFromModule } from '../../lib/interactions';
import type { ModuleProps } from './types';

/** Standalone perk code card — Pro only, no image, pure viewer utility */
export function ViewerPerkModule({ module, profileId, auth, referrer }: ModuleProps) {
  const cfg = module.config as ViewerPerkConfig;
  const [copied, setCopied] = useState(false);

  const interactionBase = {
    moduleId:       module.id,
    profileId,
    referrer,
    viewerOpaqueId: auth?.userId || undefined,
  };

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(cfg.perkCode); } catch { /* */ }
    engageModule(interactionBase, auth?.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="viewer-perk-card">
      <div className="viewer-perk-card__header">
        <span className="viewer-perk-card__partner">{cfg.partnerName}</span>
        <span className="viewer-perk-card__badge">Viewer Perk</span>
      </div>
      <div className="viewer-perk-card__desc">{cfg.perkDescription}</div>
      <button
        className={`viewer-perk-card__code${copied ? ' viewer-perk-card__code--copied' : ''}`}
        onClick={handleCopy}
        title="Tap to copy"
      >
        <span className="viewer-perk-card__code-value">{cfg.perkCode}</span>
        <span className="viewer-perk-card__code-copy">
          {copied ? '✓ Copied!' : 'Tap to copy'}
        </span>
      </button>
      {cfg.url && (
        <button
          className="viewer-perk-card__link"
          onClick={() => navigateFromModule(cfg.url!, interactionBase, auth?.token)}
        >
          More info ›
        </button>
      )}
    </div>
  );
}
