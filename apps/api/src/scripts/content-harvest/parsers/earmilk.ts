// Earmilk parser — electronic/hip-hop/alt music publication
// WordPress-based site with possible Spotify embeds

import * as cheerio from 'cheerio';
import type { SourceConfig, ArticleLink, ScrapedTrack, SourceParser } from '../types';

const config: SourceConfig = {
  name: 'earmilk',
  baseUrl: 'https://earmilk.com',
  listUrl: 'https://earmilk.com/category/music/',
  dominantGenres: ['electronic', 'hip-hop', 'indie'],
  curatorEmail: 'harvest-earmilk@taste-roulette.local',
  curatorDisplayName: 'Earmilk Editors',
};

/** Extract article links from listing page. */
function getArticleLinks(html: string): ArticleLink[] {
  const $ = cheerio.load(html);
  const links: ArticleLink[] = [];

  // WordPress common patterns for article listings
  const selectors = [
    'article .entry-title a',
    '.post-title a',
    'h2.entry-title a',
    'h3.entry-title a',
    '.post a[rel="bookmark"]',
    'article h2 a',
    'article h3 a',
    '.post-card__title a',
  ];

  for (const selector of selectors) {
    $(selector).each((_, el) => {
      const href = $(el).attr('href');
      const title = $(el).text().trim();
      if (href && title && href.includes('earmilk.com')) {
        // Skip non-article links (categories, tags, etc.)
        if (href.includes('/category/') || href.includes('/tag/')) return;
        links.push({ url: href, title });
      }
    });

    if (links.length > 0) break; // Use first selector that matches
  }

  // Deduplicate
  const seen = new Set<string>();
  return links.filter((link) => {
    if (seen.has(link.url)) return false;
    seen.add(link.url);
    return true;
  });
}

/** Extract tracks from an article page. */
function extractTracks(html: string, articleUrl: string): ScrapedTrack[] {
  const $ = cheerio.load(html);
  const tracks: ScrapedTrack[] = [];
  const seenIds = new Set<string>();

  // 1. Look for Spotify track embeds (iframe)
  $('iframe[src*="open.spotify.com/embed/track/"]').each((_, el) => {
    const src = $(el).attr('src') ?? '';
    const match = src.match(/track\/([a-zA-Z0-9]+)/);
    if (match && !seenIds.has(match[1])) {
      seenIds.add(match[1]);
      tracks.push({
        artist: '',
        title: '',
        spotifyEmbedId: match[1],
        sourceUrl: articleUrl,
        sourceGenreHint: 'electronic',
      });
    }
  });

  // 2. Look for Spotify track links (anchor tags)
  $('a[href*="open.spotify.com/track/"]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const match = href.match(/track\/([a-zA-Z0-9]+)/);
    if (match && !seenIds.has(match[1])) {
      seenIds.add(match[1]);
      tracks.push({
        artist: '',
        title: '',
        spotifyEmbedId: match[1],
        sourceUrl: articleUrl,
        sourceGenreHint: 'electronic',
      });
    }
  });

  // 3. Extract quoted song titles from article body text
  // Pattern: "Song Title" (in quotes) often appears near artist mentions
  const articleTitle = $('h1.entry-title, h1.post-title, article h1, .entry-title').first().text().trim()
    || $('title').text().split('|')[0].trim();

  // 4. Try to parse "Artist releases "Song Title"" or similar from article title
  if (tracks.length === 0 && articleTitle) {
    const parsed = parseArtistTitle(articleTitle);
    if (parsed) {
      tracks.push({
        artist: parsed.artist,
        title: parsed.title,
        sourceUrl: articleUrl,
        sourceGenreHint: 'electronic',
      });
    }
  }

  // 5. Fallback: extract quoted titles from body and match with article artist
  if (tracks.length === 0 && articleTitle) {
    const bodyText = $('.entry-content, .post-content, article').first().text();
    const quotedTitles = extractQuotedTitles(bodyText);
    const artistGuess = guessArtistFromTitle(articleTitle);

    if (artistGuess && quotedTitles.length > 0) {
      // Take first quoted title as the track name
      tracks.push({
        artist: artistGuess,
        title: quotedTitles[0],
        sourceUrl: articleUrl,
        sourceGenreHint: 'electronic',
      });
    }
  }

  return tracks;
}

/** Extract quoted strings that look like song titles. */
function extractQuotedTitles(text: string): string[] {
  const titles: string[] = [];
  // Match "Title" or "Title" (curly quotes)
  const matches = text.match(/[""\u201C]([^"""\u201D]{2,60})[""\u201D]/g) || [];
  for (const m of matches) {
    const clean = m.replace(/^[""\u201C]|[""\u201D]$/g, '').trim();
    // Filter out common non-title quoted text
    if (clean.length > 2 && clean.length < 60 && !clean.includes('http')) {
      titles.push(clean);
    }
  }
  return titles;
}

/** Guess artist name from article title (first capitalized words before action verb). */
function guessArtistFromTitle(title: string): string | null {
  // Common patterns: "Artist releases...", "Artist announces...", "Artist drops...",
  // "Artist shares...", "Artist present...", "Artist on..."
  const verbs = /\s+(release|announce|drop|share|present|unveil|deliver|debut|premiere|return|reveal|explore|on\s|and\s)/i;
  const match = title.match(verbs);
  if (match && match.index && match.index > 1) {
    const artist = title.slice(0, match.index).trim();
    if (artist.length > 1 && artist.length < 60) {
      return artist;
    }
  }
  return null;
}

/** Parse "Artist – Track Title" patterns from text. */
function parseArtistTitle(text: string): { artist: string; title: string } | null {
  // Clean up common prefixes
  const cleaned = text
    .replace(/^(premiere|exclusive|listen|watch|video|stream|new music|new song)[:\s]+/i, '')
    .replace(/\[.*?\]/g, '')
    .trim();

  // Try different separators: –, -, —, :
  const separators = [' – ', ' — ', ' - ', ': '];
  for (const sep of separators) {
    const idx = cleaned.indexOf(sep);
    if (idx > 0) {
      const artist = cleaned.slice(0, idx).trim();
      let title = cleaned.slice(idx + sep.length).trim();
      // Remove quotes around title
      title = title.replace(/^["'""]|["'""]$/g, '');
      // Remove trailing metadata like (Official Video), etc.
      title = title.replace(/\(official.*?\)/gi, '').trim();

      if (artist.length > 1 && title.length > 1) {
        return { artist, title };
      }
    }
  }

  return null;
}

export const earmilkParser: SourceParser = {
  name: 'earmilk',
  config,
  getArticleLinks,
  extractTracks,
};
