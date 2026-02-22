/**
 * Pexels API integration for fetching stock photos.
 * Free API — get your key at https://www.pexels.com/api/
 */

interface PexelsPhoto {
  id: number;
  src: {
    original: string;
    large2x: string;
    large: string;
    portrait: string;
    landscape: string;
  };
  alt: string;
  photographer: string;
}

interface PexelsSearchResponse {
  photos: PexelsPhoto[];
  total_results: number;
}

/**
 * Search Pexels for a portrait-oriented photo matching the keywords.
 * Returns the image URL or null if nothing found.
 */
async function searchPexels(
  keywords: string[],
  apiKey: string
): Promise<string | null> {
  const query = keywords.join(" ");

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=portrait&per_page=3&size=medium`,
      {
        headers: { Authorization: apiKey },
      }
    );

    if (!res.ok) {
      console.warn(`[Pexels] API returned ${res.status} for query: "${query}"`);
      return null;
    }

    const data: PexelsSearchResponse = await res.json();

    if (data.photos.length === 0) {
      // Fallback: try just the first keyword
      if (keywords.length > 1) {
        return searchPexels([keywords[0]], apiKey);
      }
      return null;
    }

    // Pick a random photo from the top 3 to add variety
    const photo = data.photos[Math.floor(Math.random() * data.photos.length)];

    // Use portrait (800x1200) for vertical video — fast to load
    return photo.src.portrait;
  } catch (err) {
    console.warn(`[Pexels] Fetch error for "${query}":`, err);
    return null;
  }
}

/**
 * Fetch background images for all scenes, hook, and CTA.
 * Runs all fetches in parallel for speed.
 */
export async function fetchStockBackgrounds(script: {
  hookKeywords?: string[];
  ctaKeywords?: string[];
  scenes: { keywords?: string[] }[];
}): Promise<{
  hookBg: string | null;
  ctaBg: string | null;
  sceneBgs: (string | null)[];
}> {
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) {
    console.warn("[Stock Media] PEXELS_API_KEY not set — using gradient fallbacks.");
    return {
      hookBg: null,
      ctaBg: null,
      sceneBgs: script.scenes.map(() => null),
    };
  }

  // Build all search promises in parallel
  const promises: Promise<string | null>[] = [];

  // Hook background
  promises.push(
    script.hookKeywords?.length
      ? searchPexels(script.hookKeywords, apiKey)
      : Promise.resolve(null)
  );

  // Scene backgrounds
  for (const scene of script.scenes) {
    promises.push(
      scene.keywords?.length
        ? searchPexels(scene.keywords, apiKey)
        : Promise.resolve(null)
    );
  }

  // CTA background
  promises.push(
    script.ctaKeywords?.length
      ? searchPexels(script.ctaKeywords, apiKey)
      : Promise.resolve(null)
  );

  const results = await Promise.all(promises);

  return {
    hookBg: results[0],
    sceneBgs: results.slice(1, 1 + script.scenes.length),
    ctaBg: results[results.length - 1],
  };
}
