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
  const { profile } = useCreatorProfile(auth?.channelId, auth?.token);

  // Always render something: real profile when loaded, otherwise demo
  const activeProfile = profile ?? DEMO_PROFILE;

  return (
    <div style={{ background: '#1a0a2e', minHeight: '100px', padding: '8px' }}>
      <div style={{ color: '#9147FF', fontSize: '11px', fontFamily: 'monospace', marginBottom: '4px' }}>
        iBioX v3 ✓ {auth ? `ch:${auth.channelId}` : 'no-auth'}
      </div>
      <div data-theme={theme}>
        <BioCard profile={activeProfile} auth={auth} referrer="PANEL" wrapClass="bio-panel" />
      </div>
    </div>
  );
}
