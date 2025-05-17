'use server';

import { SC_MOONSTERS } from '@/context/constants';
import { abiMoonsters } from '@/utils/abiMoonsters';
import { createPublicClient, http } from 'viem';
import { liskSepolia } from 'viem/chains';

const CRYPTO_MOON_ADDRESS = SC_MOONSTERS;

// ABI for the updated CryptoMoonV1 contract
const CRYPTO_MOON_ABI = abiMoonsters;

// Define the MoonsterDetails type to match the component's expectations
interface MoonsterDetails {
    id: number;
    name: string;
    image: string;
    description: string;
    types: string[];
    abilities: string[];
    stats: { name: string; value: number }[];
    height: number;
    weight: number;
    baseExperience: number;
    evolutionChain: { name: string; image?: string; id: number }[]; // Added id field
    strengths: string[];
    weaknesses: string[];
    resistant: string[];
    vulnerable: string[];
    location_area_encounters: string;
    location: string;
    chance: number;
}

interface ComparisonResult {
    moonster1Id: bigint;
    moonster1StatTotal: bigint;
    moonster2StatTotal: bigint;
    moonster1HasTypeAdvantage: boolean;
    moonster2HasTypeAdvantage: boolean;
    winner: string;
}

interface MoonsterAnalysis {
    typeAdvantage1: boolean;
    typeAdvantage2: boolean;
    statAdvantage1: number;
    statAdvantage2: number;
    combinedAdvantage1: number;
    combinedAdvantage2: number;
}

// Initialize the public client for Lisk Sepolia Testnet (chainId 4202)
const publicClient = createPublicClient({
    chain: liskSepolia,
    transport: http(process.env.LISK_SEPOLIA_RPC_URL || 'https://rpc.sepolia-api.lisk.com'),
});

export async function getMoonsterByIds(ids: number[]): Promise<MoonsterDetails[]> {
    try {
        // Fetch Moonster data for each ID
        const moonsterPromises = ids.map(async (id) => {
            let moonsterData: any;
            try {
                moonsterData = await publicClient.readContract({
                    address: CRYPTO_MOON_ADDRESS,
                    abi: CRYPTO_MOON_ABI,
                    functionName: 'getMoonsterById', // Updated function name
                    args: [BigInt(id)],
                });
            } catch (contractError) {
                console.error(`Failed to fetch Moonster with ID ${id} from smart contract:`, contractError);
                return null; // Skip this Moonster if the contract call fails
            }

            // Validate moonsterData structure
            if (!moonsterData || typeof moonsterData !== 'object') {
                console.error(`Invalid moonsterData structure for ID ${id}:`, moonsterData);
                return null;
            }

            // Validate required fields
            if (!moonsterData.id || !moonsterData.name) {
                console.error(`Missing ID or name for Moonster ID ${id}:`, { id: moonsterData.id, name: moonsterData.name });
                return null;
            }

            // Map the returned object to MoonsterDetails with validation
            return {
                id: Number(moonsterData.id),
                name: moonsterData.name || "Unknown",
                image: moonsterData.image || "/no_image.png",
                description: moonsterData.description || "No description available",
                types: Array.isArray(moonsterData.types) ? moonsterData.types : [],
                abilities: Array.isArray(moonsterData.abilities) ? moonsterData.abilities : [],
                stats: Array.isArray(moonsterData.stats) ? moonsterData.stats.map((stat: { name: string; value: bigint }) => ({
                    name: stat.name || "Unknown",
                    value: Number(stat.value) || 0,
                })) : [],
                height: Number(moonsterData.height) || 0,
                weight: Number(moonsterData.weight) || 0,
                baseExperience: Number(moonsterData.baseExperience) || 0,
                evolutionChain: Array.isArray(moonsterData.evolutionChain) ? moonsterData.evolutionChain.map((evo: { name: string; image: string; id: bigint }) => ({
                    name: evo.name || "Unknown",
                    image: evo.image || "/no_image.png",
                    id: Number(evo.id) || 0, // Added id mapping
                })) : [],
                strengths: Array.isArray(moonsterData.strengths) ? moonsterData.strengths : [],
                weaknesses: Array.isArray(moonsterData.weaknesses) ? moonsterData.weaknesses : [],
                resistant: Array.isArray(moonsterData.resistant) ? moonsterData.resistant : [],
                vulnerable: Array.isArray(moonsterData.vulnerable) ? moonsterData.vulnerable : [],
                location_area_encounters: moonsterData.locationAreaEncounters || "no info",
                location: moonsterData.location || "Unknown Location",
                chance: Number(moonsterData.chance) || 0,
            } as MoonsterDetails;
        });

        const moonsters = await Promise.all(moonsterPromises);
        // Filter out null entries (failed fetches)
        const validMoonsters = moonsters.filter((moonster): moonster is MoonsterDetails => moonster !== null);

        if (validMoonsters.length === 0) {
            console.error(`No valid Moonster data returned for IDs: ${ids.join(', ')}`);
            return [];
        }

        return validMoonsters;
    } catch (error) {
        console.error('Error fetching Moonster data:', error);
        return [];
    }
}

