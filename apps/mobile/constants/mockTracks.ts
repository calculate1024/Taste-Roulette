// Onboarding tracks — IDs match Spotify track IDs in the tracks table
// 10 tracks covering diverse genres for taste profiling
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
    id: '0VjIjW4GlUZAMYd2vXMi3b',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36',
    genres: ['pop', 'r&b'],
    spotifyUrl: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
  },
  {
    id: '1YQWosTIljIvxAgHWTp7KP',
    title: 'Take Five',
    artist: 'The Dave Brubeck Quartet',
    album: 'Time Out',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b273b6bd44cf06bf8f4d5ce1e080',
    genres: ['jazz'],
    spotifyUrl: 'https://open.spotify.com/track/1YQWosTIljIvxAgHWTp7KP',
  },
  {
    id: '6c9EGVj5CaOeoKd9ecMW1U',
    title: 'Strobe',
    artist: 'deadmau5',
    album: 'For Lack of a Better Name',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b273ac4c76801e5286f371b5f4b1',
    genres: ['electronic'],
    spotifyUrl: 'https://open.spotify.com/track/6c9EGVj5CaOeoKd9ecMW1U',
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
  {
    id: '6habFhsOp2NvshLv26DqMb',
    title: 'Despacito',
    artist: 'Luis Fonsi',
    album: 'Vida',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b273ef0d4234e1a645740f77d59c',
    genres: ['latin'],
    spotifyUrl: 'https://open.spotify.com/track/6habFhsOp2NvshLv26DqMb',
  },
  {
    id: '1h2xVEoJORqrg71HocgqXd',
    title: 'Superstition',
    artist: 'Stevie Wonder',
    album: 'Talking Book',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b2739e447b59bd3e2cbefaa31d91',
    genres: ['soul', 'funk'],
    spotifyUrl: 'https://open.spotify.com/track/1h2xVEoJORqrg71HocgqXd',
  },
  {
    id: '2MuWTIM3b0YEAskbeeFE1i',
    title: 'Master of Puppets',
    artist: 'Metallica',
    album: 'Master of Puppets',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b273668e3aca3167e6e569a9aa20',
    genres: ['metal'],
    spotifyUrl: 'https://open.spotify.com/track/2MuWTIM3b0YEAskbeeFE1i',
  },
  {
    id: '6Er8Fz6fuZNi5cvwQjv1ya',
    title: 'Clair de Lune',
    artist: 'Debussy',
    album: 'Suite bergamasque',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b273c21a36e9f0e28c8c60eb502a',
    genres: ['classical'],
    spotifyUrl: 'https://open.spotify.com/track/6Er8Fz6fuZNi5cvwQjv1ya',
  },
  {
    id: '3PQLYVskjUeRmRIfECsL0X',
    title: 'No Woman No Cry',
    artist: 'Bob Marley & The Wailers',
    album: 'Legend',
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b273b5a0ee94e2741374ce5c71a2',
    genres: ['reggae'],
    spotifyUrl: 'https://open.spotify.com/track/3PQLYVskjUeRmRIfECsL0X',
  },
];
