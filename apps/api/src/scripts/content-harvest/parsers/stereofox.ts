// Stereofox parser — indie/alt/electronic music discovery platform

import * as cheerio from 'cheerio';
import type { SourceConfig, ArticleLink, ScrapedTrack, SourceParser } from '../types';

const config: SourceConfig = {
  name: 'stereofox',
  baseUrl: 'https://www.stereofox.com',
  listUrl: 'https://www.stereofox.com/articles/',
  dominantGenres: ['indie', 'electronic', 'folk'],
  curatorEmail: 'harvest-stereofox@taste-roulette.local',
  curatorDisplayName: 'Stereofox Editors',
};

function getArticleLinks(html: string): ArticleLink[] {
  const $ = cheerio.load(html);
  const links: ArticleLink[] = [];
  const seen = new Set<string>();

  // Stereofox article/interview links
  $('a[href*="/articles/"], a[href*="/interviews/"]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const title = $(el).text().trim();
    if (!href || !title || title.length < 5) return;
    // Skip navigation/category links
    if (href === '/articles/' || href === '/interviews/') return;

    const fullUrl = href.startsWith('http') ? href : `https://www.stereofox.com${href}`;
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

  // 1. Spotify track embeds
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
        sourceGenreHint: 'indie',
      });
    }
  });

  // 2. Spotify track links
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
        sourceGenreHint: 'indie',
      });
    }
  });

  // 3. Extract from artist pages linked in article
  const artists: string[] = [];
  $('a[href*="/artists/"]').each((_, el) => {
    const name = $(el).text().trim();
    if (name && name.length > 1 && name.length < 50) {
      artists.push(name);
    }
  });

  // 4. Extract quoted song titles from body
  if (tracks.length === 0 && artists.length > 0) {
    const bodyText = $('article, .post-content, .entry-content, main').first().text();
    const quotedTitles = extractQuotedTitles(bodyText);
    if (quotedTitles.length > 0) {
      tracks.push({
        artist: artists[0],
        title: quotedTitles[0],
        sourceUrl: articleUrl,
        sourceGenreHint: 'indie',
      });
    }
  }

  // 5. Fallback: h4 track titles within article
  if (tracks.length === 0) {
    $('article h4, .post-content h4').each((_, el) => {
      const text = $(el).text().trim();
      const parsed = parseTrackHeading(text);
      if (parsed) {
        tracks.push({
          artist: parsed.artist,
          title: parsed.title,
          sourceUrl: articleUrl,
          sourceGenreHint: 'indie',
        });
      }
    });
  }

  return tracks;
}

function extractQuotedTitles(text: string): string[] {
  const matches = text.match(/[""\u201C]([^"""\u201D]{2,60})[""\u201D]/g) || [];
  return matches
    .map((m) => m.replace(/^[""\u201C]|[""\u201D]$/g, '').trim())
    .filter((t) => t.length > 2 && t.length < 60 && !t.includes('http'));
}

function parseTrackHeading(text: string): { artist: string; title: string } | null {
  const separators = [' – ', ' — ', ' - '];
  for (const sep of separators) {
    const idx = text.indexOf(sep);
    if (idx > 0) {
      const artist = text.slice(0, idx).trim();
      const title = text.slice(idx + sep.length).replace(/^["'""]|["'""]$/g, '').trim();
      if (artist.length > 1 && title.length > 1) {
        return { artist, title };
      }
    }
  }
  return null;
}

export const stereofoxParser: SourceParser = {
  name: 'stereofox',
  config,
  getArticleLinks,
  extractTracks,
};