export async function getMoonsterByName(name: string): Promise<MoonsterDetails | null> {
    try {
        let moonsterData: any;
        try {
            moonsterData = await publicClient.readContract({
                address: CRYPTO_MOON_ADDRESS,
                abi: CRYPTO_MOON_ABI,
                functionName: 'getMoonsterByName', // Use the new smart contract function
                args: [name],
            });
        } catch (contractError) {
            console.error(`Failed to fetch Moonster with name ${name} from smart contract:`, contractError);
            return null;
        }

        // Validate moonsterData structure
        if (!moonsterData || typeof moonsterData !== 'object') {
            console.error(`Invalid moonsterData structure for name ${name}:`, moonsterData);
            return null;
        }

        // Validate required fields
        if (!moonsterData.id || !moonsterData.name) {
            console.error(`Missing ID or name for Moonster name ${name}:`, { id: moonsterData.id, name: moonsterData.name });
            return null;
        }

        // Map the returned object to MoonsterDetails with validation
        const moonster: MoonsterDetails = {
            id: Number(moonsterData.id),
            name: moonsterData.name || "Unknown",
            image: moonsterData.image || "/no_image.png",
            description: moonsterData.description || "No description available",
            types: Array.isArray(moonsterData.types) ? moonsterData.types : [],
            abilities: Array.isArray(moonsterData.abilities) ? moonsterData.abilities : [],
            stats: Array.isArray(moonsterData.stats) ? moonsterData.stats.map((stat: { name: string; value: bigint }) => ({
                name: stat.name || "Unknown",
                value: Number(stat.value) || 0,
            })) : [],
            height: Number(moonsterData.height) || 0,
            weight: Number(moonsterData.weight) || 0,
            baseExperience: Number(moonsterData.baseExperience) || 0,
            evolutionChain: Array.isArray(moonsterData.evolutionChain) ? moonsterData.evolutionChain.map((evo: { name: string; image: string; id: bigint }) => ({
                name: evo.name || "Unknown",
                image: evo.image || "/no_image.png",
                id: Number(evo.id) || 0, // Added id mapping
            })) : [],
            strengths: Array.isArray(moonsterData.strengths) ? moonsterData.strengths : [],
            weaknesses: Array.isArray(moonsterData.weaknesses) ? moonsterData.weaknesses : [],
            resistant: Array.isArray(moonsterData.resistant) ? moonsterData.resistant : [],
            vulnerable: Array.isArray(moonsterData.vulnerable) ? moonsterData.vulnerable : [],
            location_area_encounters: moonsterData.locationAreaEncounters || "no info",
            location: moonsterData.location || "Unknown Location",
            chance: Number(moonsterData.chance) || 0,
        };

        // Verify the name matches (case-insensitive) to ensure correctness
        if (moonster.name.toLowerCase() !== name.toLowerCase()) {
            console.error(`Fetched Moonster name ${moonster.name} does not match requested name ${name}`);
            return null;
        }

        return moonster;
    } catch (error) {
        console.error(`Error fetching Moonster by name ${name}:`, error);
        return null;
    }
}

