// Shared interfaces for the content harvest pipeline

export interface ScrapedTrack {
  artist: string;
  title: string;
  spotifyEmbedId?: string; // extracted from Spotify embed iframe
  sourceUrl: string;       // article URL (internal tracking only)
  sourceGenreHint: string; // e.g. 'electronic' — from source config
}

export interface MatchedTrack extends ScrapedTrack {
  spotifyId: string;
  genres: string[];
  reason: string; // generated reason (never copied from source)
}

export interface HarvestResult {
  source: string;
  articlesScraped: number;
  tracksExtracted: number;
  tracksMatched: number;
  tracksInserted: number;
  tracksDuplicate: number;
  errors: string[];
}

export interface SourceConfig {
  name: string;
  baseUrl: string;
  listUrl: string;
  dominantGenres: string[];
  curatorEmail: string;
  curatorDisplayName: string;
}

export interface ArticleLink {
  url: string;
  title: string;
}

export interface SourceParser {
  name: string;
  config: SourceConfig;
  getArticleLinks(html: string): ArticleLink[];
  extractTracks(html: string, articleUrl: string): ScrapedTrack[];
}
