import { useTwitchAuth } from '../hooks/useTwitchAuth';
import { useCreatorProfile } from '../hooks/useCreatorProfile';
import { BioCard } from '../shared/BioCard';
import type { CreatorProfileDTO } from '@creator-bio-hub/types';
import '../shared/biocard.css';
import './panel.css';

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
      config: {
        platform: 'instagram',
        url: 'https://www.instagram.com/firex.gg/',
        label: 'Sígueme en Instagram',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function Panel() {
  const { auth, theme } = useTwitchAuth();
  const { profile, loading, error } = useCreatorProfile(auth?.channelId, auth?.token);

  if (loading) {
    return (
      <div className="bio-panel" data-theme={theme}>
        <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="skeleton skeleton--avatar" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="skeleton skeleton--line" />
              <div className="skeleton skeleton--line-sm" />
            </div>
          </div>
          <div className="skeleton" style={{ height: '60px', width: '100%', borderRadius: '10px' }} />
          <div className="skeleton" style={{ height: '44px', width: '100%', borderRadius: '10px' }} />
          <div className="skeleton" style={{ height: '44px', width: '100%', borderRadius: '10px' }} />
        </div>
      </div>
    );
  }

  // No auth or backend error → show demo profile
  const activeProfile = profile ?? ((!auth || error) ? DEMO_PROFILE : null);

  if (!activeProfile) {
    return (
      <div className="bio-panel" data-theme={theme}>
        <div className="bio-empty">
          <div className="bio-empty__icon">⚠️</div>
          <div className="bio-empty__title">Could not load profile</div>
          <div className="bio-empty__sub">Check your extension configuration.</div>
        </div>
      </div>
    );
  }

  return (
    <div data-theme={theme}>
      <BioCard profile={activeProfile} auth={auth} referrer="PANEL" wrapClass="bio-panel" />
    </div>
  );
}
