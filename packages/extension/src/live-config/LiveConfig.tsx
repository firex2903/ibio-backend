import { useState } from 'react';
import { useTwitchAuth } from '../hooks/useTwitchAuth';
import { useCreatorProfileFull } from '../hooks/useCreatorProfile';
import { API_BASE } from '../config';

export function LiveConfig() {
  const { auth } = useTwitchAuth();
  const { profile, refetch } = useCreatorProfileFull(auth?.channelId, auth?.token);
  const [busy, setBusy] = useState<string | null>(null); // moduleId being toggled

  const toggle = async (moduleId: string, currentVisible: boolean) => {
    if (!auth || busy) return;
    setBusy(moduleId);
    try {
      await fetch(`${API_BASE}/creator/${auth.channelId}/modules/${moduleId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ visible: !currentVisible }),
      });
      refetch();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="live-config">
      <h2>Companion Controls</h2>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: -8 }}>
        Show or hide modules in real time without leaving your stream.
      </p>

      {!profile?.modules.length ? (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16 }}>
          No modules configured yet. Set them up in the Config panel.
        </p>
      ) : (
        profile.modules.map((m) => (
          <div className="toggle-row" key={m.id}>
            <span className="toggle-row__label">{m.title || m.moduleKind}</span>
            <label className="toggle">
              <input
                type="checkbox"
                checked={m.visible}
                onChange={() => toggle(m.id, m.visible)}
                disabled={busy === m.id}
              />
              <span className="toggle-track" />
            </label>
          </div>
        ))
      )}

      {profile && (
        <p className="status">
          {profile.displayName} · {profile.plan}
        </p>
      )}
    </div>
  );
}