export async function getPairMoonsterData(ids: number[]): Promise<MoonsterDetails[]> {
    const moonsters = await Promise.all(
        ids.map(async (id) => {
            try {
                const moonsterData = await publicClient.readContract({
                    address: CRYPTO_MOON_ADDRESS,
                    abi: CRYPTO_MOON_ABI,
                    functionName: 'getMoonsterById',
                    args: [BigInt(id)],
                }) as any;

                if (moonsterData && typeof moonsterData === 'object' && 'id' in moonsterData) {
                    return {
                        id: Number(moonsterData.id),
                        name: moonsterData.name,
                        image: moonsterData.image,
                        description: moonsterData.description,
                        types: moonsterData.types,
                        abilities: moonsterData.abilities,
                        stats: moonsterData.stats.map((stat: any) => ({
                            name: stat.name,
                            value: Number(stat.value),
                        })),
                        height: Number(moonsterData.height),
                        weight: Number(moonsterData.weight),
                        baseExperience: Number(moonsterData.baseExperience),
                        evolutionChain: moonsterData.evolutionChain.map((evo: any) => ({
                            name: evo.name,
                            image: evo.image,
                        })),
                        strengths: moonsterData.strengths,
                        weaknesses: moonsterData.weaknesses,
                        resistant: moonsterData.resistant,
                        vulnerable: moonsterData.vulnerable,
                        location_area_encounters: moonsterData.locationAreaEncounters,
                        location: moonsterData.location,
                        chance: Number(moonsterData.chance),
                    } as MoonsterDetails;
                }
                return null;
            } catch (error) {
                console.error(`Error fetching Moonster with ID ${id}:`, error);
                return null;
            }
        })
    );

    return moonsters.filter((moonster): moonster is MoonsterDetails => moonster !== null);
}

export async function fetchMoonsterData(ids: number[]): Promise<Map<number, MoonsterDetails>> {
    const moonsters = await getPairMoonsterData(ids);
    const newMoonsterData = new Map<number, MoonsterDetails>();
    moonsters.forEach(moonster => {
        newMoonsterData.set(moonster.id, moonster);
    });
    return newMoonsterData;
}


export async function compareMoonsters(matchPairs: { id1: number; id2: number; player1: string; player2: string }[]): Promise<{ winners: Map<number, string>; analyses: Map<number, MoonsterAnalysis> }> {
    const newWinners = new Map<number, string>();
    const newAnalyses = new Map<number, MoonsterAnalysis>();

    for (const [index, match] of matchPairs.entries()) {
        try {
            const comparisonResult = await publicClient.readContract({
                address: CRYPTO_MOON_ADDRESS,
                abi: CRYPTO_MOON_ABI,
                functionName: 'compareMoonsters',
                args: [BigInt(match.id1), BigInt(match.id2)],
            }) as ComparisonResult;

            if (!comparisonResult) {
                console.error(`Comparison result not found for match ${index + 1}`);
                newWinners.set(index, '0x0000000000000000000000000000000000000000');
                continue;
            }

            const calculateWinningChance = (statTotal: bigint, hasTypeAdvantage: boolean) => {
                const totalStats = Number(comparisonResult.moonster1StatTotal) + Number(comparisonResult.moonster2StatTotal);
                const baseChance = totalStats > 0 ? (Number(statTotal) / totalStats) * 100 : 50;
                const typeBonus = hasTypeAdvantage ? 25 : 0;
                return Math.min(100, Math.max(0, Math.round(baseChance + typeBonus)));
            };

            const moonster1WinningChance = calculateWinningChance(comparisonResult.moonster1StatTotal, comparisonResult.moonster1HasTypeAdvantage);
            const moonster2WinningChance = calculateWinningChance(comparisonResult.moonster2StatTotal, comparisonResult.moonster2HasTypeAdvantage);

            const analysis: MoonsterAnalysis = {
                typeAdvantage1: comparisonResult.moonster1HasTypeAdvantage,
                typeAdvantage2: comparisonResult.moonster2HasTypeAdvantage,
                statAdvantage1: moonster1WinningChance,
                statAdvantage2: moonster2WinningChance,
                combinedAdvantage1: moonster1WinningChance,
                combinedAdvantage2: moonster2WinningChance,
            };

            newAnalyses.set(index, analysis);

            let winner: string;
            if (moonster1WinningChance > moonster2WinningChance) {
                winner = match.player1;
            } else if (moonster2WinningChance > moonster1WinningChance) {
                winner = match.player2;
            } else {
                winner = Math.random() < 0.5 ? match.player1 : match.player2;
            }
            newWinners.set(index, winner);
        } catch (error) {
            console.error(`Error comparing Moonsters for match ${index + 1}:`, error);
            newWinners.set(index, '0x0000000000000000000000000000000000000000');
        }
    }

    return { winners: newWinners, analyses: newAnalyses };
}