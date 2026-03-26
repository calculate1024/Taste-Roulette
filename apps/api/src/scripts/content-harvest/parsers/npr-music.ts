// NPR Music parser — classical/jazz/world/latin + broad coverage
// Clean HTML, "New Music Friday" and "Songs We Love" features

import * as cheerio from 'cheerio';
import type { SourceConfig, ArticleLink, ScrapedTrack, SourceParser } from '../types';

const config: SourceConfig = {
  name: 'npr-music',
  baseUrl: 'https://www.npr.org',
  listUrl: 'https://www.npr.org/music',
  dominantGenres: ['jazz', 'classical', 'world', 'latin', 'folk'],
  curatorEmail: 'harvest-npr@taste-roulette.local',
  curatorDisplayName: 'NPR Music Editors',
};

function getArticleLinks(html: string): ArticleLink[] {
  const $ = cheerio.load(html);
  const links: ArticleLink[] = [];
  const seen = new Set<string>();

  // NPR article links with date-based URLs
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const title = $(el).text().trim();
    if (!title || title.length < 10 || title.length > 200) return;

    // NPR article pattern: /YYYY/MM/DD/id/slug
    if (!href.match(/npr\.org\/20\d{2}\/\d{2}\/\d{2}\//)) return;
    // Skip non-music sections
    if (href.includes('/politics/') || href.includes('/news/')) return;

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
  const seenIds = new Set<string>();

  // 1. Spotify embeds
  $('iframe[src*="open.spotify.com/embed/track/"]').each((_, el) => {
    const src = $(el).attr('src') ?? '';
    const match = src.match(/track\/([a-zA-Z0-9]+)/);
    if (match && !seenIds.has(match[1])) {
      seenIds.add(match[1]);
      tracks.push({ artist: '', title: '', spotifyEmbedId: match[1], sourceUrl: articleUrl, sourceGenreHint: 'jazz' });
    }
  });

  // 2. Spotify track links
  $('a[href*="open.spotify.com/track/"]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const match = href.match(/track\/([a-zA-Z0-9]+)/);
    if (match && !seenIds.has(match[1])) {
      seenIds.add(match[1]);
      tracks.push({ artist: '', title: '', spotifyEmbedId: match[1], sourceUrl: articleUrl, sourceGenreHint: 'jazz' });
    }
  });

  // 3. Parse article title (NPR often uses "Artist, 'Track Title'" format)
  if (tracks.length === 0) {
    const articleTitle = $('h1').first().text().trim();
    if (articleTitle) {
      const parsed = parseNprTitle(articleTitle);
      if (parsed) {
        tracks.push({ ...parsed, sourceUrl: articleUrl, sourceGenreHint: 'jazz' });
      }
    }
  }

  // 4. Look for structured list items in "New Music Friday" articles
  const bodyText = $('.storytext, .story-text, article, #storytext').first().text();
  const listPattern = /([A-Z][A-Za-z\s&'.]+?),\s+['"""\u201C]([^'"""\u201D\n]{2,60})['"""\u201D]/g;
  let match;
  const seen = new Set<string>();
  while ((match = listPattern.exec(bodyText)) !== null) {
    const key = `${match[1].trim()}-${match[2].trim()}`;
    if (!seen.has(key) && tracks.length < 20) {
      seen.add(key);
      tracks.push({
        artist: match[1].trim(),
        title: match[2].trim(),
        sourceUrl: articleUrl,
        sourceGenreHint: 'jazz',
      });
    }
  }

  return tracks;
}

function parseNprTitle(text: string): { artist: string; title: string } | null {
  // NPR patterns: "Artist, 'Track Title'" or "Artist: Track Title"
  const commaQuote = text.match(/^([^,]{2,50}),\s+['"""\u201C]([^'"""\u201D]{2,60})['"""\u201D]/);
  if (commaQuote) return { artist: commaQuote[1].trim(), title: commaQuote[2].trim() };

  const separators = [' – ', ' — ', ' - ', ': '];
  for (const sep of separators) {
    const idx = text.indexOf(sep);
    if (idx > 1) {
      const artist = text.slice(0, idx).trim();
      const title = text.slice(idx + sep.length).replace(/^["'""\u201C]|["'""\u201D]$/g, '').trim();
      if (artist.length > 1 && artist.length < 50 && title.length > 1) {
        return { artist, title };
      }
    }
  }
  return null;
}

function getPageUrl(page: number): string | null {
  // NPR uses different pagination — not standard /page/N
  return null; // Single page for now
}

export const nprMusicParser: SourceParser = {
  name: 'npr-music',
  config,
  getArticleLinks,
  extractTracks,
  getPageUrl,
};
