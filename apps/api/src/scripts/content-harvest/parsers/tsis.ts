// This Song Is Sick (TSIS) parser — electronic/hip-hop
// Track-focused blog with Spotify embeds

import * as cheerio from 'cheerio';
import type { SourceConfig, ArticleLink, ScrapedTrack, SourceParser } from '../types';

const config: SourceConfig = {
  name: 'tsis',
  baseUrl: 'https://www.thissongissick.com',
  listUrl: 'https://www.thissongissick.com',
  dominantGenres: ['electronic', 'hip-hop', 'indie'],
  curatorEmail: 'harvest-tsis@taste-roulette.local',
  curatorDisplayName: 'TSIS Editors',
};

function getArticleLinks(html: string): ArticleLink[] {
  const $ = cheerio.load(html);
  const links: ArticleLink[] = [];
  const seen = new Set<string>();

  // TSIS article links — look for h2 links and article links
  $('h2 a, article a, .post-title a').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const title = $(el).text().trim();
    if (!title || title.length < 10) return;
    if (!href.includes('thissongissick.com/')) return;
    if (href.includes('/tag/') || href.includes('/category/') || href.includes('/author/')) return;
    if (href.includes('.jpg') || href.includes('.png')) return;

    if (seen.has(href)) return;
    seen.add(href);
    links.push({ url: href, title });
  });

  return links;
}

function extractTracks(html: string, articleUrl: string): ScrapedTrack[] {
  const $ = cheerio.load(html);
  const tracks: ScrapedTrack[] = [];
  const seenIds = new Set<string>();

  // 1. Spotify track embeds (TSIS has these)
  $('iframe[src*="open.spotify.com/embed/track/"]').each((_, el) => {
    const src = $(el).attr('src') ?? '';
    const match = src.match(/track\/([a-zA-Z0-9]+)/);
    if (match && !seenIds.has(match[1])) {
      seenIds.add(match[1]);
      tracks.push({ artist: '', title: '', spotifyEmbedId: match[1], sourceUrl: articleUrl, sourceGenreHint: 'electronic' });
    }
  });

  // 2. Spotify links
  $('a[href*="open.spotify.com/track/"]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const match = href.match(/track\/([a-zA-Z0-9]+)/);
    if (match && !seenIds.has(match[1])) {
      seenIds.add(match[1]);
      tracks.push({ artist: '', title: '', spotifyEmbedId: match[1], sourceUrl: articleUrl, sourceGenreHint: 'electronic' });
    }
  });

  // 3. Parse article title
  if (tracks.length === 0) {
    const h1 = $('h1').first().text().trim();
    if (h1) {
      const parsed = parseTsisTitle(h1);
      if (parsed) {
        tracks.push({ ...parsed, sourceUrl: articleUrl, sourceGenreHint: 'electronic' });
      }
    }
  }

  return tracks;
}

function parseTsisTitle(text: string): { artist: string; title: string } | null {
  // Pattern: "Artist – Track" or "Artist Drops 'Track'"
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

  // Verb pattern
  const verbs = /\s+(drop|release|share|premiere|unveil|deliver)\w*\s+/i;
  const verbMatch = text.match(verbs);
  if (verbMatch && verbMatch.index) {
    const artist = text.slice(0, verbMatch.index).trim();
    const afterVerb = text.slice(verbMatch.index);
    const quoteMatch = afterVerb.match(/['"""\u201C]([^'"""\u201D]{2,60})['"""\u201D]/);
    if (quoteMatch && artist.length > 1) {
      return { artist, title: quoteMatch[1] };
    }
  }
  return null;
}

function getPageUrl(page: number): string | null {
  if (page <= 1) return null;
  return `${config.baseUrl}/page/${page}/`;
}

export const tsisParser: SourceParser = {
  name: 'tsis',
  config,
  getArticleLinks,
  extractTracks,
  getPageUrl,
};
