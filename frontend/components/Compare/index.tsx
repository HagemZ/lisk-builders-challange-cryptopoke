'use client';

import { useComparison } from '@/context/ComparisonContext';
import { useRouter } from 'next/navigation';
import { useReadContract } from 'wagmi';
import Image from 'next/image';
import { Button } from '../ui/button';
import { SC_MOONSTERS } from '@/context/constants';
import { abiMoonsters } from '@/utils/abiMoonsters';

interface CompareMondexProps {
    onTabChange: (value: string) => void;
}

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
    evolutionChain: { name: string; image?: string }[];
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
    moonster2Id: bigint;
    moonster1StatTotal: bigint;
    moonster2StatTotal: bigint;
    moonster1HasTypeAdvantage: boolean;
    moonster2HasTypeAdvantage: boolean;
    winner: string;
}

const CRYPTO_MOON_ADDRESS = SC_MOONSTERS;
const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_IMAGE_BASE;

const CRYPTO_MOON_ABI = abiMoonsters;

const typeStyles: { [key: string]: string } = {
    normal: 'bg-gray-500 text-white',
    fighting: 'bg-red-700 text-white',
    flying: 'bg-gray-400 text-black',
    poison: 'bg-purple-600 text-white',
    ground: 'bg-yellow-700 text-white',
    rock: 'bg-yellow-800 text-white',
    bug: 'bg-green-600 text-white',
    ghost: 'bg-purple-800 text-white',
    steel: 'bg-gray-600 text-white',
    fire: 'bg-red-500 text-white',
    water: 'bg-blue-500 text-white',
    grass: 'bg-green-500 text-white',
    electric: 'bg-yellow-500 text-black',
    psychic: 'bg-pink-500 text-white',
    ice: 'bg-cyan-300 text-black',
    dragon: 'bg-indigo-700 text-white',
    dark: 'bg-gray-800 text-white',
    fairy: 'bg-pink-300 text-black',
    stellar: 'bg-blue-300 text-black',
    unknown: 'bg-gray-300 text-black',
    '10001': 'bg-gray-200 text-black',
};

