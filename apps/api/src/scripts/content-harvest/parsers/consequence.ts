// Consequence parser — metal/indie/alternative
// Structured "Artist — 'Track'" format in best-of lists

import * as cheerio from 'cheerio';
import type { SourceConfig, ArticleLink, ScrapedTrack, SourceParser } from '../types';

const config: SourceConfig = {
  name: 'consequence',
  baseUrl: 'https://consequence.net',
  listUrl: 'https://consequence.net/music/',
  dominantGenres: ['metal', 'rock', 'indie', 'electronic'],
  curatorEmail: 'harvest-consequence@taste-roulette.local',
  curatorDisplayName: 'Consequence Editors',
};

function getArticleLinks(html: string): ArticleLink[] {
  const $ = cheerio.load(html);
  const links: ArticleLink[] = [];
  const seen = new Set<string>();

  $('a[href*="consequence.net/20"]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const title = $(el).text().trim();
    if (!title || title.length < 10 || title.length > 200) return;
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

  // 1. Spotify embeds
  $('iframe[src*="open.spotify.com/embed/track/"]').each((_, el) => {
    const src = $(el).attr('src') ?? '';
    const match = src.match(/track\/([a-zA-Z0-9]+)/);
    if (match && !seenIds.has(match[1])) {
      seenIds.add(match[1]);
      tracks.push({ artist: '', title: '', spotifyEmbedId: match[1], sourceUrl: articleUrl, sourceGenreHint: 'rock' });
    }
  });

  // 2. Spotify links
  $('a[href*="open.spotify.com/track/"]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const match = href.match(/track\/([a-zA-Z0-9]+)/);
    if (match && !seenIds.has(match[1])) {
      seenIds.add(match[1]);
      tracks.push({ artist: '', title: '', spotifyEmbedId: match[1], sourceUrl: articleUrl, sourceGenreHint: 'rock' });
    }
  });

  // 3. Structured list items: "Artist — 'Track Title'" or "Artist -- "Track""
  const bodyText = $('article, .entry-content, .post-content').first().text();
  const listPattern = /([A-Z][A-Za-z\s&'.\-]+?)\s*[–—\-]+\s*['"""\u201C]([^'"""\u201D\n]{2,60})['"""\u201D]/g;
  const seen = new Set<string>();
  let match;
  while ((match = listPattern.exec(bodyText)) !== null) {
    const key = `${match[1].trim()}-${match[2].trim()}`;
    if (!seen.has(key) && tracks.length < 20) {
      seen.add(key);
      tracks.push({
        artist: match[1].trim(),
        title: match[2].trim(),
        sourceUrl: articleUrl,
        sourceGenreHint: 'rock',
      });
    }
  }

  // 4. Article title fallback
  if (tracks.length === 0) {
    const articleTitle = $('h1').first().text().trim();
    if (articleTitle) {
      const verbs = /\s+(release|share|drop|debut|unveil|premiere|announce)\w*\s+/i;
      const verbMatch = articleTitle.match(verbs);
      if (verbMatch && verbMatch.index) {
        const artist = articleTitle.slice(0, verbMatch.index).trim();
        const afterVerb = articleTitle.slice(verbMatch.index);
        const quoteMatch = afterVerb.match(/['"""\u201C]([^'"""\u201D]{2,60})['"""\u201D]/);
        if (quoteMatch && artist.length > 1 && artist.length < 50) {
          tracks.push({ artist, title: quoteMatch[1], sourceUrl: articleUrl, sourceGenreHint: 'rock' });
        }
      }
    }
  }

  return tracks;
}

function getPageUrl(page: number): string | null {
  if (page <= 1) return null;
  return `${config.listUrl}page/${page}/`;
}

export const consequenceParser: SourceParser = {
  name: 'consequence',
  config,
  getArticleLinks,
  extractTracks,
  getPageUrl,
};
