import { supabase } from './supabase';
import type { RouletteCard, Track, FeedbackReaction, TasteJourneyData, TasteTwinsData } from '../../../packages/shared/types';

// Mock data for development without Supabase
const MOCK_CARD: RouletteCard & { track: Track } = {
  id: 'mock-card-1',
  recipientId: 'mock-user',
  recommenderId: 'mock-recommender',
  trackId: '4u7EnebtmKWzUH433cf5Qv',
  reason: '這首歌的吉他 solo 會讓你重新愛上搖滾',
  tasteDistance: 0.63,
  status: 'delivered',
  deliveredAt: new Date().toISOString(),
  openedAt: null,
  createdAt: new Date().toISOString(),
  track: {
    spotifyId: '4u7EnebtmKWzUH433cf5Qv',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    album: 'A Night at the Opera',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b273e319baafd16e84f0408af2a0',
    spotifyUrl: 'https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv',
    artistId: null,
    genres: ['rock'],
    popularity: 90,
    moodTags: ['epic', 'dramatic'],
    updatedAt: new Date().toISOString(),
  },
};

const MOCK_SEARCH_RESULTS: Track[] = [
  {
    spotifyId: '0VjIjW4GlUZAMYd2vXMi3b',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36',
    spotifyUrl: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
    artistId: null,
    genres: ['pop', 'r&b'],
    popularity: 95,
    moodTags: [],
    updatedAt: new Date().toISOString(),
  },
  {
    spotifyId: '1YQWosTIljIvxAgHWTp7KP',
    title: 'Take Five',
    artist: 'The Dave Brubeck Quartet',
    album: 'Time Out',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b273b6bd44cf06bf8f4d5ce1e080',
    spotifyUrl: 'https://open.spotify.com/track/1YQWosTIljIvxAgHWTp7KP',
    artistId: null,
    genres: ['jazz'],
    popularity: 75,
    moodTags: [],
    updatedAt: new Date().toISOString(),
  },
  {
    spotifyId: '6c9EGVj5CaOeoKd9ecMW1U',
    title: 'Strobe',
    artist: 'deadmau5',
    album: 'For Lack of a Better Name',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b273ac4c76801e5286f371b5f4b1',
    spotifyUrl: 'https://open.spotify.com/track/6c9EGVj5CaOeoKd9ecMW1U',
    artistId: null,
    genres: ['electronic'],
    popularity: 80,
    moodTags: [],
    updatedAt: new Date().toISOString(),
  },
];

// Check if Supabase is configured
const isSupabaseConfigured = (): boolean => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  return !!url && url.length > 0;
};

/**
 * Get today's roulette card for the user.
 * Falls back to mock data if Supabase is not configured.
 */
