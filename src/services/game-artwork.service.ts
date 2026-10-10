/**
 * Service for resolving official game artwork from Steam Store API.
 * Server-side only; validates titles, verifies App IDs, caches results, and prevents invalid images.
 */

export interface SteamArtworkResult {
  source: "AUTO_STEAM" | "MANUAL" | "FALLBACK";
  steamAppId: number | null;
  bannerUrl: string | null;
  iconUrl: string | null;
  verifiedTitle: string | null;
  isVerified: boolean;
}

// In-memory cache for game title lookups (TTL 1 hour)
interface CacheEntry {
  result: SteamArtworkResult;
  timestamp: number;
}

const lookupCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000;

function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Searches Steam Store API for a given game title and verifies exact/close match.
 */
export async function resolveGameArtwork(title: string): Promise<SteamArtworkResult> {
  const trimmed = title.trim();
  if (!trimmed) {
    return {
      source: "FALLBACK",
      steamAppId: null,
      bannerUrl: null,
      iconUrl: null,
      verifiedTitle: null,
      isVerified: false,
    };
  }

  const cacheKey = normalizeTitle(trimmed);
  const cached = lookupCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  try {
    const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(trimmed)}&l=english&cc=US`;
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent": "DreamCafe-Retail/1.0 (Storefront Game Catalog)",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      throw new Error(`Steam Store API returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const items = data?.items;

    if (!Array.isArray(items) || items.length === 0) {
      const fallbackResult: SteamArtworkResult = {
        source: "FALLBACK",
        steamAppId: null,
        bannerUrl: null,
        iconUrl: null,
        verifiedTitle: null,
        isVerified: false,
      };
      lookupCache.set(cacheKey, { result: fallbackResult, timestamp: Date.now() });
      return fallbackResult;
    }

    // Find best match among items
    const normSearch = normalizeTitle(trimmed);
    let matchedItem = items.find((item: { name?: string; id?: number }) => {
      if (!item.name) return false;
      const normItem = normalizeTitle(item.name);
      return normItem === normSearch || normItem.includes(normSearch) || normSearch.includes(normItem);
    });

    // If no soft match, fall back to first result only if similarity is high
    if (!matchedItem && items[0]) {
      const firstNorm = normalizeTitle(items[0].name || "");
      if (firstNorm.slice(0, 4) === normSearch.slice(0, 4)) {
        matchedItem = items[0];
      }
    }

    if (!matchedItem || !matchedItem.id) {
      const fallbackResult: SteamArtworkResult = {
        source: "FALLBACK",
        steamAppId: null,
        bannerUrl: null,
        iconUrl: null,
        verifiedTitle: null,
        isVerified: false,
      };
      lookupCache.set(cacheKey, { result: fallbackResult, timestamp: Date.now() });
      return fallbackResult;
    }

    const appId = Number(matchedItem.id);
    const verifiedTitle = String(matchedItem.name);
    // Official Steam CDN Header (460x215) and Capsule
    const bannerUrl = `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;
    const iconUrl = `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/capsule_231x87.jpg`;

    const successResult: SteamArtworkResult = {
      source: "AUTO_STEAM",
      steamAppId: appId,
      bannerUrl,
      iconUrl,
      verifiedTitle,
      isVerified: true,
    };

    lookupCache.set(cacheKey, { result: successResult, timestamp: Date.now() });
    return successResult;
  } catch {
    const errorFallback: SteamArtworkResult = {
      source: "FALLBACK",
      steamAppId: null,
      bannerUrl: null,
      iconUrl: null,
      verifiedTitle: null,
      isVerified: false,
    };
    return errorFallback;
  }
}
