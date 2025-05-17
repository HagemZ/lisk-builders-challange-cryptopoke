'use client';

import React, { useState, useEffect } from 'react';
import { FaCircle, FaTrash, FaTimes, FaInfoCircle } from 'react-icons/fa';
import { IoMdGitCompare } from 'react-icons/io';
import { cn } from '@/lib/utils';
import { useDebounce } from 'use-debounce';
import { useRouter } from 'next/navigation';
import { useComparison } from '@/context/ComparisonContext';
import { useCapture } from '@/context/CaptureContext';
import { toast } from 'sonner';

import { useReadContract } from 'wagmi';
import { CryptoPokeSkeleton } from '../Loader';
import { SC_MOONSTERS } from '@/context/constants';
import { abiMoonsters } from '@/utils/abiMoonsters';

interface MoonsterWithEncounters {
  id: number;
  name: string;
  image: string;
  description: string;
  location: string;
  location_area_encounters?: string;
  chance: number;
}

interface SearchMondexProps {
  walletState: boolean;
  netWorkId: number;
}

const CRYPTO_MOON_ABI = abiMoonsters;

const CRYPTO_MOON_ADDRESS = SC_MOONSTERS; // Replace with your deployed contract address
const LIMIT = 7; // Number of Moonsters per page

const SearchMondex = ({ walletState, netWorkId }: SearchMondexProps) => {
  const router = useRouter();
  const [moonsters, setMoonsters] = useState<MoonsterWithEncounters[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery] = useDebounce(searchQuery, 500);
  const [offset, setOffset] = useState(0);
  const { comparisonList, addToComparison, isMounted } = useComparison();
  const { captureList, addToCapture, isMounted: isCaptureMounted } = useCapture();

  // Fetch total number of Moonsters
  const { data: totalMoonsters, error: countError } = useReadContract({
    address: CRYPTO_MOON_ADDRESS,
    abi: CRYPTO_MOON_ABI,
    functionName: 'moonsterCount',
    chainId: 4202,
  });

  // Fetch Moonsters with offset and limit
  const { data: moonsterList, error: fetchError, isLoading } = useReadContract({
    address: CRYPTO_MOON_ADDRESS,
    abi: CRYPTO_MOON_ABI,
    functionName: 'showListMoonsters',
    args: [BigInt(offset), BigInt(LIMIT)],
    chainId: 4202,
  });

  // console.log("moonsterList :", moonsterList)

  useEffect(() => {
    setLoading(isLoading);
    if (fetchError || countError) {
      setError('Failed to load Moonsters');
      setMoonsters([]);
      return;
    }

    if (moonsterList) {
      const moonsterData = (moonsterList as any[])
        .filter((moonster: any) => Number(moonster.id) !== 0) // Filter out entries with id 0
        .map((moonster: any) => ({
          id: Number(moonster.id),
          name: moonster.name,
          image: moonster.image,
          description: moonster.description,
          location: moonster.location,
          location_area_encounters: moonster.locationAreaEncounters,
          chance: Number(moonster.chance),
        }));
      setMoonsters(moonsterData);
      setError(null);
    }
  }, [moonsterList, fetchError, countError, isLoading, offset]);

  const handleClearQuery = () => {
    setSearchQuery('');
  };

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    setMoonsters([]);
    setOffset(0); // Reset to first page
  };

  const handlePrevious = () => {
    if (offset >= LIMIT) {
      setOffset(offset - LIMIT);
    }
  };

  const handleNext = () => {
    if (totalMoonsters && offset + LIMIT < Number(totalMoonsters)) {
      setOffset(offset + LIMIT);
    }
  };

  const handleCapture = async (moonster: MoonsterWithEncounters) => {
    if (!walletState) {
      toast.warning('Connect your wallet');
      return;
    }

    if (netWorkId !== 4202) {
      toast.warning('Please change to Lisk Sepolia Testnet');
      return;
    }

    try {
      const captureMoonster = {
        id: moonster.id,
        name: moonster.name,
        image: moonster.image,
        location: moonster.location,
        chance: moonster.chance,
        evolutionChain: [], 
      };

      const added = addToCapture(captureMoonster);
      if (added) {
        toast.success(`Added ${moonster.name} to hunting grid.`);
      } else {
        toast.warning(`Could not add ${moonster.name} to hunting grid (already added or grid full).`);
      }
    } catch (err) {
      console.error(`Error processing capture for ${moonster.name}:`, err);
      toast.error(`Failed to capture ${moonster.name}.`);
    }
  };

  if (!isMounted || !isCaptureMounted) {
    return null;
  }

  return (
    <div className="max-w-5xl w-full mx-auto">
      <div className="mt-4 relative">
        <input
          type="text"
          placeholder="Search Moonsters by name (e.g., Flarepup)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-2 pr-10 rounded-md bg-gray-800 text-white border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#27af0f]"
        />
        {searchQuery.length > 0 && (
          <button
            onClick={handleClearQuery}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#27af0f] rounded-full p-1"
            aria-label="Clear search"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        )}
      </div>

      {loading ? (
        <div><CryptoPokeSkeleton /></div>
      ) : error ? (
        <div className="text-center text-red-500 bg-red-900/50 p-4 rounded-md">
          {error}
          <div className="mt-4">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 rounded-md bg-[#27af0f] text-white font-medium hover:bg-green-600"
            >
              Refresh
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-4">
            {moonsters
              .filter((moonster) =>
                debouncedQuery
                  ? moonster.name.toLowerCase().includes(debouncedQuery.toLowerCase())
                  : true
              )
              .map((moonster) => (
                <div
                  key={moonster.name}
                  className={cn(
                    'group w-full overflow-hidden relative card h-96 rounded-md shadow-xl flex flex-col justify-end p-4 border border-transparent dark:border-neutral-800',
                    'bg-contain bg-center bg-no-repeat',
                    'before:content-[""] before:absolute before:inset-0 before:bg-[url(https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWlodTF3MjJ3NnJiY3Rlc2J0ZmE0c28yeWoxc3gxY2VtZzA5ejF1NSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/syEfLvksYQnmM/giphy.gif)] before:opacity-0 before:z-[-1]',
                    'hover:bg-[url(https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExbjh6ODFzN211NjMycmhzeW5scjh6anBoM2U3Yjd0NjJvZ3NobnZ5ZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/S4mv3vJ4iFjvq/giphy.gif)]',
                    'hover:after:content-[""] hover:after:absolute hover:after:inset-0 hover:after:bg-black hover:after:opacity-30',
                    'transition-all duration-500'
                  )}
                  style={{
                    backgroundImage: `url(${moonster.image})`,
                  }}
                >
                  <div className="absolute top-4 right-4 flex gap-2 z-10">
                    
                    <IoMdGitCompare
                      className={`my-compare-class h-8 w-8 border-2 border-[#083ac2] rounded-full p-1 bg-black/50 ${comparisonList.some((item) => item.name === moonster.name)
                          ? 'text-pink-700'
                          : 'text-[#0caa68] hover:text-pink-700'
                        }`}
                      onClick={() => addToComparison(moonster.name, moonster.id)} // Pass both name and id
                    />
                    <FaCircle
                      className={`my-capture-class h-8 w-8 border-2 border-[#FFFFFF] rounded-full p-1 bg-black/50 ${captureList.some((p) => p.name === moonster.name)
                          ? 'text-green-100'
                          : 'text-[#f00962] hover:text-green-100'
                        }`}
                      onClick={() => handleCapture(moonster)}
                    />
                    <FaInfoCircle
                      className="my-info-class text-[#fff7ca] h-8 w-8 hover:text-pink-700 border-2 border-[#ccd1cc] rounded-full p-1 bg-black/50"
                      onClick={() => router.push(`/moonster/${moonster.name}`)}
                    />
                  </div>

                  <div className="text relative z-10">
                    <h1 className="font-bold text-xl md:text-3xl text-gray-50 relative capitalize">
                      {moonster.name}
                    </h1>
                    <p className="font-normal text-base text-gray-50 relative my-1">
                      {moonster.description}
                    </p>
                    <p className="font-normal text-sm text-gray-50 relative">
                      <span className="font-semibold">Capture Chance:</span> {moonster.chance}%
                    </p>
                    <p className="font-normal text-sm text-gray-50 relative">
                      <span className="font-semibold">Location:</span> {moonster.location}
                    </p>
                  </div>
                </div>
              ))}
          </div>

          {totalMoonsters && Number(totalMoonsters) > LIMIT && (
            <div className="mt-6 flex justify-center gap-4">
              <button
                onClick={handlePrevious}
                disabled={offset < LIMIT}
                className={cn(
                  'px-4 py-2 rounded-md bg-[#27af0f] text-white font-medium',
                  offset < LIMIT && 'opacity-50 cursor-not-allowed'
                )}
              >
                Previous
              </button>
              <button
                onClick={handleNext}
                disabled={offset + LIMIT >= Number(totalMoonsters)}
                className={cn(
                  'px-4 py-2 rounded-md bg-[#27af0f] text-white font-medium hover:bg-green-600',
                  offset + LIMIT >= Number(totalMoonsters) && 'opacity-50 cursor-not-allowed'
                )}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SearchMondex;