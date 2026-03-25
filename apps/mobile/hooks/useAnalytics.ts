import { useCallback } from 'react';
import { usePostHog } from 'posthog-react-native';

// Centralized event names for type safety and consistency
export const Events = {
  // Auth
  LOGIN_SUCCESS: 'login_success',
  SIGNUP_SUCCESS: 'signup_success',
  SIGN_OUT: 'sign_out',

  // Onboarding
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_SWIPED: 'onboarding_swiped',
  ONBOARDING_EARLY_EXIT_SHOWN: 'onboarding_early_exit_shown',
  ONBOARDING_EARLY_EXIT_CONFIRMED: 'onboarding_early_exit_confirmed',
  ONBOARDING_EARLY_EXIT_DECLINED: 'onboarding_early_exit_declined',
  ONBOARDING_COMPLETED: 'onboarding_completed',

  // Daily card
  CARD_VIEWED: 'card_viewed',
  CARD_OPENED: 'card_opened',
  CARD_FEEDBACK_SUBMITTED: 'card_feedback_submitted',
  CARD_SHARE_PRESSED: 'card_share_pressed',
  CARD_SHARED: 'card_shared',
  CARD_BOOKMARKED: 'card_bookmarked',

  // Recommend back
  RECOMMEND_BACK_PRESSED: 'recommend_back_pressed',
  RECOMMEND_BACK_SKIPPED: 'recommend_back_skipped',
  RECOMMEND_SEARCH: 'recommend_search',
  RECOMMEND_TRACK_SELECTED: 'recommend_track_selected',
  RECOMMEND_SUBMITTED: 'recommend_submitted',

  // Profile
  PROFILE_VIEWED: 'profile_viewed',
  SPOTIFY_CONNECT_PRESSED: 'spotify_connect_pressed',
  SPOTIFY_DISCONNECTED: 'spotify_disconnected',
  ONBOARDING_RESET: 'onboarding_reset',
} as const;

/**
 * Thin wrapper around PostHog for event tracking.
 * Falls back gracefully if PostHog is not configured.
 */
export function useAnalytics() {
  let posthog: ReturnType<typeof usePostHog> | null = null;
  try {
    posthog = usePostHog();
  } catch {
    // PostHog provider not available (API key missing)
  }

  const track = useCallback(
    (event: string, properties?: Record<string, any>) => {
      posthog?.capture(event, properties);
    },
    [posthog],
  );

  const identify = useCallback(
    (userId: string, traits?: Record<string, any>) => {
      posthog?.identify(userId, traits);
    },
    [posthog],
  );

  return { track, identify };
}
