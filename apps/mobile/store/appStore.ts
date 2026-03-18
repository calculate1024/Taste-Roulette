import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RouletteCard, Track } from '../../../packages/shared/types';

type Reaction = 'love' | 'okay' | 'not_for_me';

interface OnboardingResponse {
  trackId: string;
  reaction: Reaction;
}

interface AppState {
  // Auth
  session: Session | null;
  isAuthReady: boolean;
  setSession: (session: Session | null) => void;
  setAuthReady: (ready: boolean) => void;

  // Onboarding
  onboardingCompleted: boolean;
  onboardingResponses: OnboardingResponse[];
  recognizedTracks: string[];
  spotifyOnboarding: boolean;
  addResponse: (trackId: string, reaction: Reaction) => void;
  setRecognizedTracks: (ids: string[]) => void;
  setSpotifyOnboarding: (v: boolean) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  loadPersistedState: () => Promise<void>;

  // Daily roulette
  todayCard: (RouletteCard & { track?: Track }) | null;
  feedbackGiven: boolean;
  setTodayCard: (card: (RouletteCard & { track?: Track }) | null) => void;
  setFeedbackGiven: (given: boolean) => void;
}

const STORAGE_KEY = 'taste-roulette-state';

export const useAppStore = create<AppState>((set, get) => ({
  session: null,
  isAuthReady: false,
  setSession: (session) => set({ session }),
  setAuthReady: (ready) => set({ isAuthReady: ready }),

  onboardingCompleted: false,
  onboardingResponses: [],
  recognizedTracks: [],
  spotifyOnboarding: false,

  addResponse: (trackId, reaction) => {
    set((state) => ({
      onboardingResponses: [...state.onboardingResponses, { trackId, reaction }],
    }));
  },

  setRecognizedTracks: (ids) => set({ recognizedTracks: ids }),
  setSpotifyOnboarding: (v) => set({ spotifyOnboarding: v }),

  completeOnboarding: () => {
    set({ onboardingCompleted: true });
    const state = get();
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        onboardingCompleted: true,
        onboardingResponses: state.onboardingResponses,
      })
    );
  },

  resetOnboarding: () => {
    set({ onboardingCompleted: false, onboardingResponses: [], recognizedTracks: [], spotifyOnboarding: false });
    AsyncStorage.removeItem(STORAGE_KEY);
  },

  loadPersistedState: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          onboardingCompleted: parsed.onboardingCompleted ?? false,
          onboardingResponses: parsed.onboardingResponses ?? [],
        });
      }
    } catch (e) {
      console.warn('Failed to load persisted state, resetting:', e);
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  },

  // Daily roulette
  todayCard: null,
  feedbackGiven: false,
  setTodayCard: (card) => set({ todayCard: card }),
  setFeedbackGiven: (given) => set({ feedbackGiven: given }),
}));
