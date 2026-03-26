// robots.txt compliance checker

const cache = new Map<string, boolean>();
const USER_AGENT = 'TasteRoulette/1.0 (content-harvest)';

/** Check if a URL is allowed by the site's robots.txt. */
export async function isAllowedByRobots(url: string): Promise<boolean> {
  const parsed = new URL(url);
  const domain = parsed.origin;

  if (cache.has(domain)) return cache.get(domain)!;

  try {
    const res = await fetch(`${domain}/robots.txt`, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!res.ok) {
      // No robots.txt = everything allowed
      cache.set(domain, true);
      return true;
    }

    const text = await res.text();
    const isBlocked = isPathBlocked(text, parsed.pathname);
    cache.set(domain, !isBlocked);
    return !isBlocked;
  } catch {
    // Network error fetching robots.txt = assume allowed
    cache.set(domain, true);
    return true;
  }
}

/** Simple robots.txt parser — checks Disallow rules for * and our user agent. */
function isPathBlocked(robotsTxt: string, path: string): boolean {
  const lines = robotsTxt.split('\n');
  let inRelevantBlock = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('#') || line === '') continue;

    if (line.toLowerCase().startsWith('user-agent:')) {
      const agent = line.slice('user-agent:'.length).trim().toLowerCase();
      inRelevantBlock = agent === '*' || agent === 'tasteroulette';
      continue;
    }

    if (inRelevantBlock && line.toLowerCase().startsWith('disallow:')) {
      const disallowed = line.slice('disallow:'.length).trim();
      if (disallowed && path.startsWith(disallowed)) {
        return true;
      }
    }
  }

  return false;
}
