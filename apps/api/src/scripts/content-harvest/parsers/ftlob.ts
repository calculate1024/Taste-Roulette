// For The Love Of Bands parser — folk/reggae/country/blues/indie
// WordPress site with Spotify embeds

import * as cheerio from 'cheerio';
import type { SourceConfig, ArticleLink, ScrapedTrack, SourceParser } from '../types';

const config: SourceConfig = {
  name: 'ftlob',
  baseUrl: 'https://fortheloveofbands.com',
  listUrl: 'https://fortheloveofbands.com',
  dominantGenres: ['folk', 'indie', 'blues', 'country', 'reggae'],
  curatorEmail: 'harvest-ftlob@taste-roulette.local',
  curatorDisplayName: 'FTLOB Editors',
};

function getArticleLinks(html: string): ArticleLink[] {
  const $ = cheerio.load(html);
  const links: ArticleLink[] = [];
  const seen = new Set<string>();

  // WordPress: article links with date-based URLs
  $('article a, .entry-title a, h2 a, h3 a').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const title = $(el).text().trim();
    if (!title || title.length < 5) return;
    if (!href.includes('fortheloveofbands.com/20')) return; // date-based URLs

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

  // 1. Spotify track embeds
  $('iframe[src*="open.spotify.com/embed/track/"]').each((_, el) => {
    const src = $(el).attr('src') ?? '';
    const match = src.match(/track\/([a-zA-Z0-9]+)/);
    if (match && !seenIds.has(match[1])) {
      seenIds.add(match[1]);
      tracks.push({ artist: '', title: '', spotifyEmbedId: match[1], sourceUrl: articleUrl, sourceGenreHint: 'folk' });
    }
  });

  // 2. Spotify track links
  $('a[href*="open.spotify.com/track/"]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const match = href.match(/track\/([a-zA-Z0-9]+)/);
    if (match && !seenIds.has(match[1])) {
      seenIds.add(match[1]);
      tracks.push({ artist: '', title: '', spotifyEmbedId: match[1], sourceUrl: articleUrl, sourceGenreHint: 'folk' });
    }
  });

  // 3. Parse article title for artist/track
  if (tracks.length === 0) {
    const articleTitle = $('h1.entry-title, .entry-title, h1').first().text().trim();
    if (articleTitle) {
      const parsed = parseFtlobTitle(articleTitle);
      if (parsed) {
        tracks.push({ ...parsed, sourceUrl: articleUrl, sourceGenreHint: 'folk' });
      }
    }
  }

  return tracks;
}

function parseFtlobTitle(text: string): { artist: string; title: string } | null {
  // FTLOB titles: "Artist — Song Title" or "Artist Hits Back With 'Song Title'"
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

  // Pattern: "Artist verb ... 'Title'"
  const verbs = /\s+(release|share|drop|debut|unveil|hit|make|return)\w*\s+/i;
  const verbMatch = text.match(verbs);
  if (verbMatch && verbMatch.index) {
    const artist = text.slice(0, verbMatch.index).trim();
    const afterVerb = text.slice(verbMatch.index);
    const quoteMatch = afterVerb.match(/[''""\u2018\u201C]([^''""\u2019\u201D]{2,60})[''""\u2019\u201D]/);
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

export const ftlobParser: SourceParser = {
  name: 'ftlob',
  config,
  getArticleLinks,
  extractTracks,
  getPageUrl,
};
