// Onboarding tracks — 20 globally recognizable songs across all genres
// Criteria: high recognition rate (Billboard/viral level), diverse genres,
// each track should be identifiable by most 18-35 year olds worldwide.
// IDs match Spotify track IDs.

export interface OnboardingTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  genres: string[];
  spotifyUrl: string;
}

export const ONBOARDING_TRACKS: OnboardingTrack[] = [
  // ── Pop ──
  {
    id: '3AJwUDP919kvQ9QcozQPxg',
    title: 'Bad Guy',
    artist: 'Billie Eilish',
    album: 'WHEN WE ALL FALL ASLEEP, WHERE DO WE GO?',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b27350a3147b4edd7701a876c6ce',
    genres: ['pop'],
    spotifyUrl: 'https://open.spotify.com/track/3AJwUDP919kvQ9QcozQPxg',
  },
  {
    id: '0VjIjW4GlUZAMYd2vXMi3b',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36',
    genres: ['pop', 'r&b'],
    spotifyUrl: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
  },

  // ── Rock ──
  {
    id: '4u7EnebtmKWzUH433cf5Qv',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    album: 'A Night at the Opera',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b273e319baafd16e84f0408af2a0',
    genres: ['rock'],
    spotifyUrl: 'https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv',
  },
  {
    id: '5ghIJDpPoe3CfHMGu71E6T',
    title: 'Smells Like Teen Spirit',
    artist: 'Nirvana',
    album: 'Nevermind',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b2739b9b36b0e22870b9f542d937',
    genres: ['rock', 'punk'],
    spotifyUrl: 'https://open.spotify.com/track/5ghIJDpPoe3CfHMGu71E6T',
  },

  // ── Hip-hop ──
  {
    id: '7KXjTSCq5nL1LoYtL7XAwS',
    title: 'HUMBLE.',
    artist: 'Kendrick Lamar',
    album: 'DAMN.',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b2738b52c6b9bc4e43d873c1e72e',
    genres: ['hip-hop'],
    spotifyUrl: 'https://open.spotify.com/track/7KXjTSCq5nL1LoYtL7XAwS',
  },
  {
    id: '5Z01UMMf7V1o0MzF86s6WJ',
    title: 'Lose Yourself',
    artist: 'Eminem',
    album: '8 Mile',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b273eab40fc794b88b9d1e012578',
    genres: ['hip-hop'],
    spotifyUrl: 'https://open.spotify.com/track/5Z01UMMf7V1o0MzF86s6WJ',
  },

  // ── R&B / Soul ──
  {
    id: '3ee8Jmje8o58CHK66QFRcv',
    title: 'All of Me',
    artist: 'John Legend',
    album: 'Love in the Future',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b2731d5cf960655990e4dbb1f438',
    genres: ['r&b', 'soul'],
    spotifyUrl: 'https://open.spotify.com/track/3ee8Jmje8o58CHK66QFRcv',
  },

  // ── Electronic ──
  {
    id: '2zYzyRzz6pRmhPzyfMEC8s',
    title: 'Get Lucky',
    artist: 'Daft Punk',
    album: 'Random Access Memories',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b2739b9b36b0e22870b9f542d937',
    genres: ['electronic', 'pop'],
    spotifyUrl: 'https://open.spotify.com/track/2zYzyRzz6pRmhPzyfMEC8s',
  },

  // ── Latin ──
  {
    id: '6habFhsOp2NvshLv26DqMb',
    title: 'Despacito',
    artist: 'Luis Fonsi',
    album: 'Vida',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b273ef0d4234e1a645740f77d59c',
    genres: ['latin'],
    spotifyUrl: 'https://open.spotify.com/track/6habFhsOp2NvshLv26DqMb',
  },

  // ── Jazz ──
  {
    id: '0q6LuUqGLUiCPP1cbdwFs3',
    title: 'Fly Me to the Moon',
    artist: 'Frank Sinatra',
    album: 'It Might as Well Be Swing',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b2734e8d7d5ae0c4a4af6ca2e0e2',
    genres: ['jazz'],
    spotifyUrl: 'https://open.spotify.com/track/0q6LuUqGLUiCPP1cbdwFs3',
  },

  // ── Classical ──
  {
    id: '5NGtFXVpXSvwunEIGeUKY6',
    title: 'River Flows in You',
    artist: 'Yiruma',
    album: 'First Love',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b273612047e498390751fc00a347',
    genres: ['classical'],
    spotifyUrl: 'https://open.spotify.com/track/5NGtFXVpXSvwunEIGeUKY6',
  },

  // ── Country ──
  {
    id: '1YYhDizHx7PnDhAhko6cFS',
    title: 'Take Me Home, Country Roads',
    artist: 'John Denver',
    album: 'Poems, Prayers & Promises',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b273d8f31c72a89a9b98c89a0d73',
    genres: ['country', 'folk'],
    spotifyUrl: 'https://open.spotify.com/track/1YYhDizHx7PnDhAhko6cFS',
  },

  // ── Indie ──
  {
    id: '5UWwZ5lm5PKu6eKsHAGxOk',
    title: 'The Less I Know the Better',
    artist: 'Tame Impala',
    album: 'Currents',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b2739e1cfc756886ac782e363d79',
    genres: ['indie', 'rock'],
    spotifyUrl: 'https://open.spotify.com/track/5UWwZ5lm5PKu6eKsHAGxOk',
  },

  // ── Metal ──
  {
    id: '0snQkGI5qnAmohLE7jTsTn',
    title: 'Enter Sandman',
    artist: 'Metallica',
    album: 'Metallica',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b273668e3aca3167e6e569a9aa20',
    genres: ['metal', 'rock'],
    spotifyUrl: 'https://open.spotify.com/track/0snQkGI5qnAmohLE7jTsTn',
  },

  // ── Reggae ──
  {
    id: '3PQLYVskjUeRmRIfECsL0X',
    title: 'No Woman No Cry',
    artist: 'Bob Marley & The Wailers',
    album: 'Legend',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b273b5a0ee94e2741374ce5c71a2',
    genres: ['reggae'],
    spotifyUrl: 'https://open.spotify.com/track/3PQLYVskjUeRmRIfECsL0X',
  },

  // ── K-pop ──
  {
    id: '5QDLhrAOJJdNAmCTJ8xMyW',
    title: 'Dynamite',
    artist: 'BTS',
    album: 'Dynamite',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b273a98e8e3a5e90cfde080e7b82',
    genres: ['k-pop', 'pop'],
    spotifyUrl: 'https://open.spotify.com/track/5QDLhrAOJJdNAmCTJ8xMyW',
  },

  // ── Blues ──
  {
    id: '6nOlSBXZVMpREPSyOpeBae',
    title: 'The Thrill Is Gone',
    artist: 'B.B. King',
    album: 'Completely Well',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b273c0c02db6a28dfe34cd5a81b7',
    genres: ['blues'],
    spotifyUrl: 'https://open.spotify.com/track/6nOlSBXZVMpREPSyOpeBae',
  },

  // ── Folk ──
  {
    id: '1mCsF9Tw4AkIZOjvZbZZdT',
    title: 'Skinny Love',
    artist: 'Bon Iver',
    album: 'For Emma, Forever Ago',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b273d5af602b12744aaeb56e4e2e',
    genres: ['folk', 'indie'],
    spotifyUrl: 'https://open.spotify.com/track/1mCsF9Tw4AkIZOjvZbZZdT',
  },

  // ── World / Afrobeats ──
  {
    id: '1zi7xx7UVEFkmKfv06H8x0',
    title: 'Last Last',
    artist: 'Burna Boy',
    album: 'Love, Damini',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b2732c4ae3c25be30eb42d05f6f0',
    genres: ['world', 'pop'],
    spotifyUrl: 'https://open.spotify.com/track/1zi7xx7UVEFkmKfv06H8x0',
  },

  // ── Ambient / Chill ──
  {
    id: '6vuykQgDLUCiZ7YggIpLM9',
    title: 'Weightless',
    artist: 'Marconi Union',
    album: 'Weightless',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b273b9e22e87ef75c2e0baade2c7',
    genres: ['ambient'],
    spotifyUrl: 'https://open.spotify.com/track/6vuykQgDLUCiZ7YggIpLM9',
  },
];
