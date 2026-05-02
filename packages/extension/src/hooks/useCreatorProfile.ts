import { useState, useEffect } from 'react';
import type { CreatorProfileDTO } from '@creator-bio-hub/types';
import { API_BASE } from '../config';

interface UseCreatorProfileResult {
  profile: CreatorProfileDTO | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches the CreatorProfileDTO for a given channelId.
 * Viewer-facing — returns visible modules only.
 * Re-fetches when channelId or token changes.
 */
export function useCreatorProfile(
  channelId: string | undefined,
  token: string | undefined
): UseCreatorProfileResult {
  const [profile, setProfile] = useState<CreatorProfileDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [tick,    setTick]    = useState(0);

  useEffect(() => {
    if (!channelId || !token) { setLoading(false); return; }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    fetch(`${API_BASE}/creator/${channelId}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        return res.json() as Promise<{ profile: CreatorProfileDTO }>;
      })
      .then(({ profile }) => {
        if (!cancelled) setProfile(profile);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; controller.abort(); };
  }, [channelId, token, tick]);

  return {
    profile,
    loading,
    error,
    refetch: () => setTick((t) => t + 1),
  };
}

/**
 * Fetches the full profile including hidden modules.
 * Broadcaster-facing — used in Companion Setup.
 */
export function useCreatorProfileFull(
  channelId: string | undefined,
  token: string | undefined
): UseCreatorProfileResult {
  const [profile, setProfile] = useState<CreatorProfileDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [tick,    setTick]    = useState(0);

  useEffect(() => {
    if (!channelId || !token) { setLoading(false); return; }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    fetch(`${API_BASE}/creator/${channelId}/profile/full`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        return res.json() as Promise<{ profile: CreatorProfileDTO }>;
      })
      .then(({ profile }) => {
        if (!cancelled) setProfile(profile);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; controller.abort(); };
  }, [channelId, token, tick]);

  return {
    profile,
    loading,
    error,
    refetch: () => setTick((t) => t + 1),
  };
}
