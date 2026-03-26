// Indie Shuffle parser — indie/electronic/neo-soul
// Single-track focused recommendations

import * as cheerio from 'cheerio';
import type { SourceConfig, ArticleLink, ScrapedTrack, SourceParser } from '../types';

const config: SourceConfig = {
  name: 'indieshuffle',
  baseUrl: 'https://www.indieshuffle.com',
  listUrl: 'https://www.indieshuffle.com',
  dominantGenres: ['indie', 'electronic', 'soul', 'r&b'],
  curatorEmail: 'harvest-indieshuffle@taste-roulette.local',
  curatorDisplayName: 'Indie Shuffle Editors',
};

function getArticleLinks(html: string): ArticleLink[] {
  const $ = cheerio.load(html);
  const links: ArticleLink[] = [];
  const seen = new Set<string>();

  // Indie Shuffle links to individual song pages
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const title = $(el).text().trim();
    if (!title || title.length < 3) return;

    // Look for song/artist page patterns
    const fullUrl = href.startsWith('http') ? href : `https://www.indieshuffle.com${href}`;
    if (!fullUrl.includes('indieshuffle.com/')) return;
    if (fullUrl.includes('/tag/') || fullUrl.includes('/genre/') || fullUrl.includes('/page/')) return;
    // Article-like paths
    if (!fullUrl.match(/indieshuffle\.com\/[a-z]+-[a-z]+/) && !fullUrl.match(/\/song\//)) return;

    if (seen.has(fullUrl)) return;
    seen.add(fullUrl);
    links.push({ url: fullUrl, title });
  });

  return links;
}

function extractTracks(html: string, articleUrl: string): ScrapedTrack[] {
  const $ = cheerio.load(html);
  const tracks: ScrapedTrack[] = [];
  const seenIds = new Set<string>();

  // 1. Spotify embeds
  $('iframe[src*="open.spotify.com/embed/track/"]').each((_, el) => {
    const src = $(el).attr('src') ?? '';
    const match = src.match(/track\/([a-zA-Z0-9]+)/);
    if (match && !seenIds.has(match[1])) {
      seenIds.add(match[1]);
      tracks.push({ artist: '', title: '', spotifyEmbedId: match[1], sourceUrl: articleUrl, sourceGenreHint: 'indie' });
    }
  });

  // 2. Spotify links
  $('a[href*="open.spotify.com/track/"]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const match = href.match(/track\/([a-zA-Z0-9]+)/);
    if (match && !seenIds.has(match[1])) {
      seenIds.add(match[1]);
      tracks.push({ artist: '', title: '', spotifyEmbedId: match[1], sourceUrl: articleUrl, sourceGenreHint: 'indie' });
    }
  });

  // 3. Parse page title/heading for artist - track
  if (tracks.length === 0) {
    const h1 = $('h1').first().text().trim();
    if (h1) {
      const parsed = parseIndieTitle(h1);
      if (parsed) {
        tracks.push({ ...parsed, sourceUrl: articleUrl, sourceGenreHint: 'indie' });
      }
    }
  }

  return tracks;
}

function parseIndieTitle(text: string): { artist: string; title: string } | null {
  const separators = [' – ', ' — ', ' - '];
  for (const sep of separators) {
    const idx = text.indexOf(sep);
    if (idx > 0) {
      const artist = text.slice(0, idx).trim();
      const title = text.slice(idx + sep.length).replace(/^["'""\u201C]|["'""\u201D]$/g, '').trim();
      if (artist.length > 1 && title.length > 1) {
        return { artist, title };
      }
    }
  }
  return null;
}

function getPageUrl(page: number): string | null {
  if (page <= 1) return null;
  return `${config.baseUrl}/page/${page}/`;
}

export const indieshuffleParser: SourceParser = {
  name: 'indieshuffle',
  config,
  getArticleLinks,
  extractTracks,
  getPageUrl,
};
