import type { ViewerInteractionPayload } from '@creator-bio-hub/types';
import { API_BASE } from '../config';

/**
 * Fire-and-forget interaction recorder.
 * Never throws — a failed interaction record must never block the viewer UX.
 *
 * Usage:
 *   trackInteraction({ moduleId, profileId, interactionKind: 'MODULE_NAVIGATED', referrer }, token)
 */
export async function trackInteraction(
  payload: ViewerInteractionPayload,
  token: string
): Promise<void> {
  try {
    await fetch(`${API_BASE}/interactions`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      // keepalive ensures the request completes even if the page unloads
      keepalive: true,
    });
  } catch {
    // Intentionally swallowed — interaction tracking is best-effort
  }
}

/**
 * Convenience: record a MODULE_NAVIGATED interaction and open the URL.
 * Call this instead of window.open directly in module components.
 */
export function navigateFromModule(
  url: string,
  payload: Omit<ViewerInteractionPayload, 'interactionKind'>,
  token: string | undefined
): void {
  if (token) {
    trackInteraction({ ...payload, interactionKind: 'MODULE_NAVIGATED' }, token);
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Convenience: record a MODULE_ENGAGED interaction (e.g. perk code copy).
 */
export function engageModule(
  payload: Omit<ViewerInteractionPayload, 'interactionKind'>,
  token: string | undefined
): void {
  if (token) {
    trackInteraction({ ...payload, interactionKind: 'MODULE_ENGAGED' }, token);
  }
}
