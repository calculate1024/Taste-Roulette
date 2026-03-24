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
    // Persist selectedGenres alongside other persisted fields
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      const parsed = raw ? JSON.parse(raw) : {};
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, selectedGenres: genres }));
    }).catch(() => {});
  },

  completeOnboarding: () => {
    set({ onboardingCompleted: true });
    const state = get();
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        onboardingCompleted: true,
        onboardingResponses: state.onboardingResponses,
        selectedGenres: state.selectedGenres,
        recommendPromptDismissedDate: state.recommendPromptDismissedDate,
      })
    );
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
    // Persist to AsyncStorage so it survives app restart
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      const parsed = raw ? JSON.parse(raw) : {};
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, recommendPromptDismissedDate: date }));
    }).catch(() => {});
  },
}));
