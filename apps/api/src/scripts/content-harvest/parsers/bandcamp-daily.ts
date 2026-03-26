// Bandcamp Daily parser — jazz/world/folk/classical/experimental
// No Spotify embeds — needs Spotify search for every track

import * as cheerio from 'cheerio';
import type { SourceConfig, ArticleLink, ScrapedTrack, SourceParser } from '../types';

const config: SourceConfig = {
  name: 'bandcamp-daily',
  baseUrl: 'https://daily.bandcamp.com',
  listUrl: 'https://daily.bandcamp.com/lists',
  dominantGenres: ['jazz', 'world', 'folk', 'classical', 'ambient'],
  curatorEmail: 'harvest-bandcamp@taste-roulette.local',
  curatorDisplayName: 'Bandcamp Daily Editors',
};

function getArticleLinks(html: string): ArticleLink[] {
  const $ = cheerio.load(html);
  const links: ArticleLink[] = [];
  const seen = new Set<string>();

  // Bandcamp Daily uses <a> tags with relative paths
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const title = $(el).text().trim();
    if (!title || title.length < 10 || title.length > 200) return;

    // Article paths: /best-jazz/..., /features/..., /best-ambient/..., etc.
    const isArticle = /^\/(best-|features|album-of-the-day|lists\/)[a-z0-9-]+/.test(href);
    if (!isArticle) return;

    const fullUrl = href.startsWith('http') ? href : `https://daily.bandcamp.com${href}`;
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

  // Detect genre from URL
  const genreHint = detectGenreFromUrl(articleUrl);

  // 1. Bandcamp embeds contain album/track IDs — not useful for Spotify
  //    Instead, look for artist + album/track names in article structure

  // 2. Look for structured list items with artist — track patterns
  // Bandcamp Daily uses various formats in "best of" lists
  $('h3, h4, .list-article h2, .bcweekly-item-title').each((_, el) => {
    const text = $(el).text().trim();
    const parsed = parseArtistTrack(text);
    if (parsed && !seen.has(`${parsed.artist}-${parsed.title}`)) {
      seen.add(`${parsed.artist}-${parsed.title}`);
      tracks.push({
        artist: parsed.artist,
        title: parsed.title,
        sourceUrl: articleUrl,
        sourceGenreHint: genreHint,
      });
    }
  });

  // 3. Look for bold artist names followed by track/album titles
  $('p strong, p b, p em').each((_, el) => {
    const text = $(el).text().trim();
    const parent = $(el).parent().text().trim();
    if (text.length > 2 && text.length < 60) {
      const parsed = parseFromContext(text, parent);
      if (parsed && !seen.has(`${parsed.artist}-${parsed.title}`)) {
        seen.add(`${parsed.artist}-${parsed.title}`);
        tracks.push({
          artist: parsed.artist,
          title: parsed.title,
          sourceUrl: articleUrl,
          sourceGenreHint: genreHint,
        });
      }
    }
  });

  return tracks;
}

function detectGenreFromUrl(url: string): string {
  if (url.includes('jazz')) return 'jazz';
  if (url.includes('ambient')) return 'ambient';
  if (url.includes('folk')) return 'folk';
  if (url.includes('classical') || url.includes('modern-composition')) return 'classical';
  if (url.includes('world')) return 'world';
  if (url.includes('metal') || url.includes('punk')) return 'metal';
  if (url.includes('electronic')) return 'electronic';
  if (url.includes('hip-hop') || url.includes('rap')) return 'hip-hop';
  return 'indie';
}

function parseArtistTrack(text: string): { artist: string; title: string } | null {
  // Patterns: "Artist, Title", "Artist - Title", "Artist: Title", "Artist — Title"
  const separators = [', ', ' – ', ' — ', ' - ', ': '];
  for (const sep of separators) {
    const idx = text.indexOf(sep);
    if (idx > 1 && idx < text.length - 2) {
      const artist = text.slice(0, idx).trim();
      const title = text.slice(idx + sep.length).replace(/^["'""\u201C]|["'""\u201D]$/g, '').trim();
      if (artist.length > 1 && artist.length < 60 && title.length > 1 && title.length < 100) {
        return { artist, title };
      }
    }
  }
  return null;
}

function parseFromContext(boldText: string, parentText: string): { artist: string; title: string } | null {
  // Bold text is often the artist, followed by track/album title in quotes or italics
  const afterBold = parentText.slice(parentText.indexOf(boldText) + boldText.length);
  const quoteMatch = afterBold.match(/[""\u201C]([^"""\u201D]{2,60})[""\u201D]/);
  if (quoteMatch) {
    return { artist: boldText, title: quoteMatch[1] };
  }
  return null;
}

function getPageUrl(page: number): string | null {
  if (page <= 1) return null;
  return `${config.listUrl}?page=${page}`;
}

export const bandcampDailyParser: SourceParser = {
  name: 'bandcamp-daily',
  config,
  getArticleLinks,
  extractTracks,
  getPageUrl,
};
