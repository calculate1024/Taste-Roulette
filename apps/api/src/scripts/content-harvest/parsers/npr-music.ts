// NPR Music parser — classical/jazz/world/latin + broad coverage
// Targets two rich series: "New Music Friday" and "Tiny Desk Concerts"
//
// New Music Friday structure:
//   <strong>Genre</strong> then "Artist, <em>Album</em> (Label)" repeated
// Tiny Desk structure:
//   "Artist: Tiny Desk Concert" — search artist name on Spotify

import * as cheerio from 'cheerio';
import type { SourceConfig, ArticleLink, ScrapedTrack, SourceParser } from '../types';

const config: SourceConfig = {
  name: 'npr-music',
  baseUrl: 'https://www.npr.org',
  listUrl: 'https://www.npr.org/sections/allsongs/606254804/new-music-friday',
  dominantGenres: ['jazz', 'classical', 'world', 'latin', 'folk'],
  curatorEmail: 'harvest-npr@taste-roulette.local',
  curatorDisplayName: 'NPR Music Editors',
};

// NPR genre headers → our genre mapping
const NPR_GENRE_MAP: Record<string, string> = {
  'rock/alt/indie': 'indie',
  'rock': 'rock',
  'alt': 'indie',
  'indie': 'indie',
  'classical': 'classical',
  'country/folk/americana': 'folk',
  'country': 'country',
  'folk': 'folk',
  'americana': 'folk',
  'electronic/out there': 'electronic',
  'electronic': 'electronic',
  'global': 'world',
  'jazz': 'jazz',
  'pop': 'pop',
  'r&b/soul': 'r&b',
  'r&b': 'r&b',
  'soul': 'soul',
  'rap/hip-hop': 'hip-hop',
  'rap': 'hip-hop',
  'hip-hop': 'hip-hop',
  'latin': 'latin',
  'metal': 'metal',
};

function getArticleLinks(html: string): ArticleLink[] {
  const $ = cheerio.load(html);
  const links: ArticleLink[] = [];
  const seen = new Set<string>();

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const title = $(el).text().trim();
    if (!title || title.length < 10 || title.length > 200) return;

    // NPR article pattern: /YYYY/MM/DD/id/slug or /YYYY/MM/DD/...
    if (!href.match(/npr\.org\/20\d{2}\/\d{2}\/\d{2}\//)) return;

    // Prioritize music-related articles
    const isMusic = href.includes('new-music-friday') ||
      href.includes('tiny-desk') ||
      href.includes('music') ||
      href.includes('song') ||
      href.includes('album') ||
      title.toLowerCase().includes('music') ||
      title.toLowerCase().includes('album');
    if (!isMusic) return;

    const fullUrl = href.startsWith('http') ? href : `https://www.npr.org${href}`;
    if (seen.has(fullUrl)) return;
    seen.add(fullUrl);
    links.push({ url: fullUrl, title });
  });

  return links;
}

function extractTracks(html: string, articleUrl: string): ScrapedTrack[] {
  const $ = cheerio.load(html);
  const tracks: ScrapedTrack[] = [];
  const seen = new Set<string>();

  // 1. Spotify track embeds
  $('iframe[src*="open.spotify.com/embed/track/"]').each((_, el) => {
    const src = $(el).attr('src') ?? '';
    const match = src.match(/track\/([a-zA-Z0-9]+)/);
    if (match && !seen.has(match[1])) {
      seen.add(match[1]);
      tracks.push({ artist: '', title: '', spotifyEmbedId: match[1], sourceUrl: articleUrl, sourceGenreHint: 'jazz' });
    }
  });

  // 2. New Music Friday format: "🎵 Artist, <em>Album</em>" or "⚡ Artist, <em>Album</em>"
  // Each <em> contains the album/track title, preceded by "Artist," text
  let currentGenre = 'jazz';
  const storytext = $('#storytext, .storytext').first();

  // Track current genre from <strong> headers
  storytext.find('strong, em').each((_, el) => {
    const tagName = ($(el).prop('tagName') ?? '').toLowerCase();

    // Update genre when we hit a <strong> genre header
    if (tagName === 'strong') {
      const genreText = $(el).text().trim().toLowerCase();
      const mapped = NPR_GENRE_MAP[genreText];
      if (mapped) currentGenre = mapped;
      return;
    }

    // Process <em> elements as album/track titles
    if (tagName === 'em') {
      const albumTitle = $(el).text().trim();
      if (albumTitle.length < 2 || albumTitle.length > 80) return;
      // Skip non-album em text (credits, podcast mentions)
      if (albumTitle.startsWith('—') || albumTitle.includes('NPR') ||
          albumTitle.includes('Spotify') || albumTitle.includes('Apple') ||
          albumTitle.includes('podcast')) return;

      // Get preceding text to find artist name
      // Pattern: "🎵 Artist," or "⚡ Artist," before the <em>
      const parent = $(el).parent();
      const parentHtml = parent.html() ?? '';
      const emHtml = $.html(el);
      const emIdx = parentHtml.indexOf(emHtml);
      if (emIdx < 0) return;

      const beforeEm = parentHtml.slice(0, emIdx)
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&apos;/g, "'")
        .trim();

      // Extract artist: last segment after emoji, before comma
      const artistMatch = beforeEm.match(/(?:[🎵⚡]\s*)?([A-Z][^,🎵⚡]{1,60}),\s*$/);
      if (!artistMatch) return;

      const artist = artistMatch[1].trim();
      if (artist.length < 2 || artist.length > 60) return;

      const key = `${artist}-${albumTitle}`;
      if (!seen.has(key)) {
        seen.add(key);
        tracks.push({
          artist,
          title: albumTitle,
          sourceUrl: articleUrl,
          sourceGenreHint: currentGenre,
        });
      }
    }
  });

  // 3. Tiny Desk format: "Artist: Tiny Desk Concert"
  const h1 = $('h1').first().text().trim();
  if (h1.toLowerCase().includes('tiny desk') && tracks.length === 0) {
    const artist = h1.replace(/:\s*Tiny Desk Concert.*/i, '').trim();
    if (artist.length > 1 && artist.length < 60) {
      tracks.push({
        artist,
        title: artist, // Search by artist name
        sourceUrl: articleUrl,
        sourceGenreHint: 'jazz',
      });
    }
  }

  return tracks;
}

function getPageUrl(page: number): string | null {
  // NPR doesn't use standard pagination on these series pages
  return null;
}

export const nprMusicParser: SourceParser = {
  name: 'npr-music',
  config,
  getArticleLinks,
  extractTracks,
  getPageUrl,
};
