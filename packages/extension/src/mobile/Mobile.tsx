import { useTwitchAuth } from '../hooks/useTwitchAuth';
import { useCreatorProfile } from '../hooks/useCreatorProfile';
import { BioCard } from '../shared/BioCard';
import '../shared/biocard.css';
import './mobile.css';

export function Mobile() {
  const { auth } = useTwitchAuth();
  const { profile, loading } = useCreatorProfile(auth?.channelId, auth?.token);

  if (loading) {
    return (
      <div className="bio-mobile">
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="skeleton skeleton--avatar" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="skeleton skeleton--line" />
              <div className="skeleton skeleton--line-sm" />
            </div>
          </div>
          <div className="skeleton" style={{ height: '52px', width: '100%', borderRadius: '10px' }} />
          <div className="skeleton" style={{ height: '52px', width: '100%', borderRadius: '10px' }} />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return <BioCard profile={profile} auth={auth} referrer="MOBILE" wrapClass="bio-mobile" />;
}
