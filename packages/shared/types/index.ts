// Shared type definitions for Taste Roulette

export type Reaction = 'love' | 'okay' | 'not_for_me';
export type FeedbackReaction = 'surprised' | 'okay' | 'not_for_me';
export type CardStatus = 'pending' | 'delivered' | 'opened' | 'feedback_given';

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  tasteVector: number[];
  onboardingCompleted: boolean;
  streakCount: number;
  createdAt: string;
}

export interface OnboardingResponse {
  id: string;
  userId: string;
  trackId: string;
  reaction: Reaction;
  createdAt: string;
}

export interface RouletteCard {
  id: string;
  recipientId: string;
  recommenderId: string | null;
  trackId: string;
  reason: string | null;
  tasteDistance: number | null;
  status: CardStatus;
  deliveredAt: string | null;
  openedAt: string | null;
  createdAt: string;
  track?: Track;
}

export interface Feedback {
  id: string;
  cardId: string;
  userId: string;
  reaction: FeedbackReaction;
  comment: string | null;
  createdAt: string;
}

export interface UserRecommendation {
  id: string;
  userId: string;
  trackId: string;
  reason: string | null;
  used: boolean;
  createdAt: string;
}

export interface Track {
  spotifyId: string;
  title: string;
  artist: string;
  album: string | null;
  coverUrl: string | null;
  spotifyUrl: string | null;
  artistId: string | null;
  genres: string[];
  popularity: number | null;
  moodTags: string[];
  updatedAt: string;
}
