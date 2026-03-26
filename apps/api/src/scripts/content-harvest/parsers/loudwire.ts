// Loudwire parser — metal/hard rock/punk
// Townsquare Media platform with <article> tags

import * as cheerio from 'cheerio';
import type { SourceConfig, ArticleLink, ScrapedTrack, SourceParser } from '../types';

const config: SourceConfig = {
  name: 'loudwire',
  baseUrl: 'https://loudwire.com',
  listUrl: 'https://loudwire.com',
  dominantGenres: ['metal', 'rock', 'punk'],
  curatorEmail: 'harvest-loudwire@taste-roulette.local',
  curatorDisplayName: 'Loudwire Editors',
};

function getArticleLinks(html: string): ArticleLink[] {
  const $ = cheerio.load(html);
  const links: ArticleLink[] = [];
  const seen = new Set<string>();

  // Townsquare Media: article links within <article> or heading links
  $('article a, h2 a, h3 a, .content-list a').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const title = $(el).text().trim();
    if (!title || title.length < 10) return;
    if (!href.includes('loudwire.com/')) return;
    // Skip non-article links
    if (href.includes('/category/') || href.includes('/tag/') || href.includes('/author/')) return;
    if (href.includes('.jpg') || href.includes('.png')) return;
    if (href.includes('/feed/')) return;

    // Fix protocol-relative URLs
    const fixedUrl = href.startsWith('//') ? `https:${href}` : href;
    if (seen.has(fixedUrl)) return;
    seen.add(fixedUrl);
    links.push({ url: fixedUrl, title });
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
      tracks.push({ artist: '', title: '', spotifyEmbedId: match[1], sourceUrl: articleUrl, sourceGenreHint: 'metal' });
    }
  });

  // 2. Spotify track links
  $('a[href*="open.spotify.com/track/"]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const match = href.match(/track\/([a-zA-Z0-9]+)/);
    if (match && !seen.has(match[1])) {
      seen.add(match[1]);
      tracks.push({ artist: '', title: '', spotifyEmbedId: match[1], sourceUrl: articleUrl, sourceGenreHint: 'metal' });
    }
  });

  // 3. Parse ranked list items (Loudwire uses numbered lists)
  // Pattern: "10. Artist - 'Song Title'" or heading + artist/title
  const bodyText = $('.article-content, .post-content, article').first().text();
  const listPattern = /\d+\.\s+([A-Z][^–—\-\n]{1,50})\s*[–—\-]\s*['""']([^'""'\n]{2,60})['""']/g;
  let match;
  while ((match = listPattern.exec(bodyText)) !== null) {
    const key = `${match[1].trim()}-${match[2].trim()}`;
    if (!seen.has(key)) {
      seen.add(key);
      tracks.push({
        artist: match[1].trim(),
        title: match[2].trim(),
        sourceUrl: articleUrl,
        sourceGenreHint: 'metal',
      });
    }
  }

  // 4. Parse article title as fallback
  if (tracks.length === 0) {
    const articleTitle = $('h1').first().text().trim();
    if (articleTitle) {
      const parsed = parseMetalTitle(articleTitle);
      if (parsed) {
        tracks.push({ ...parsed, sourceUrl: articleUrl, sourceGenreHint: 'metal' });
      }
    }
  }

  return tracks;
}

function parseMetalTitle(text: string): { artist: string; title: string } | null {
  const verbs = /\s+(drop|release|premiere|unveil|share|debut|stream|announce|reveal)\w*\s+/i;
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

export const loudwireParser: SourceParser = {
  name: 'loudwire',
  config,
  getArticleLinks,
  extractTracks,
  getPageUrl,
};