export async function getTodayCard(
  userId: string
): Promise<(RouletteCard & { track?: Track }) | null> {
  if (!isSupabaseConfigured()) {
    // Return mock data for development
    return { ...MOCK_CARD, recipientId: userId };
  }

  const { data: cardData, error: cardError } = await supabase
    .from('roulette_cards')
    .select('*')
    .eq('recipient_id', userId)
    .in('status', ['pending', 'delivered', 'opened', 'feedback_given'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (cardError || !cardData) return null;

  // Fetch track metadata separately (no FK relationship for join)
  let track: Track | undefined;
  const { data: trackData } = await supabase
    .from('tracks')
    .select('*')
    .eq('spotify_id', cardData.track_id)
    .single();

  if (trackData) {
    track = {
      spotifyId: trackData.spotify_id,
      title: trackData.title,
      artist: trackData.artist,
      album: trackData.album,
      coverUrl: trackData.cover_url,
      spotifyUrl: trackData.spotify_url,
      artistId: trackData.artist_id,
      genres: trackData.genres ?? [],
      popularity: trackData.popularity,
      moodTags: trackData.mood_tags ?? [],
      updatedAt: trackData.updated_at,
    };
  }

  return {
    id: cardData.id,
    recipientId: cardData.recipient_id,
    recommenderId: cardData.recommender_id,
    trackId: cardData.track_id,
    reason: cardData.reason,
    tasteDistance: cardData.taste_distance,
    status: cardData.status,
    deliveredAt: cardData.delivered_at,
    openedAt: cardData.opened_at,
    createdAt: cardData.created_at,
    track,
  };
}

/**
 * Mark a card as opened.
 */
export async function openCard(cardId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  await supabase
    .from('roulette_cards')
    .update({ status: 'opened', opened_at: new Date().toISOString() })
    .eq('id', cardId);
}

/**
 * Submit feedback for a card.
 */
export async function submitFeedback(
  cardId: string,
  userId: string,
  reaction: FeedbackReaction,
  comment?: string
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  // Insert feedback and update card status in parallel
  const [feedbackResult, cardResult] = await Promise.all([
    supabase.from('feedbacks').insert({
      card_id: cardId,
      user_id: userId,
      reaction,
      comment: comment || null,
    }),
    supabase.from('roulette_cards').update({ status: 'feedback_given' }).eq('id', cardId),
  ]);
}

/**
 * Search tracks via Spotify metadata in our tracks table.
 * Falls back to mock data if Supabase is not configured.
 */
export async function searchTracks(query: string): Promise<Track[]> {
  if (!isSupabaseConfigured()) {
    // Filter mock data by query
    const q = query.toLowerCase();
    return MOCK_SEARCH_RESULTS.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q)
    );
  }

  // Escape special PostgREST characters
  const sanitized = query.replace(/[%_\\]/g, '\\$&').replace(/,/g, '');

  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .or(`title.ilike.%${sanitized}%,artist.ilike.%${sanitized}%`)
    .limit(20);

  if (error || !data) return [];

  return data.map((t: Record<string, unknown>) => ({
    spotifyId: t.spotify_id as string,
    title: t.title as string,
    artist: t.artist as string,
    album: (t.album as string) ?? null,
    coverUrl: (t.cover_url as string) ?? null,
    spotifyUrl: (t.spotify_url as string) ?? null,
    artistId: (t.artist_id as string) ?? null,
    genres: (t.genres as string[]) ?? [],
    popularity: (t.popularity as number) ?? null,
    moodTags: (t.mood_tags as string[]) ?? [],
    updatedAt: t.updated_at as string,
  }));
}

/**
 * Submit a recommendation from the user.
 */
export async function submitRecommendation(
  userId: string,
  trackId: string,
  reason: string
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  await supabase.from('user_recommendations').insert({
    user_id: userId,
    track_id: trackId,
    reason,
  });
}

/**
 * Get taste journey data for a user (radar chart + stats + badges).
 * Falls back to mock data if Supabase is not configured.
 */
