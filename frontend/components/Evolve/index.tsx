'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { MoonstersDetails } from '@/types/moonsters';
import { getMoonsterByName } from '@/actions/getMoonsterData';
import { BackgroundGradient } from '@/components/ui/background-gradient';
import Background from '@/components/Background';
import MenuBarComp from '@/components/Menubar';
import { CryptoMoonSkeleton } from '@/components/Loader';
import DefaultLayout from '@/components/ui/Layout/DefaultLayout';
import Link from 'next/link';

type Props = {
  params: { idOrName: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

const EvolveResultPage = ({ params, searchParams }: Props) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [moonster, setMoonster] = useState<MoonstersDetails | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const idOrName = params.idOrName;
  const hash = Array.isArray(searchParams.hash) ? searchParams.hash[0] : searchParams.hash;

  useEffect(() => {
    console.log('searchParams hash:', hash); // Debug log
    setTransactionHash(hash || 'N/A');
  }, [hash]);

  useEffect(() => {
    const fetchPokemon = async () => {
      if (!idOrName) return;

      try {
        setLoading(true);
        setFetchError(null);
        const normalizedName = idOrName.toLowerCase();
        console.log('Fetching Pokémon with name:', normalizedName); // Debug log
        const MoonstersDetails = await getMoonsterByName(normalizedName);
        console.log('moonster details:', MoonstersDetails); // Debug log
        if (MoonstersDetails) {
          setMoonster(MoonstersDetails);
        } else {
          throw new Error('No Pokémon data returned.');
        }
      } catch (err) {
        const errorMessage = 'Failed to load Pokémon details. Please try again.';
        setFetchError(errorMessage);
        toast.error(errorMessage, { duration: 5000 });
      } finally {
        setLoading(false);
      }
    };

    fetchPokemon();
  }, [idOrName]);

  if (loading) {
    return <CryptoMoonSkeleton />;
  }

  if (fetchError || !moonster) {
    return (
      <DefaultLayout>
        <div className="relative min-h-screen">
          <div className="relative w-full mx-auto p-4">
            <BackgroundGradient className="rounded-[22px] p-2 dark:bg-zinc-900 bg-zinc-600 border-0">
              <Background className="absolute inset-0 -z-10 grid grid-cols-3 gap-8 opacity-15" />
              <MenuBarComp />
              <div className="relative p-4 mt-4">
                <div className="bg-gray-800 rounded-md shadow-xl p-6 border border-neutral-800 text-center">
                  <p className="text-red-400">{fetchError || 'Pokémon data not available.'}</p>
                  {transactionHash && transactionHash !== 'N/A' && (
                    <p className="text-gray-300 mb-2">
                      Transaction Hash:{' '}
                      <Link
                        href={`${process.env.NEXT_PUBLIC_LISK_SEPOLIA_SCAN || 'https://sepolia-blockscout.lisk.com/tx/'}${transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-blue-400 hover:underline break-all"
                      >
                        {transactionHash}
                      </Link>
                    </p>
                  )}
                  <div className="mt-6">
                    <Link href="/poketrain">
                      <Button className="bg-orange-500 text-white rounded-lg px-4 py-2">
                        Back to PokéTrain
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </BackgroundGradient>
          </div>
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      <div className="relative min-h-screen">
        <div className="relative w-full mx-auto p-4">
          <BackgroundGradient className="rounded-[22px] p-2 dark:bg-zinc-900 bg-zinc-600 border-0">
            <Background className="absolute inset-0 -z-10 grid grid-cols-3 gap-8 opacity-15" />
            <MenuBarComp />
            <div className="relative p-4 mt-4">
              <div className="bg-gray-800 rounded-md shadow-xl p-6 border border-neutral-800 text-center">
                <h1 className="text-2xl font-bold text-gray-50 mb-4">Evolution Successful!</h1>
                <p className="text-gray-300 mb-4">
                  Congratulations! Your Pokémon has evolved into{' '}
                  <span className="font-semibold capitalize">{moonster.name}</span>.
                </p>
                <div className="flex justify-center mb-4">
                  <Image
                    src={moonster.image}
                    alt={`${moonster.name} artwork`}
                    width={200}
                    height={200}
                    className="object-contain"
                    placeholder="blur"
                    blurDataURL="/no_image.png"
                  />
                </div>
                <p className="text-gray-300 mb-2">
                  Transaction Hash:{' '}
                  {transactionHash === 'N/A' ? (
                    <span className="font-mono text-sm break-all">{transactionHash}</span>
                  ) : (
                    <Link
                      href={`${process.env.NEXT_PUBLIC_LISK_SEPOLIA_SCAN || 'https://sepolia-blockscout.lisk.com/tx/'}${transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-sm text-blue-400 hover:underline break-all"
                    >
                      {transactionHash}
                    </Link>
                  )}
                </p>
                <div className="mt-6">
                  <Link href="/poketrain">
                    <Button className="bg-orange-500 text-white rounded-lg px-4 py-2">
                      Back to PokéTrain
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </BackgroundGradient>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default EvolveResultPage;