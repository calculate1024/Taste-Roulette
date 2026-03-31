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
import { ensureCuratorProfile, insertRecommendations, recalculateCuratorVector } from './curator-inserter';
import { supabaseAdmin } from '../../services/supabase';
import { resetReasonBatch } from './reason-rewriter';
import { earmilkParser } from './parsers/earmilk';
import { stereofoxParser } from './parsers/stereofox';
import { metalsucksParser } from './parsers/metalsucks';
import { bandcampDailyParser } from './parsers/bandcamp-daily';
import { loudwireParser } from './parsers/loudwire';
import { ftlobParser } from './parsers/ftlob';
import { nprMusicParser } from './parsers/npr-music';
import { consequenceParser } from './parsers/consequence';
import { indieshuffleParser } from './parsers/indieshuffle';
import { tsisParser } from './parsers/tsis';
import type { SourceParser, HarvestResult, MatchedTrack } from './types';

// Registry of available parsers
const PARSERS: Record<string, SourceParser> = {
  earmilk: earmilkParser,
  stereofox: stereofoxParser,
  'metal-sucks': metalsucksParser,
  'bandcamp-daily': bandcampDailyParser,
  loudwire: loudwireParser,
  ftlob: ftlobParser,
  'npr-music': nprMusicParser,
  consequence: consequenceParser,
  indieshuffle: indieshuffleParser,
  tsis: tsisParser,
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

  // Step 4: Fetch listing pages (with pagination)
  console.log(`[${config.name}] Fetching article listings...`);
  const articleLinks: { url: string; title: string }[] = [];
  const seenUrls = new Set<string>();
  const maxPages = 10; // safety cap

  for (let page = 1; page <= maxPages; page++) {
    const pageUrl = page === 1 ? config.listUrl : parser.getPageUrl(page);
    if (!pageUrl) break;

    if (page > 1) console.log(`[${config.name}] Fetching page ${page}...`);

    try {
      const res = await throttledFetch(pageUrl);
      if (!res.ok) {
        if (verbose) console.log(`  Page ${page} returned ${res.status} — stopping pagination`);
        break;
      }
      const html = await res.text();
      const links = parser.getArticleLinks(html);

      // Deduplicate across pages
      let newCount = 0;
      for (const link of links) {
        if (!seenUrls.has(link.url)) {
          seenUrls.add(link.url);
          articleLinks.push(link);
          newCount++;
        }
      }

      if (newCount === 0) {
        if (verbose) console.log(`  Page ${page} returned 0 new articles — stopping pagination`);
        break;
      }

      // Stop if we have enough
      if (articleLinks.length >= limit) break;
    } catch (err: any) {
      if (page === 1) {
        console.error(`[${config.name}] Failed to fetch listing page:`, err.message);
        result.errors.push(`Listing fetch failed: ${err.message}`);
        return result;
      }
      // Later pages failing is OK — use what we have
      if (verbose) console.log(`  Page ${page} failed: ${err.message} — stopping pagination`);
      break;
    }
  }

  // Trim to limit
  const trimmedLinks = articleLinks.slice(0, limit);
  console.log(`[${config.name}] Found ${trimmedLinks.length} articles across ${Math.min(Math.ceil(articleLinks.length / 10), maxPages)} page(s) (limit: ${limit})`);

  if (trimmedLinks.length === 0) {
    console.log(`[${config.name}] No articles found — parser may need updating`);
    result.errors.push('No articles found on listing page');
    return result;
  }

  // Replace articleLinks reference for processing
  const articleLinksToProcess = trimmedLinks;

  // Step 6: Process each article
  const allMatched: MatchedTrack[] = [];

  for (const article of articleLinksToProcess) {
    if (verbose) console.log(`\n  Processing: ${article.title}`);
    result.articlesScraped++;

    try {
      const res = await throttledFetch(article.url);
      const html = await res.text();
      const scraped = parser.extractTracks(html, article.url);
      result.tracksExtracted += scraped.length;

      if (verbose) console.log(`  Extracted ${scraped.length} track(s)`);

      for (const track of scraped) {
        // Attach article title for reason generation
        track.articleTitle = article.title;

        // Skip if source URL already processed
        if (existingSourceUrls.has(track.sourceUrl)) {
          result.tracksDuplicate++;
          continue;
        }

        const matched = await matchToSpotify(track, verbose, parser.name);
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

    // Recalculate curator taste vector from actual genre distribution
    if (inserted > 0 && !dryRun) {
      await recalculateCuratorVector(curatorId);

      // LLM rewrite reasons (if ANTHROPIC_API_KEY available)
      try {
        const { batchRewrite } = await import('./llm-rewriter');
        const rewriteInputs = allMatched.map(t => ({
          artist: t.artist,
          title: t.title,
          genres: t.genres || [],
          sourceName: config.displayName || config.name,
          excerpt: t.excerpt,
        }));
        console.log(`[${config.name}] Rewriting ${rewriteInputs.length} reasons via LLM...`);
        const results = await batchRewrite(rewriteInputs, 20);

        // Update DB with LLM reasons
        for (const t of allMatched) {
          const key = `${t.artist}|||${t.title}`;
          const rewritten = results.get(key);
          if (rewritten) {
            await supabaseAdmin
              .from('user_recommendations')
              .update({ reason: rewritten.zh, reason_en: rewritten.en })
              .eq('track_id', t.spotifyId)
              .eq('user_id', curatorId);
          }
        }
        console.log(`[${config.name}] LLM rewrite: ${results.size} reasons updated`);
      } catch (err: any) {
        if (verbose) console.log(`[${config.name}] LLM rewrite skipped: ${err.message}`);
      }
    }
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