export async function getTasteJourney(userId: string): Promise<TasteJourneyData> {
  if (!isSupabaseConfigured()) {
    // Mock taste vector: 20 dims with varied values for development
    return {
      tasteVector: [
        0.8, 0.3, 0.6, 0.7, 0.2, 0.1, 0.5,
        0.4, 0.1, 0.3, 0.2, 0.1, 0.4, 0.5,
        0.3, 0.2, 0.1, 0.4, 0.6, 0.3,
      ],
      stats: {
        totalCards: 12,
        surprisedCount: 4,
        streakCount: 5,
        genresExplored: 6,
        totalRecommendations: 3,
        maxTasteDistance: 0.72,
      },
    };
  }

  // Fetch all stats in parallel
  const [profileResult, totalCardsResult, surprisedResult, recsResult, maxDistResult, genresResult] = await Promise.all([
    supabase.from('profiles').select('taste_vector, streak_count').eq('id', userId).single(),
    supabase.from('roulette_cards').select('id', { count: 'exact', head: true }).eq('recipient_id', userId),
    supabase.from('feedbacks').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('reaction', 'surprised'),
    supabase.from('user_recommendations').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('roulette_cards').select('taste_distance').eq('recipient_id', userId).not('taste_distance', 'is', null).order('taste_distance', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('roulette_cards').select('tracks:track_id(genres)').eq('recipient_id', userId),
  ]);

  const profile = profileResult.data;
  const totalCards = totalCardsResult.count;
  const surprisedCount = surprisedResult.count;
  const totalRecommendations = recsResult.count;
  const maxDistCard = maxDistResult.data;
  const receivedTracks = genresResult.data;

  const genreSet = new Set<string>();
  if (receivedTracks) {
    for (const row of receivedTracks) {
      const track = row.tracks as unknown as { genres: string[] } | null;
      if (track?.genres) {
        for (const g of track.genres) {
          genreSet.add(g);
        }
      }
    }
  }

  return {
    tasteVector: profile?.taste_vector ?? [],
    stats: {
      totalCards: totalCards ?? 0,
      surprisedCount: surprisedCount ?? 0,
      streakCount: profile?.streak_count ?? 0,
      genresExplored: genreSet.size,
      totalRecommendations: totalRecommendations ?? 0,
      maxTasteDistance: maxDistCard?.taste_distance ?? 0,
    },
  };
}

/**
 * Get taste twins and complements for a user.
 * Falls back to mock data if Supabase is not configured.
 */
export async function getTasteTwins(userId: string): Promise<TasteTwinsData> {
  if (!isSupabaseConfigured()) {
    // Mock data for development
    return {
      twins: [
        {
          anonymousId: 'a1b2c3d4',
          tasteLabel: 'Pop \u611B\u597D\u8005',
          distance: 0.08,
          dominantGenres: ['pop', 'r&b', 'k-pop'],
        },
        {
          anonymousId: 'e5f6g7h8',
          tasteLabel: '\u96FB\u5B50\u63A7',
          distance: 0.15,
          dominantGenres: ['electronic', 'ambient', 'indie'],
        },
        {
          anonymousId: 'i9j0k1l2',
          tasteLabel: '\u6416\u6EFE\u9B42',
          distance: 0.22,
          dominantGenres: ['rock', 'indie', 'punk'],
        },
      ],
      complements: [
        {
          anonymousId: 'm3n4o5p6',
          tasteLabel: '\u7235\u58EB\u8FF7',
          distance: 0.58,
          dominantGenres: ['jazz', 'blues', 'soul'],
        },
        {
          anonymousId: 'q7r8s9t0',
          tasteLabel: '\u53E4\u5178\u6A02\u8FF7',
          distance: 0.62,
          dominantGenres: ['classical', 'ambient', 'world'],
        },
        {
          anonymousId: 'u1v2w3x4',
          tasteLabel: '\u62C9\u4E01\u7BC0\u594F',
          distance: 0.67,
          dominantGenres: ['latin', 'reggae', 'world'],
        },
      ],
    };
  }

  // Call the API endpoint via Supabase edge function or direct API
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    return { twins: [], complements: [] };
  }

  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
  const response = await fetch(`${apiUrl}/api/twins`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error('Failed to fetch taste twins:', response.status);
    return { twins: [], complements: [] };
  }

  return response.json();
}

/**
 * Profile stats shape returned by getProfile.
 */
export interface ProfileStats {
  totalCards: number;
  surprisedCount: number;
  streakCount: number;
}

/**
 * Get profile stats for a user.
 */
export async function getProfile(userId: string): Promise<ProfileStats> {
  if (!isSupabaseConfigured()) {
    return { totalCards: 7, surprisedCount: 3, streakCount: 5 };
  }

  // Total cards received
  const { count: totalCards } = await supabase
    .from('roulette_cards')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId);

  // Surprised reactions count
  const { count: surprisedCount } = await supabase
    .from('feedbacks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('reaction', 'surprised');

  // Streak from users table
  const { data: userData } = await supabase
    .from('profiles')
    .select('streak_count')
    .eq('id', userId)
    .single();

  return {
    totalCards: totalCards ?? 0,
    surprisedCount: surprisedCount ?? 0,
    streakCount: userData?.streak_count ?? 0,
  };
}
