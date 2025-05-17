import { EvolutionDetails } from '@/types/evolution'; // Adjust import based on your type definition file

// In-memory cache
const evolutionCache = new Map<number, EvolutionDetails>();

// Cache key for localStorage
const CACHE_KEY = 'moonster_evolution_cache'; // Updated to Moonster context
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

// Load cache from localStorage (only in browser)
function loadCache() {
  if (!isBrowser) {
    console.warn('localStorage is not available; skipping cache load.');
    return;
  }

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_EXPIRY) {
        for (const [id, details] of Object.entries(data)) {
          evolutionCache.set(Number(id), details as EvolutionDetails);
        }
      } else {
        localStorage.removeItem(CACHE_KEY); // Clear expired cache
      }
    }
  } catch (error) {
    console.error('Error loading evolution cache:', error);
  }
}

// Save cache to localStorage (only in browser)
function saveCache() {
  if (!isBrowser) {
    console.warn('localStorage is not available; skipping cache save.');
    return;
  }

  try {
    const data = Object.fromEntries(evolutionCache);
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
  } catch (error) {
    console.error('Error saving evolution cache:', error);
  }
}

export function getCachedEvolution(moonsterId: number): EvolutionDetails | undefined {
  return evolutionCache.get(moonsterId);
}

export function setCachedEvolution(moonsterId: number, data: EvolutionDetails): void {
  evolutionCache.set(moonsterId, data);
  saveCache();
}

// Export loadCache for manual initialization on the client
export { loadCache };