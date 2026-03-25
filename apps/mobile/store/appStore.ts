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
  selectedGenres: string[];
  addResponse: (trackId: string, reaction: Reaction) => void;
  setRecognizedTracks: (ids: string[]) => void;
  setSpotifyOnboarding: (v: boolean) => void;
  setSelectedGenres: (genres: string[]) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  loadPersistedState: () => Promise<void>;

  // Daily roulette
  todayCard: (RouletteCard & { track?: Track }) | null;
  feedbackGiven: boolean;
  recommendPromptDismissedDate: string | null;
  setTodayCard: (card: (RouletteCard & { track?: Track }) | null) => void;
  setFeedbackGiven: (given: boolean) => void;
  setRecommendPromptDismissed: (date: string | null) => void;
}

const STORAGE_KEY = 'taste-roulette-state';

// Centralized persist — always writes full snapshot from current store state.
// Avoids read-modify-write race conditions between concurrent setters.
function persistState(overrides: Record<string, any> = {}) {
  const s = useAppStore.getState();
  AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      onboardingCompleted: s.onboardingCompleted,
      onboardingResponses: s.onboardingResponses,
      selectedGenres: s.selectedGenres,
      recommendPromptDismissedDate: s.recommendPromptDismissedDate,
      ...overrides,
    })
  ).catch((e) => console.warn('persistState failed:', e));
}

export const useAppStore = create<AppState>((set, get) => ({
  session: null,
  isAuthReady: false,
  setSession: (session) => set({ session }),
  setAuthReady: (ready) => set({ isAuthReady: ready }),

  onboardingCompleted: false,
  onboardingResponses: [],
  recognizedTracks: [],
  spotifyOnboarding: false,
  selectedGenres: [],

  addResponse: (trackId, reaction) => {
    set((state) => ({
      onboardingResponses: [...state.onboardingResponses, { trackId, reaction }],
    }));
  },

  setRecognizedTracks: (ids) => set({ recognizedTracks: ids }),
  setSpotifyOnboarding: (v) => set({ spotifyOnboarding: v }),
  setSelectedGenres: (genres) => {
    set({ selectedGenres: genres });
    persistState({ selectedGenres: genres });
  },

  completeOnboarding: () => {
    set({ onboardingCompleted: true });
    persistState({ onboardingCompleted: true });
  },

  resetOnboarding: () => {
    set({ onboardingCompleted: false, onboardingResponses: [], recognizedTracks: [], spotifyOnboarding: false, selectedGenres: [] });
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
          selectedGenres: parsed.selectedGenres ?? [],
          recommendPromptDismissedDate: parsed.recommendPromptDismissedDate ?? null,
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
  recommendPromptDismissedDate: null,
  setTodayCard: (card) => set({ todayCard: card }),
  setFeedbackGiven: (given) => set({ feedbackGiven: given }),
  setRecommendPromptDismissed: (date) => {
    set({ recommendPromptDismissedDate: date });
    persistState({ recommendPromptDismissedDate: date });
  },
}));
