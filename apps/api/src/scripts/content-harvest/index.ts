// Content Harvest Pipeline — CLI entry point
//
// Scrapes public music media articles → matches to Spotify → inserts as curator recommendations.
//
// Usage:
//   npm run harvest -- --source earmilk --limit 20
//   npm run harvest -- --source earmilk --limit 5 --dry-run --verbose

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

import { isAllowedByRobots } from './robots';
import { throttledFetch } from './rate-limiter';
import { matchToSpotify, loadExistingIds } from './spotify-matcher';
import { ensureCuratorProfile, insertRecommendations } from './curator-inserter';
import { resetReasonBatch } from './reason-rewriter';
import { earmilkParser } from './parsers/earmilk';
import type { SourceParser, HarvestResult, MatchedTrack } from './types';

// Registry of available parsers
const PARSERS: Record<string, SourceParser> = {
  earmilk: earmilkParser,
};

// CLI argument parsing
function parseArgs() {
  const args = process.argv.slice(2);
  const flags: Record<string, string> = {};
  const boolFlags = new Set<string>();

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') {
      boolFlags.add('dryRun');
    } else if (arg === '--verbose') {
      boolFlags.add('verbose');
    } else if (arg.startsWith('--') && i + 1 < args.length) {
      flags[arg.slice(2)] = args[i + 1];
      i++;
    }
  }

  return {
    source: flags.source ?? '',
    limit: parseInt(flags.limit ?? '20', 10),
    dryRun: boolFlags.has('dryRun'),
    verbose: boolFlags.has('verbose'),
  };
}

/** Harvest from a single source. */
async function harvestSource(
  parser: SourceParser,
  limit: number,
  dryRun: boolean,
  verbose: boolean
): Promise<HarvestResult> {
  const result: HarvestResult = {
    source: parser.name,
    articlesScraped: 0,
    tracksExtracted: 0,
    tracksMatched: 0,
    tracksInserted: 0,
    tracksDuplicate: 0,
    errors: [],
  };

  const { config } = parser;
  resetReasonBatch();

  // Step 1: Check robots.txt
  console.log(`\n[${config.name}] Checking robots.txt...`);
  const allowed = await isAllowedByRobots(config.listUrl);
  if (!allowed) {
    console.log(`[${config.name}] BLOCKED by robots.txt — skipping`);
    result.errors.push('Blocked by robots.txt');
    return result;
  }
  console.log(`[${config.name}] robots.txt OK`);

  // Step 2: Ensure curator profile
  console.log(`[${config.name}] Ensuring curator profile...`);
  let curatorId: string;
  try {
    curatorId = await ensureCuratorProfile(config);
  } catch (err: any) {
    console.error(`[${config.name}] Failed to create curator profile:`, err.message);
    result.errors.push(`Curator profile creation failed: ${err.message}`);
    return result;
  }

  // Step 3: Load existing IDs for dedup
  const { existingTrackIds, existingSourceUrls } = await loadExistingIds(curatorId);
  console.log(`[${config.name}] Existing: ${existingTrackIds.size} tracks, ${existingSourceUrls.size} source URLs`);

  // Step 4: Fetch listing page
  console.log(`[${config.name}] Fetching article listing...`);
  let listingHtml: string;
  try {
    const res = await throttledFetch(config.listUrl);
    listingHtml = await res.text();
  } catch (err: any) {
    console.error(`[${config.name}] Failed to fetch listing page:`, err.message);
    result.errors.push(`Listing fetch failed: ${err.message}`);
    return result;
  }

  // Step 5: Extract article links
  const articleLinks = parser.getArticleLinks(listingHtml).slice(0, limit);
  console.log(`[${config.name}] Found ${articleLinks.length} articles (limit: ${limit})`);

  if (articleLinks.length === 0) {
    console.log(`[${config.name}] No articles found — parser may need updating`);
    result.errors.push('No articles found on listing page');
    return result;
  }

  // Step 6: Process each article
  const allMatched: MatchedTrack[] = [];

  for (const article of articleLinks) {
    if (verbose) console.log(`\n  Processing: ${article.title}`);
    result.articlesScraped++;

    try {
      const res = await throttledFetch(article.url);
      const html = await res.text();
      const scraped = parser.extractTracks(html, article.url);
      result.tracksExtracted += scraped.length;

      if (verbose) console.log(`  Extracted ${scraped.length} track(s)`);

      for (const track of scraped) {
        // Skip if source URL already processed
        if (existingSourceUrls.has(track.sourceUrl)) {
          result.tracksDuplicate++;
          continue;
        }

        const matched = await matchToSpotify(track, verbose);
        if (matched) {
          // Skip if track already in this curator's pool
          if (existingTrackIds.has(matched.spotifyId)) {
            result.tracksDuplicate++;
            if (verbose) console.log(`  DEDUP: ${matched.artist} - ${matched.title}`);
            continue;
          }
          allMatched.push(matched);
          result.tracksMatched++;
        }
      }
    } catch (err: any) {
      if (verbose) console.warn(`  ERROR processing article: ${err.message}`);
      result.errors.push(`Article error: ${article.url} — ${err.message}`);
    }
  }

  // Step 7: Insert recommendations
  if (allMatched.length > 0) {
    console.log(`\n[${config.name}] Inserting ${allMatched.length} recommendations...`);
    const { inserted, duplicate } = await insertRecommendations(
      curatorId,
      allMatched,
      existingTrackIds,
      dryRun
    );
    result.tracksInserted = inserted;
    result.tracksDuplicate += duplicate;
  }

  return result;
}

