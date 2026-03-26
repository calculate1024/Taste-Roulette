// MetalSucks parser — metal/heavy music publication
// Ghost CMS-based with .gh-article structure

import * as cheerio from 'cheerio';
import type { SourceConfig, ArticleLink, ScrapedTrack, SourceParser } from '../types';

const config: SourceConfig = {
  name: 'metal-sucks',
  baseUrl: 'https://www.metalsucks.net',
  listUrl: 'https://www.metalsucks.net',
  dominantGenres: ['metal', 'rock', 'punk'],
  curatorEmail: 'harvest-metalsucks@taste-roulette.local',
  curatorDisplayName: 'MetalSucks Editors',
};

function getArticleLinks(html: string): ArticleLink[] {
  const $ = cheerio.load(html);
  const links: ArticleLink[] = [];
  const seen = new Set<string>();

  // Ghost CMS pattern: .gh-article with .gh-title links
  $('a.gh-title, .gh-article a').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const title = $(el).text().trim();
    if (!href || !title || title.length < 5) return;

    const fullUrl = href.startsWith('http') ? href : `https://www.metalsucks.net${href}`;
    if (seen.has(fullUrl)) return;
    // Only article URLs (date pattern)
    if (!fullUrl.match(/\/\d{4}\/\d{2}\/\d{2}\//)) return;
    seen.add(fullUrl);
    links.push({ url: fullUrl, title });
  });

  // Fallback: generic article selectors
  if (links.length === 0) {
    $('article h2 a, article h3 a, .post-title a').each((_, el) => {
      const href = $(el).attr('href') ?? '';
      const title = $(el).text().trim();
      if (!href || !title || title.length < 5) return;

      const fullUrl = href.startsWith('http') ? href : `https://www.metalsucks.net${href}`;
      if (seen.has(fullUrl)) return;
      seen.add(fullUrl);
      links.push({ url: fullUrl, title });
    });
  }

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
        sourceGenreHint: 'metal',
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
        sourceGenreHint: 'metal',
      });
    }
  });

  // 3. Parse article title for "Artist Drop/Release/Premiere 'Track'"
  if (tracks.length === 0) {
    const articleTitle = $('h1.gh-title, h1.post-title, article h1, h1').first().text().trim()
      || $('title').text().split('|')[0].split('-')[0].trim();

    if (articleTitle) {
      const parsed = parseMetalTitle(articleTitle);
      if (parsed) {
        tracks.push({
          artist: parsed.artist,
          title: parsed.title,
          sourceUrl: articleUrl,
          sourceGenreHint: 'metal',
        });
      }
    }
  }

  return tracks;
}

/** Parse metal blog title patterns like "Artist Drop New Song 'Title'" */
function parseMetalTitle(text: string): { artist: string; title: string } | null {
  // Pattern: "Artist verb ... 'Title'" or "Artist verb ... "Title""
  const verbs = /\s+(drop|release|premiere|unveil|share|debut|post|stream|announce|reveal|launch)\w*\s+/i;
  const verbMatch = text.match(verbs);

  if (verbMatch && verbMatch.index) {
    const artist = text.slice(0, verbMatch.index).trim();

    // Extract quoted title after the verb
    const afterVerb = text.slice(verbMatch.index);
    const quoteMatch = afterVerb.match(/[''""\u2018\u201C]([^''""\u2019\u201D]{2,60})[''""\u2019\u201D]/);
    if (quoteMatch && artist.length > 1) {
      return { artist, title: quoteMatch[1] };
    }
  }

  // Fallback: standard separator
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

function getPageUrl(page: number): string | null {
  if (page <= 1) return null;
  // Ghost CMS pagination
  return `${config.baseUrl}/page/${page}/`;
}

export const metalsucksParser: SourceParser = {
  name: 'metal-sucks',
  config,
  getArticleLinks,
  extractTracks,
  getPageUrl,
};
