import { MoonstersDetails } from '@/types/moonsters';
import { EvolutionDetails } from '@/types/evolution'; // Adjust import based on your type definition file
import { getCachedEvolution, setCachedEvolution, loadCache } from '@/utils/evolutionMoonCache';
import { getMoonsterByIds } from '@/actions/getMoonsterData';

export async function fetchCapturedMoonsters(ids: number[]): Promise<MoonstersDetails[]> {
  try {
    const MoonstersDetails = await getMoonsterByIds(ids);
    return MoonstersDetails;
  } catch (error) {
    console.error('Error fetching captured Moonsters:', error);
    return [];
  }
}

export async function fetchMoonsterEvolution(moonsterId: number): Promise<EvolutionDetails> {
  // Load cache on first use (client-side)
  if (typeof window !== 'undefined') {
    loadCache();
  }

  // Check cache first
  const cachedData = getCachedEvolution(moonsterId);
  if (cachedData) {
    console.log(`Using cached evolution data for Moonster ID ${moonsterId}`);
    return {
      chain: cachedData.chain.map(item => ({
        name: item.name,
        id: item.id,
        image: (item as any).image || '' // Provide default empty string if image is missing
      })),
      conditions: cachedData.conditions.map(condition => 
        typeof condition === 'string' ? {
          from: 'unknown',
          to: 'unknown',
          trigger: condition,
          details: condition
        } : condition
      )
    };
  }

  try {
    // Fetch Moonster details including evolution chain
    const moonsters = await getMoonsterByIds([moonsterId]);
    if (moonsters.length === 0) {
      console.error(`No Moonster data found for ID ${moonsterId}`);
      return { chain: [], conditions: [] }; // Default empty evolution
    }

    const moonster = moonsters[0];
    // Map evolutionChain to EvolutionDetails
    const evolutionData: EvolutionDetails = {
      chain: moonster.evolutionChain.map(evo => ({
        name: evo.name,
        image: evo.image || '',
        id: evo.id,
      })),
      conditions: [], // Add conditions if applicable; currently empty as per smart contract
    };

    setCachedEvolution(moonsterId, evolutionData);
    return evolutionData;
  } catch (error) {
    console.error('Error fetching evolution data:', error);
    return { chain: [], conditions: [] };
  }
}