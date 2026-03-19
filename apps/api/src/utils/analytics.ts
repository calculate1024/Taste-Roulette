import { posthog } from '../index';

/** Track a server-side analytics event (non-blocking, best-effort). */
export function trackEvent(
  userId: string,
  event: string,
  properties?: Record<string, unknown>,
): void {
  try {
    posthog?.capture({ distinctId: userId, event, properties });
  } catch {
    // Analytics should never break the request
  }
}
