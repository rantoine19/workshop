/**
 * NLM Clinical Tables API integration for HealthChat AI.
 *
 * Fetches plain-language condition information from the National Library
 * of Medicine's Clinical Tables API. Used when a user asks about a
 * medical condition in chat.
 *
 * API docs: https://clinicaltables.nlm.nih.gov/
 */

const NLM_BASE_URL =
  "https://clinicaltables.nlm.nih.gov/api/conditions/v3/search";

/** How long to cache responses (15 minutes) */
const CACHE_TTL_MS = 15 * 60 * 1000;

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 5000;

/** Maximum number of results to request */
const MAX_RESULTS = 3;

interface CacheEntry {
  result: string | null;
  timestamp: number;
}

/**
 * Simple in-memory cache for NLM responses.
 * Keyed by lowercase query string.
 */
const cache = new Map<string, CacheEntry>();

/**
 * Look up a medical condition using the NLM Clinical Tables API.
 *
 * Returns a formatted string with condition name(s), or null if
 * the lookup fails or returns no results.
 *
 * - Caches responses for 15 minutes
 * - Times out after 5 seconds
 * - Returns null on any error (graceful degradation)
 */
export async function lookupCondition(
  query: string
): Promise<string | null> {
  if (!query || query.trim().length === 0) {
    return null;
  }

  const normalizedQuery = query.trim().toLowerCase();

  // Check cache
  const cached = cache.get(normalizedQuery);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  try {
    const url = new URL(NLM_BASE_URL);
    url.searchParams.set("terms", query.trim());
    url.searchParams.set("maxList", String(MAX_RESULTS));

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS
    );

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      cacheResult(normalizedQuery, null);
      return null;
    }

    const data = await response.json();

    // NLM Clinical Tables API returns:
    // [totalCount, matchedNames, extraFieldCodes, extraFieldValues]
    // For conditions: [count, [name1, name2, ...], null, [[info1], [info2], ...]]
    const result = parseNlmResponse(data, query);
    cacheResult(normalizedQuery, result);
    return result;
  } catch {
    // Network error, timeout, or parsing error — fail silently
    cacheResult(normalizedQuery, null);
    return null;
  }
}

/**
 * Parse the NLM Clinical Tables API response format.
 *
 * Response shape: [totalCount, matchedNames, codeInfo, extraFields]
 * - totalCount: number of total matches
 * - matchedNames: array of condition name strings
 * - codeInfo: code-related data (often null for conditions)
 * - extraFields: array of arrays with extra field values
 */
function parseNlmResponse(
  data: unknown,
  originalQuery: string
): string | null {
  if (!Array.isArray(data) || data.length < 2) {
    return null;
  }

  const totalCount = data[0] as number;
  const names = data[1] as string[];

  if (totalCount === 0 || !names || names.length === 0) {
    return null;
  }

  // Build a human-readable summary
  const conditionList = names
    .slice(0, MAX_RESULTS)
    .map((name) => `"${name}"`)
    .join(", ");

  return `NLM Clinical Tables found the following conditions matching "${originalQuery}": ${conditionList}. You can use these terms to provide accurate information to the patient.`;
}

/**
 * Store a result in the cache.
 */
function cacheResult(key: string, result: string | null): void {
  cache.set(key, {
    result,
    timestamp: Date.now(),
  });

  // Prevent cache from growing indefinitely
  if (cache.size > 200) {
    // Remove oldest entries
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = entries.slice(0, 50);
    for (const [key] of toRemove) {
      cache.delete(key);
    }
  }
}

/**
 * Clear the cache (useful for testing).
 */
export function clearNlmCache(): void {
  cache.clear();
}

/**
 * Exported for testing: direct access to parse function.
 */
export { parseNlmResponse as _parseNlmResponse };
