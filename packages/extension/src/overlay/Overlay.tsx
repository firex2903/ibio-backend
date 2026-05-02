import { useState, useEffect, useRef } from 'react';
import { useTwitchAuth } from '../hooks/useTwitchAuth';
import { useCreatorProfile } from '../hooks/useCreatorProfile';
import { BioCard } from '../shared/BioCard';
import '../shared/biocard.css';

type ModalState = 'closed' | 'opening' | 'open' | 'closing';

export function Overlay() {
  const { auth } = useTwitchAuth();
  const { profile } = useCreatorProfile(auth?.channelId, auth?.token);
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

  return (
    <>
      {/* ── CTA Widget ── */}
      <div className="cta-widget" onClick={openModal} role="button" aria-label="Open Creator Companion">
        {/* Live dot — only rendered during an actual live broadcast */}
        {isLive && <span className="cta-widget__live" aria-hidden="true" />}

        {/* Avatar */}
        {profile?.avatarUrl ? (
          <img
            className="cta-widget__avatar"
            src={profile.avatarUrl}
            alt={profile.displayName}
          />
        ) : (
          <div className="cta-widget__avatar-fallback">
            {profile?.displayName?.[0]?.toUpperCase() ?? '?'}
          </div>
        )}

        {/* Text */}
        <div className="cta-widget__text">
          <span className="cta-widget__name">{profile?.displayName ?? 'Creator Info'}</span>
          <span className="cta-widget__sub">Channel Resources</span>
        </div>

        {/* Chevron */}
        <svg className="cta-widget__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
              {profile ? (
                <BioCard profile={profile} auth={auth} referrer="OVERLAY" />
              ) : (
                <div className="bio-empty" style={{ padding: '60px 20px' }}>
                  <div className="bio-empty__icon">🎮</div>
                  <div className="bio-empty__title">Loading profile...</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
