import React, { useState, useEffect, useRef } from 'react';
import { useTwitchAuth } from '../hooks/useTwitchAuth';
import { useCreatorProfile } from '../hooks/useCreatorProfile';
import { BioCard } from '../shared/BioCard';
import type { CreatorProfileDTO } from '@creator-bio-hub/types';
import '../shared/biocard.css';

const DEMO_PROFILE: CreatorProfileDTO = {
  profileId: 'demo',
  displayName: 'EsG_FireX',
  channelBio: 'Amante de los videojuegos y deportes electronicos 🎮',
  avatarUrl: 'https://static-cdn.jtvnw.net/jtv_user_pictures/esg_firex-profile_image-300x300.png',
  plan: 'STARTER',
  brandAssets: { primaryColor: '#9147FF', secondaryColor: '#1a0a2e', accentColor: '#9147FF' },
  modules: [
    {
      id: 'demo-ig',
      moduleKind: 'CHANNEL_LINK',
      title: 'Instagram',
      subtitle: '@firex.gg',
      position: 0,
      visible: true,
      config: { platform: 'instagram', url: 'https://www.instagram.com/firex.gg/', label: 'Sígueme en Instagram' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

type ModalState = 'closed' | 'opening' | 'open' | 'closing';

export function Overlay() {
  const { auth } = useTwitchAuth();
  const { profile: rawProfile } = useCreatorProfile(auth?.channelId, auth?.token);
  const profile = rawProfile ?? DEMO_PROFILE;
  const [modalState, setModalState] = useState<ModalState>('closed');
  const [isLive, setIsLive] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track actual stream live state via Twitch context
  useEffect(() => {
    if (typeof Twitch === 'undefined') return;
    Twitch.ext.onContext((ctx) => {
      // playbackMode is 'video' only during a live broadcast
      setIsLive(ctx.playbackMode === 'video' && !ctx.isPaused);
    });
  }, []);

  const openModal = () => {
    if (modalState !== 'closed') return;
    setModalState('opening');
    setTimeout(() => setModalState('open'), 20); // next frame to trigger CSS transition
  };

  const closeModal = () => {
    if (modalState === 'closed' || modalState === 'closing') return;
    setModalState('closing');
    closeTimerRef.current = setTimeout(() => setModalState('closed'), 200);
  };

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  useEffect(() => () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); }, []);

  const isVisible = modalState !== 'closed';
  const enterClass = modalState === 'opening' || modalState === 'open' ? '--enter' : '';
  const exitClass  = modalState === 'closing' ? '--exit' : '';

  const ba = profile.brandAssets;
  const overlayPos = (ba?.overlayPosition ?? 'left') as 'left' | 'right';
  const ctaStyle: React.CSSProperties = {
    ...(overlayPos === 'right' ? { left: 'unset', right: 16 } : {}),
    ...(!ba?.overlayBgImageUrl && ba?.overlayBgColor ? { background: ba.overlayBgColor } : {}),
    ...(ba?.overlayBgImageUrl ? { overflow: 'hidden' } : {}),
  };

  return (
    <>
      {/* ── CTA Widget ── */}
      <div className="cta-widget" style={ctaStyle} onClick={openModal} role="button" aria-label="Open Creator Companion">
        {/* Background image via <img> to bypass CSS background-image CSP restrictions */}
        {ba?.overlayBgImageUrl && (
          <img
            src={ba.overlayBgImageUrl}
            aria-hidden="true"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', zIndex: 0, pointerEvents: 'none',
            }}
            alt=""
          />
        )}
        {/* Live dot — only rendered during an actual live broadcast */}
        {isLive && <span className="cta-widget__live" aria-hidden="true" style={{ position: 'relative', zIndex: 1 }} />}

        {/* Avatar */}
        {profile?.avatarUrl ? (
          <img
            className="cta-widget__avatar"
            src={profile.avatarUrl}
            alt={profile.displayName}
            style={{ position: 'relative', zIndex: 1 }}
          />
        ) : (
          <div className="cta-widget__avatar-fallback" style={{ position: 'relative', zIndex: 1 }}>
            {profile?.displayName?.[0]?.toUpperCase() ?? '?'}
          </div>
        )}

        {/* Text */}
        <div className="cta-widget__text" style={{ position: 'relative', zIndex: 1 }}>
          <span className="cta-widget__name">{profile?.displayName ?? 'Creator Info'}</span>
          <span className="cta-widget__sub">Channel Resources</span>
        </div>

        {/* Chevron */}
        <svg className="cta-widget__chevron" style={{ position: 'relative', zIndex: 1 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      {/* ── Bio Modal ── */}
      {isVisible && (
        <div
          className={`modal-backdrop modal-backdrop${enterClass || exitClass}`}
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-label="Creator Info Panel"
        >
          <div
            className={`modal-card modal-card${enterClass || exitClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button className="modal-close" onClick={closeModal} aria-label="Close">✕</button>

            {/* Scrollable body */}
            <div className="modal-body">
              <BioCard profile={profile} auth={auth} referrer="OVERLAY" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