const CompareMondex: React.FC<CompareMondexProps> = ({ onTabChange }) => {
    const router = useRouter();
    const { comparisonList = [], clearComparison, isMounted } = useComparison();

    // Debug log to confirm comparisonList value
    // console.log('CompareMondex comparisonList:', comparisonList);

    // Call useReadContract for Moonster 1 and 2
    const moonster1Query = useReadContract({
        address: CRYPTO_MOON_ADDRESS,
        abi: CRYPTO_MOON_ABI,
        functionName: 'getMoonsterById',
        args: comparisonList[0] ? [BigInt(comparisonList[0].id)] : undefined,
        chainId: 4202,
    });

    const moonster2Query = useReadContract({
        address: CRYPTO_MOON_ADDRESS,
        abi: CRYPTO_MOON_ABI,
        functionName: 'getMoonsterById',
        args: comparisonList[1] ? [BigInt(comparisonList[1].id)] : undefined,
        chainId: 4202,
    });

    // Call compareMoonsters when two Moonsters are selected
    const compareQuery = useReadContract({
        address: CRYPTO_MOON_ADDRESS,
        abi: CRYPTO_MOON_ABI,
        functionName: 'compareMoonsters',
        args: comparisonList.length === 2 ? [BigInt(comparisonList[0].id), BigInt(comparisonList[1].id)] : undefined,
        chainId: 4202,
    });

    // Process Moonster data
    const moonster1Data = moonster1Query.data && typeof moonster1Query.data === 'object' && 'id' in moonster1Query.data
        ? {
            id: Number((moonster1Query.data as any).id),
            name: (moonster1Query.data as any).name,
            image: (moonster1Query.data as any).image,
            description: (moonster1Query.data as any).description,
            types: (moonster1Query.data as any).types,
            abilities: (moonster1Query.data as any).abilities,
            stats: (moonster1Query.data as any).stats.map((stat: any) => ({
                name: stat.name,
                value: Number(stat.value),
            })),
            height: Number((moonster1Query.data as any).height),
            weight: Number((moonster1Query.data as any).weight),
            baseExperience: Number((moonster1Query.data as any).baseExperience),
            evolutionChain: (moonster1Query.data as any).evolutionChain.map((evo: any) => ({
                name: evo.name,
                image: evo.image,
            })),
            strengths: (moonster1Query.data as any).strengths,
            weaknesses: (moonster1Query.data as any).weaknesses,
            resistant: (moonster1Query.data as any).resistant,
            vulnerable: (moonster1Query.data as any).vulnerable,
            location_area_encounters: (moonster1Query.data as any).locationAreaEncounters,
            location: (moonster1Query.data as any).location,
            chance: Number((moonster1Query.data as any).chance),
        }
        : null;

    const moonster2Data = moonster2Query.data && typeof moonster2Query.data === 'object' && 'id' in moonster2Query.data
        ? {
            id: Number((moonster2Query.data as any).id),
            name: (moonster2Query.data as any).name,
            image: (moonster2Query.data as any).image,
            description: (moonster2Query.data as any).description,
            types: (moonster2Query.data as any).types,
            abilities: (moonster2Query.data as any).abilities,
            stats: (moonster2Query.data as any).stats.map((stat: any) => ({
                name: stat.name,
                value: Number(stat.value),
            })),
            height: Number((moonster2Query.data as any).height),
            weight: Number((moonster2Query.data as any).weight),
            baseExperience: Number((moonster2Query.data as any).baseExperience),
            evolutionChain: (moonster2Query.data as any).evolutionChain.map((evo: any) => ({
                name: evo.name,
                image: evo.image,
            })),
            strengths: (moonster2Query.data as any).strengths,
            weaknesses: (moonster2Query.data as any).weaknesses,
            resistant: (moonster2Query.data as any).resistant,
            vulnerable: (moonster2Query.data as any).vulnerable,
            location_area_encounters: (moonster2Query.data as any).locationAreaEncounters,
            location: (moonster2Query.data as any).location,
            chance: Number((moonster2Query.data as any).chance),
        }
        : null;

    // Process comparison result
    const comparisonResult = compareQuery.data
        ? {
            moonster1Id: (compareQuery.data as any).moonster1Id,
            moonster2Id: (compareQuery.data as any).moonster2Id,
            moonster1StatTotal: (compareQuery.data as any).moonster1StatTotal,
            moonster2StatTotal: (compareQuery.data as any).moonster2StatTotal,
            moonster1HasTypeAdvantage: (compareQuery.data as any).moonster1HasTypeAdvantage,
            moonster2HasTypeAdvantage: (compareQuery.data as any).moonster2HasTypeAdvantage,
            winner: (compareQuery.data as any).winner,
        }
        : null;

    // Derive loading state
    const isLoading = moonster1Query.isLoading || moonster2Query.isLoading || compareQuery.isLoading;

    // Handle clear comparison with navigation to the Search tab
    const handleClearComparison = () => {
        clearComparison(); // Clear the comparison list
        onTabChange('search'); // Navigate to the Search tab
    };

    // Calculate winning chance based on stat total and type advantage
    const calculateWinningChance = (statTotal: bigint, hasTypeAdvantage: boolean) => {
        const totalStats = Number(statTotal) + Number(comparisonResult?.moonster1StatTotal || BigInt(0)) + Number(comparisonResult?.moonster2StatTotal || BigInt(0));
        const baseChance = totalStats > 0 ? (Number(statTotal) / totalStats) * 100 : 50;
        const typeBonus = hasTypeAdvantage ? 25 : 0;
        return Math.min(100, Math.max(0, Math.round(baseChance + typeBonus)));
    };

    const moonster1WinningChance = comparisonResult ? calculateWinningChance(comparisonResult.moonster1StatTotal, comparisonResult.moonster1HasTypeAdvantage) : 0;
    const moonster2WinningChance = comparisonResult ? calculateWinningChance(comparisonResult.moonster2StatTotal, comparisonResult.moonster2HasTypeAdvantage) : 0;

    // Debug type styles
    //   console.log('Moonster 1 Types:', moonster1Data?.types.map(t => t.toLowerCase()));
    //   console.log('Moonster 2 Types:', moonster2Data?.types.map(t => t.toLowerCase()));

    // Only render if mounted
    if (!isMounted) {
        return null;
    }

    return (
        <div className="max-w-5xl w-full mx-auto p-4">
            {isLoading ? (
                <div className="text-center text-white">Loading...</div>
            ) : (
                <>
                    {comparisonList.length === 0 ? (
                        <div className="text-center text-white">
                            <p>No Moonsters selected for comparison.</p>
                            <button
                                onClick={() => onTabChange('search')}
                                className="mt-4 px-4 py-2 bg-[#27af0f] text-white rounded-md hover:bg-green-600"
                            >
                                Add Moonsters
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {comparisonList.map((moonster, index) => {
                                const moonsterData = index === 0 ? moonster1Data : moonster2Data;
                                if (!moonsterData) return null;
                                return (
                                    <div key={moonster.id} className="bg-gray-800 rounded-md shadow-xl p-6 border border-neutral-800 relative">
                                       

                                        <div className="flex flex-col md:flex-row items-start gap-8">
                                            {/* Name and Image Section */}
                                            <div>
                                                <h1 className="text-3xl font-bold capitalize text-gray-50 mb-4">{moonsterData.name}</h1>
                                                <div className="relative w-full max-w-xs md:w-48 md:h-48">
                                                    <Image
                                                        src={`${IMAGE_BASE_URL}${moonsterData.image}`}
                                                        alt={`${moonsterData.name} artwork`}
                                                        width={200}
                                                        height={200}
                                                        className="object-contain"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = '/no_image.png';
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Types and Effectiveness Section */}
                                            <div className="text-gray-50">
                                                <h2 className="text-xl font-semibold">Type</h2>
                                                <div className="flex gap-2 mt-2">
                                                    {moonsterData.types.map((type: string) => (
                                                        <span
                                                            key={type}
                                                            className={`px-3 py-1 rounded-full text-sm capitalize ${typeStyles[type.toLowerCase()] || 'bg-[#27af0f] text-white'
                                                                }`}
                                                        >
                                                            {type}
                                                        </span>
                                                    ))}
                                                </div>
                                                <h2 className="text-xl font-semibold mt-4">Type Effectiveness</h2>
                                                <div className="mt-2">
                                                    <h3 className="text-lg font-medium">Strengths:</h3>
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {moonsterData.strengths.map((type: string, idx: number) => (
                                                            <span
                                                                key={idx}
                                                                className={`px-3 py-1 rounded-full text-sm capitalize ${typeStyles[type.toLowerCase()] || 'bg-[#27af0f] text-white'
                                                                    }`}
                                                            >
                                                                {type}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <h3 className="text-lg font-medium mt-2">Weaknesses:</h3>
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {moonsterData.weaknesses.map((type: string, idx: number) => (
                                                            <span
                                                                key={idx}
                                                                className={`px-3 py-1 rounded-full text-sm capitalize ${typeStyles[type.toLowerCase()] || 'bg-[#27af0f] text-white'
                                                                    }`}
                                                            >
                                                                {type}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <h3 className="text-lg font-medium mt-2">Resistant:</h3>
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {moonsterData.resistant.map((type: string, idx: number) => (
                                                            <span
                                                                key={idx}
                                                                className={`px-3 py-1 rounded-full text-sm capitalize ${typeStyles[type.toLowerCase()] || 'bg-[#27af0f] text-white'
                                                                    }`}
                                                            >
                                                                {type}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <h3 className="text-lg font-medium mt-2">Vulnerable:</h3>
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {moonsterData.vulnerable.map((type: string, idx: number) => (
                                                            <span
                                                                key={idx}
                                                                className={`px-3 py-1 rounded-full text-sm capitalize ${typeStyles[type.toLowerCase()] || 'bg-[#27af0f] text-white'
                                                                    }`}
                                                            >
                                                                {type}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>


                                    </div>
                                );
                            })}
                            {comparisonList.length === 1 && (
                                <div className="bg-gray-800 rounded-md shadow-xl p-6 border border-neutral-800 flex flex-col items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center mb-2">
                                        <span className="text-white text-2xl">+</span>
                                    </div>
                                    <p className="text-gray-50">Add Moonster for Comparison</p>
                                    <button
                                        onClick={() => onTabChange('search')}
                                        className="mt-4 px-4 py-2 bg-[#27af0f] text-white rounded-md hover:bg-green-600"
                                    >
                                        Add
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
            {comparisonList.length > 0 && (
                <div className="mt-4 text-center">
                    <button
                        onClick={handleClearComparison}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
                    >
                        Clear Comparison
                    </button>
                </div>
            )}
            {comparisonResult && comparisonList.length === 2 && (
                <div className="mt-6 bg-gray-800 rounded-md shadow-xl p-6 border border-neutral-800">
                    <h2 className="text-2xl font-bold text-gray-50 mb-4">Moonster Analysis</h2>
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-50 mb-2">Overall Advantage</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-lg text-gray-50">{moonster1Data?.name} ({moonster1WinningChance}%)</span>
                            <div className="flex-1 h-6 bg-gray-700 rounded-full overflow-hidden relative">
                                <div
                                    className="h-full bg-green-500 transition-all duration-300 absolute left-0"
                                    style={{ width: `${moonster1WinningChance}%` }}
                                ></div>
                                <div
                                    className="h-full bg-red-500 transition-all duration-300 absolute right-0"
                                    style={{ width: `${moonster2WinningChance}%` }}
                                ></div>
                            </div>
                            <span className="text-lg text-gray-50">{moonster2Data?.name} ({moonster2WinningChance}%)</span>
                        </div>
                    </div>
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-50 mb-2">Type Advantage</h3>
                        <div className="text-gray-50">
                            {comparisonResult.moonster1HasTypeAdvantage && !comparisonResult.moonster2HasTypeAdvantage && (
                                <p className="text-sm">{moonster1Data?.name} has a type advantage over {moonster2Data?.name}.</p>
                            )}
                            {comparisonResult.moonster2HasTypeAdvantage && !comparisonResult.moonster1HasTypeAdvantage && (
                                <p className="text-sm">{moonster2Data?.name} has a type advantage over {moonster1Data?.name}.</p>
                            )}
                            {(!comparisonResult.moonster1HasTypeAdvantage && !comparisonResult.moonster2HasTypeAdvantage) ||
                                (comparisonResult.moonster1HasTypeAdvantage && comparisonResult.moonster2HasTypeAdvantage) ? (
                                <p className="text-sm">This matchup is balanced with no clear type advantage.</p>
                            ) : null}
                        </div>
                    </div>
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-50 mb-2">Stat Advantage</h3>
                        <div className="text-gray-50">
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <p className="text-sm font-medium">{moonster1Data?.name}</p>
                                    {moonster1Data?.stats.map((stat: { name: string; value: number }) => (
                                        <p key={stat.name} className="text-sm capitalize">
                                            {stat.name}: {stat.value}
                                        </p>
                                    ))}
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{moonster2Data?.name}</p>
                                    {moonster2Data?.stats.map((stat: { name: string; value: number }) => (
                                        <p key={stat.name} className="text-sm capitalize">
                                            {stat.name}: {stat.value}
                                        </p>
                                    ))}
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Difference</p>
                                    {moonster1Data?.stats.map((stat: { name: string; value: number }) => {
                                        const m2Stat = moonster2Data?.stats.find((s: { name: string; value: number }) => s.name === stat.name);
                                        const diff = m2Stat ? stat.value - m2Stat.value : 0;
                                        return (
                                            <p key={stat.name} className="text-sm">
                                                {diff >= 0 ? '+' : ''}{diff}
                                            </p>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompareMondex;