// Simple per-domain rate limiter for web scraping

const lastRequestTime = new Map<string, number>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fetch with rate limiting — minimum delay between requests to the same domain. */
export async function throttledFetch(
  url: string,
  minDelayMs = 1000
): Promise<Response> {
  const domain = new URL(url).hostname;
  const lastTime = lastRequestTime.get(domain) ?? 0;
  const elapsed = Date.now() - lastTime;

  if (elapsed < minDelayMs) {
    await sleep(minDelayMs - elapsed);
  }

  lastRequestTime.set(domain, Date.now());

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'TasteRoulette/1.0 (content-harvest)',
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  // Handle rate limiting with exponential backoff
  if (res.status === 429) {
    for (let retry = 1; retry <= 3; retry++) {
      const backoff = Math.pow(2, retry) * 1000;
      console.warn(`  429 rate limited on ${domain}, backing off ${backoff}ms...`);
      await sleep(backoff);
      lastRequestTime.set(domain, Date.now());
      const retryRes = await fetch(url, {
        headers: {
          'User-Agent': 'TasteRoulette/1.0 (content-harvest)',
          Accept: 'text/html,application/xhtml+xml',
        },
      });
      if (retryRes.status !== 429) return retryRes;
    }
  }

  return res;
}
