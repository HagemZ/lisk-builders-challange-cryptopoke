'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAccount, useReadContract } from 'wagmi';
import { FaCheckCircle, FaCircle } from 'react-icons/fa';
import { IoMdGitCompare } from 'react-icons/io';
import { MoonstersDetails } from '@/types/moonsters';
import DefaultLayout from '@/components/ui/Layout/DefaultLayout';
import Background from '@/components/Background';
import MenuBarComp from '@/components/Menubar';
import { abiUserManager } from '@/utils';
import { SC_USER_MANAGER } from '@/context/constants';
import { toast } from 'sonner';
import { useComparison } from '@/context/ComparisonContext';
import { useCapture } from '@/context/CaptureContext';

interface MoonstersDetailsClientProps {
  moonster: MoonstersDetails;
}
const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_IMAGE_BASE;

export default function MoonstersDetailsClient({ moonster }: MoonstersDetailsClientProps) {
  const router = useRouter();
  const { address, isConnected, chainId } = useAccount();

  // Fetch captured Moonster IDs (getUserIds) from blockchain
  const { data: capturedIds, isLoading: isCapturedIdsLoading, error: capturedIdsError } = useReadContract({
    abi: abiUserManager,
    address: SC_USER_MANAGER,
    functionName: 'getUserIds',
    args: address ? [address] : undefined,
    chainId: 4202,
  });

  // Use context for comparison and capture
  const { comparisonList, addToComparison, isMounted } = useComparison();
  const { captureList, addToCapture, isMounted: isCaptureMounted } = useCapture();

  // Redirect if not connected or wrong network
  useEffect(() => {
    if (!isConnected || Number(chainId) !== 4202) {
      toast.error('Please connect to the Lisk Sepolia Testnet.', { duration: 5000 });
      router.push('/');
    }
  }, [isConnected, chainId, router]);

  // Check if Moonster is captured (based on blockchain)
  const isMoonsterCaptured = () => {
    if (isCapturedIdsLoading || capturedIdsError || !capturedIds) {
      return false;
    }
    return capturedIds.map((id) => Number(id)).includes(moonster.id);
  };

  // Handle capture logic
  const handleCapture = async (moonster: MoonstersDetails) => {
    if (!address) {
      toast.warning('Connect your wallet');
      return;
    }

    if (Number(chainId) !== 4202) {
      toast.warning('Please change to Lisk Sepolia Testnet');
      return;
    }

    try {
      const captureMoonster = {
        id: moonster.id,
        name: moonster.name,
        image: moonster.image,
        description: moonster.description,
        location_area_encounters: moonster.location_area_encounters || 'no info',
        location: moonster.location, // From server action
        chance: moonster.chance, // From server action
        types: moonster.types,
        abilities: moonster.abilities,
        stats: moonster.stats,
        height: moonster.height,
        weight: moonster.weight,
        base_experience: moonster.base_experience,
        evolutionChain: moonster.evolutionChain ?? [],
        strengths: moonster.strengths,
        weaknesses: moonster.weaknesses,
        resistant: moonster.resistant,
        vulnerable: moonster.vulnerable,
      };

      if (captureMoonster.location === 'Unknown Location') {
        toast.warning(
          `Could not add ${moonster.name} to hunting list (no location data available). Please check info details about this Moonster (evolution chain).`
        );
        return;
      }

      const added = addToCapture(captureMoonster);
      if (added) {
        toast.success(`Added ${moonster.name} to hunting list.`);
      } else {
        toast.warning(`Could not add ${moonster.name} to hunting list (already added or list full).`);
      }
    } catch (err) {
      console.error(`Error processing capture for ${moonster.name}:`, err);
      toast.error(`Failed to capture ${moonster.name}.`);
    }
  };

  // Type color mapping for all 21 types
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
    '10001': 'bg-gray-200 text-black', // Placeholder for mysterious type
  };

  return (
    <DefaultLayout>
      <div className="max-w-6xl w-full mx-auto p-4 min-h-screen">
        <Background className="absolute inset-0 -z-10 grid grid-cols-3 gap-8 opacity-15" />
        <MenuBarComp />

        <div className="bg-gray-800 rounded-md shadow-xl p-6 border border-neutral-800 mt-4">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Image with Checkmark */}
            <div className="relative w-full md:w-1/2 h-96">
              <Image
                src={`${IMAGE_BASE_URL}${moonster.image}`}
                alt={`${moonster.name} artwork`}
                fill
                className="object-contain"
                priority
              />
              {isMoonsterCaptured() && !isCapturedIdsLoading && !capturedIdsError && (
                <div className="absolute bottom-4 right-4 bg-green-900/50 rounded-full p-2">
                  <FaCheckCircle className="text-green-400 w-8 h-8" />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="w-full md:w-1/2 text-gray-50">
              <div className="flex items-center gap-4 mb-4">
                <h1 className="text-3xl md:text-4xl font-bold capitalize">{moonster.name}</h1>
                {(isMounted && isCaptureMounted) ? (
                  <div className="flex gap-2">
                    <FaCircle
                      className={`my-capture-class h-8 w-8 border-2 border-[#FFFFFF] rounded-full p-1 bg-black/50 ${
                        captureList.some((m) => m.name === moonster.name)
                          ? 'text-green-100'
                          : 'text-[#f00962] hover:text-green-100'
                      }`}
                      onClick={() => handleCapture(moonster)}
                    />
                    <IoMdGitCompare
                      className={`my-compare-class h-8 w-8 border-2 border-[#083ac2] rounded-full p-1 bg-black/50 ${
                        comparisonList.some(item => item.name === moonster.name)
                          ? 'text-pink-700'
                          : 'text-[#0caa68] hover:text-pink-700'
                      }`}
                      onClick={() => addToComparison(moonster.name, moonster.id)}
                    />
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <FaCircle
                      className="my-capture-class h-8 w-8 border-2 border-[#FFFFFF] rounded-full p-1 bg-black/50 text-gray-400 cursor-not-allowed"
                      title="Loading capture context..."
                    />
                    <IoMdGitCompare
                      className="my-compare-class h-8 w-8 border-2 border-[#083ac2] rounded-full p-1 bg-black/50 text-gray-400 cursor-not-allowed"
                      title="Loading comparison context..."
                    />
                  </div>
                )}
              </div>
              <p className="text-base mb-4">{moonster.description}</p>
              <div>
                <h2 className="font-semibold text-[#f1cf0e] mb-2">Capture Status:</h2>{' '}
                {isCapturedIdsLoading ? (
                  <span className="text-gray-400">Loading...</span>
                ) : capturedIdsError ? (
                  <span className="text-red-400">Error</span>
                ) : isMoonsterCaptured() ? (
                  <span className="text-green-400 font-semibold bg-green-900/50 rounded-2xl px-2 py-1">Captured</span>
                ) : (
                  <span className="text-red-400 font-semibold bg-red-900/50 rounded-2xl px-2 py-1">Not Captured</span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4">
                {/* Types */}
                <div>
                  <h2 className="text-xl font-semibold text-[#f1cf0e]">Types</h2>
                  <div className="flex gap-2">
                    {moonster.types?.map((type) => (
                      <span
                        key={type}
                        className={`px-3 py-1 rounded-full text-sm capitalize ${
                          typeStyles[type.toLowerCase()] || 'bg-[#27af0f] text-white'
                        }`}
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Abilities */}
                <div>
                  <h2 className="text-xl font-semibold text-[#f1cf0e]">Abilities</h2>
                  <div className="flex gap-2">
                    {moonster.abilities?.map((ability, index) => {
                      const typeIndex = index % moonster.types!.length; // Cycle through types
                      const type = moonster.types![typeIndex];
                      return (
                        <span
                          key={ability}
                          className={`px-3 py-1 rounded-full text-sm capitalize ${
                            typeStyles[type.toLowerCase()] || 'bg-[#27af0f] text-white'
                          }`}
                        >
                          {ability}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Stats */}
                <div>
                  <h2 className="text-xl font-semibold text-[#f1cf0e]">Stats</h2>
                  <div className="grid grid-cols-1 gap-2">
                    {moonster.stats?.map((stat) => (
                      <div key={stat.name} className="flex flex-col">
                        <div className="flex justify-between mb-1">
                          <span className="capitalize">{stat.name}</span>
                          <span>{stat.value}</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                          <div
                            className="bg-[#27af0f] h-2.5 rounded-full"
                            style={{ width: `${(stat.value / 255) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Other Details */}
                <div>
                  <h2 className="text-xl font-semibold text-[#f1cf0e]">Details</h2>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="font-semibold">Height:</span> {(moonster.height ?? 0) / 10} m
                    </div>
                    <div>
                      <span className="font-semibold">Weight:</span> {(moonster.weight ?? 0) / 10} kg
                    </div>
                    <div>
                      <span className="font-semibold">Base Experience:</span> {moonster.base_experience}
                    </div>
                  </div>
                </div>

                {/* Type Effectiveness */}
                <div>
                  <h2 className="text-xl font-semibold text-[#f1cf0e]">Type Effectiveness</h2>
                  <div className="grid grid-cols-1 gap-2">
                    {moonster.strengths && moonster.strengths.length > 0 && (
                      <div>
                        <span className="font-semibold">Strengths:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {moonster.strengths.map((type) => (
                            <span
                              key={type}
                              className={`px-3 py-1 rounded-full text-sm capitalize ${
                                typeStyles[type.toLowerCase()] || 'bg-[#27af0f] text-white'
                              }`}
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {moonster.weaknesses && moonster.weaknesses?.length > 0 && (
                      <div>
                        <span className="font-semibold">Weaknesses:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {moonster.weaknesses.map((type) => (
                            <span
                              key={type}
                              className={`px-3 py-1 rounded-full text-sm capitalize ${
                                typeStyles[type.toLowerCase()] || 'bg-[#27af0f] text-white'
                              }`}
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {moonster.resistant && moonster.resistant?.length > 0 && (
                      <div>
                        <span className="font-semibold">Resistant:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {moonster.resistant.map((type) => (
                            <span
                              key={type}
                              className={`px-3 py-1 rounded-full text-sm capitalize ${
                                typeStyles[type.toLowerCase()] || 'bg-[#27af0f] text-white'
                              }`}
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {moonster.vulnerable && moonster.vulnerable?.length > 0 && (
                      <div>
                        <span className="font-semibold">Vulnerable:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {moonster.vulnerable.map((type) => (
                            <span
                              key={type}
                              className={`px-3 py-1 rounded-full text-sm capitalize ${
                                typeStyles[type.toLowerCase()] || 'bg-[#27af0f] text-white'
                              }`}
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Evolution Chain */}
                <div>
                  <h2 className="text-xl font-semibold text-[#f1cf0e]">Evolution Chain</h2>
                  <div className="flex flex-wrap gap-4">
                    {moonster.evolutionChain?.map((stage, index) => (
                      <div key={stage.name} className="flex items-center gap-2">
                        <Link
                          href={`/moonster/${stage.name}`}
                          className="flex items-center gap-2 hover:text-[#f1cf0e]"
                          aria-label={`View details for ${stage.name}`}
                        >
                          <div className="relative w-16 h-16">
                            <Image
                              src={`${IMAGE_BASE_URL}${stage.image || '/no_image.png'}`}
                              alt={`${stage.name} sprite`}
                              fill
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              className="object-contain"
                            />
                          </div>
                          <span className="capitalize text-sm">{stage.name}</span>
                        </Link>
                        {index < moonster.evolutionChain!.length - 1 && (
                          <span className="text-[#f1cf0e]">→</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
}