/** Print summary report. */
function printSummary(results: HarvestResult[]): void {
  console.log('\n' + '='.repeat(60));
  console.log('HARVEST SUMMARY');
  console.log('='.repeat(60));

  for (const r of results) {
    console.log(`\n[${r.source}]`);
    console.log(`  Articles scraped:  ${r.articlesScraped}`);
    console.log(`  Tracks extracted:  ${r.tracksExtracted}`);
    console.log(`  Spotify matched:   ${r.tracksMatched}`);
    console.log(`  Inserted (new):    ${r.tracksInserted}`);
    console.log(`  Duplicates:        ${r.tracksDuplicate}`);
    if (r.errors.length > 0) {
      console.log(`  Errors: ${r.errors.length}`);
      for (const err of r.errors) {
        console.log(`    - ${err}`);
      }
    }
  }

  const totals = results.reduce(
    (acc, r) => ({
      articles: acc.articles + r.articlesScraped,
      extracted: acc.extracted + r.tracksExtracted,
      matched: acc.matched + r.tracksMatched,
      inserted: acc.inserted + r.tracksInserted,
      duplicate: acc.duplicate + r.tracksDuplicate,
    }),
    { articles: 0, extracted: 0, matched: 0, inserted: 0, duplicate: 0 }
  );

  console.log('\n' + '-'.repeat(60));
  console.log(`TOTAL: ${totals.inserted} new tracks inserted from ${totals.articles} articles`);
  console.log('='.repeat(60));
}

// Main
async function main() {
  const { source, limit, dryRun, verbose } = parseArgs();

  if (!source) {
    console.log('Usage: npm run harvest -- --source <name> [--limit N] [--dry-run] [--verbose]');
    console.log(`Available sources: ${Object.keys(PARSERS).join(', ')}, all`);
    process.exit(1);
  }

  if (dryRun) console.log('🏷  DRY RUN — no database writes\n');

  const sources = source === 'all'
    ? Object.values(PARSERS)
    : [PARSERS[source]];

  if (!sources[0]) {
    console.error(`Unknown source: ${source}`);
    console.log(`Available: ${Object.keys(PARSERS).join(', ')}, all`);
    process.exit(1);
  }

  const results: HarvestResult[] = [];
  for (const parser of sources) {
    const result = await harvestSource(parser, limit, dryRun, verbose);
    results.push(result);
  }

  printSummary(results);
}

main().catch(console.error);
