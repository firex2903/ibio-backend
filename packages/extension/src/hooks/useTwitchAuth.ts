import { useState, useEffect } from 'react';

export interface TwitchAuth {
  token: string;
  userId: string;
  channelId: string;
  clientId: string;
}

export function useTwitchAuth() {
  const [auth, setAuth] = useState<TwitchAuth | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // ── Dev mock: Twitch.ext.onAuthorized never fires outside the iFrame ──
    if (import.meta.env.DEV) {
      const channelId = '60691070';
      fetch(`/api/v1/dev/token?channelId=${channelId}`)
        .then((r) => r.json())
        .then((d: { token: string; channelId: string }) => {
          setAuth({ token: d.token, userId: channelId, channelId, clientId: 'dev' });
        })
        .catch(() => {});
      return;
    }

    if (typeof Twitch === 'undefined') return;

    Twitch.ext.onAuthorized((a) => {
      // JWT uses base64url — must normalise to standard base64 before atob()
      const b64url = a.token.split('.')[1];
      const b64    = b64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(
        Math.ceil(b64url.length / 4) * 4, '='
      );
      const payload = JSON.parse(atob(b64)) as { channel_id: string };
      setAuth({
        token: a.token,
        userId: a.userId,
        channelId: payload.channel_id,
        clientId: a.clientId,
      });
    });

    Twitch.ext.onContext((ctx) => {
      if (ctx.theme) setTheme(ctx.theme);
    });
  }, []);

  return { auth, theme };
}
