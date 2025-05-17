'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FaInfoCircle } from 'react-icons/fa';
import { Tooltip } from 'react-tooltip';
import { SC_BATTLE_MANAGER, SC_SEASON_MANAGER, SC_USER_MANAGER } from '@/context/constants';
import { MoonstersDetails } from '@/types/moonsters'; // Assuming plural is correct
import { abiBattleManager, abiSeasonManager, abiUserManager } from '@/utils';
import { CryptoMoonSkeleton } from '../Loader';
import MenuBarComp from '../Menubar';
import Background from '../Background';
import { BackgroundGradient } from '../ui/background-gradient';
import { fetchCapturedMoonsters, fetchMoonsterEvolution } from '@/actions/moonsterAction';
import { Button } from '@/components/ui/button';
import { useAction } from '@/context/ActionContext';
import AdminPanel from './adminPanel';
import { useQueryClient } from '@tanstack/react-query';
import EvolutionSkeleton from '@/components/EvolutionSkeleton';
import { getCachedEvolution, setCachedEvolution, loadCache } from '@/utils/evolutionMoonCache'; // Updated import
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '../ui/badge';
import CryptoMoonTrainGuide from './guide';

export interface EvolutionDetails {
  chain: { name: string; image: string; id: number }[]; // Updated to include image
  conditions: {
    from: string;
    to: string;
    trigger: string;
    details: string;
  }[];
}

type EVMAddress = `0x${string}`;
const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_IMAGE_BASE;
function CapturedMoonstersInner() {
  const router = useRouter();
  const { address, isConnected, chainId } = useAccount();
  const chainNetwork = Number(chainId);
  const queryClient = useQueryClient();

  const [networkClient, setNetworkClient] = useState<number | null>(null);
  const { actionEvolve, actionJoinBattle, isActionPending, isActionConfirming, transactionStep } = useAction();
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchingMoonstersDetails, setFetchingMoonstersDetails] = useState<boolean>(false);
  const [reload, setReload] = useState<boolean>(false);
  const [capturedMoonsters, setCapturedMoonsters] = useState<MoonstersDetails[]>([]);
  const [selectedMoonsterId, setSelectedMoonsterId] = useState<number | null>(null);
  const [evolutionData, setEvolutionData] = useState<EvolutionDetails>({ chain: [], conditions: [] });
  const [evolutionLoading, setEvolutionLoading] = useState<boolean>(false);
  const [ownerAddress, setOwnerAddress] = useState<EVMAddress | undefined>(undefined);
  const [isJoinPending, setIsJoinPending] = useState<boolean>(false);
  const [isEvolvePending, setIsEvolvePending] = useState<boolean>(false);
  const [evolutionPositions, setEvolutionPositions] = useState<Map<number, string>>(new Map());
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    loadCache();
  }, []);

  const { data: capturedIds, isLoading: isIdsLoading, error: idsError } = useReadContract({
    abi: abiUserManager,
    address: SC_USER_MANAGER,
    functionName: 'getUserIds',
    args: address ? [address] : undefined,
    chainId: 4202,
  });

  const { data: currentSeasonId } = useReadContract({
    abi: abiSeasonManager,
    address: SC_SEASON_MANAGER,
    functionName: 'getCurrentSeasonId',
    chainId: 4202,
  });

  const seasonDetailsResult = useReadContract({
    abi: abiSeasonManager,
    address: SC_SEASON_MANAGER as EVMAddress,
    functionName: 'getSeason',
    args: [currentSeasonId ?? BigInt(0)],
    query: {
      enabled: !!currentSeasonId && Number(currentSeasonId) > 0,
    },
  });

  const { data: currentRoundId } = useReadContract({
    abi: abiBattleManager,
    address: SC_BATTLE_MANAGER,
    functionName: 'getCurrentRoundId',
    chainId: 4202,
  });

  const { data: battleRound } = useReadContract({
    abi: abiBattleManager,
    address: SC_BATTLE_MANAGER,
    functionName: 'battleRounds',
    args: [currentSeasonId ?? BigInt(0), currentRoundId ?? BigInt(0)],
    chainId: 4202,
    query: {
      enabled: (!!currentRoundId && Number(currentRoundId) > 0) && (!!currentSeasonId && Number(currentSeasonId) > 0),
    },
  });

  const { data: isUserInRound, isFetching: isUserInRoundFetching } = useReadContract({
    abi: abiBattleManager,
    address: SC_BATTLE_MANAGER,
    functionName: 'isUserInRound',
    args: [currentSeasonId ?? BigInt(0), currentRoundId ? BigInt(currentRoundId) : BigInt(0), address as EVMAddress],
    chainId: 4202,
    query: {
      enabled: !!address && (!!currentRoundId && Number(currentRoundId) > 0) && (!!currentSeasonId && Number(currentSeasonId) > 0),
    },
  });

  const { data: moonsterInRoundId } = useReadContract({
    abi: abiBattleManager,
    address: SC_BATTLE_MANAGER,
    functionName: 'getUserMoonsterInRound',
    args: [currentSeasonId ?? BigInt(0), currentRoundId ? BigInt(currentRoundId) : BigInt(0), address as EVMAddress],
    chainId: 4202,
    query: {
      enabled: !!address && (!!currentRoundId && Number(currentRoundId) > 0) && (!!currentSeasonId && Number(currentSeasonId) > 0),
    },
  });

  const { data: owner } = useReadContract({
    abi: abiUserManager,
    address: SC_USER_MANAGER,
    functionName: 'owner',
    chainId: 4202,
  });

  useEffect(() => {
    const checkConnection = async () => {
      if (!address || !isConnected) {
        router.push('/');
        return;
      }
      setNetworkClient(chainNetwork);
      if (chainNetwork !== 4202) {
        router.push('/');
        return;
      }
      setOwnerAddress(owner);
      setIsAdmin((address && owner && address.toLowerCase() === owner.toLowerCase()) as boolean);
      await queryClient.invalidateQueries({
        queryKey: [
          'readContract',
          {
            abi: abiBattleManager,
            address: SC_BATTLE_MANAGER,
            functionName: 'isUserInRound',
            args: [currentSeasonId ?? BigInt(0), currentRoundId ? BigInt(currentRoundId) : BigInt(0), address as EVMAddress],
            chainId: 4202,
          },
        ],
        refetchType: 'active',
      });
    };

    checkConnection();
  }, [address, chainId, isConnected, router, queryClient, currentRoundId, owner]);

  useEffect(() => {
    console.log('isUserInRound state:', { isUserInRound, isUserInRoundFetching, currentRoundId, address });
  }, [isUserInRound, isUserInRoundFetching, currentRoundId, address]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (idsError && idsError.message.includes('returned no data ("0x")')) {
        setCapturedMoonsters([]);
        setEvolutionPositions(new Map());
      } else if (capturedIds && Array.isArray(capturedIds) && capturedIds.length > 0) {
        const ids = capturedIds.map((id) => Number(id));
        setFetchingMoonstersDetails(true);
        const moonstersDetails = await fetchCapturedMoonsters(ids);
        setCapturedMoonsters(moonstersDetails);

        const positions = new Map<number, string>();
        const evoPromises = ids.map(async (id) => {
          const cachedData = getCachedEvolution(id);
          if (cachedData) {
            const index = cachedData.chain.findIndex((evo) => evo.id === id);
            if (index === 0) return { id, position: 'Base' };
            if (index === cachedData.chain.length - 1) return { id, position: 'Final' };
            // if (index > 0) return { id, position: `Stage ${index}` };
            if (index > 0) return { id, position: `Mid` };
            return { id, position: undefined };
          }

          const evoData = await fetchMoonsterEvolution(id);
          setCachedEvolution(id, evoData);
          const index = evoData.chain.findIndex((evo) => evo.id === id);
          if (index === 0) return { id, position: 'Base' };
          if (index === evoData.chain.length - 1) return { id, position: 'Final' };
          // if (index > 0) return { id, position: `Stage ${index}` };
          if (index > 0) return { id, position: `Mid` };
          return { id, position: undefined };
        });

        const results = await Promise.all(evoPromises);
        results.forEach(({ id, position }) => {
          if (position) positions.set(id, position);
        });

        setEvolutionPositions(positions);
      } else {
        setCapturedMoonsters([]);
        setEvolutionPositions(new Map());
      }
    } catch (error) {
      console.error('Error fetching Moonster data:', error);
    } finally {
      setFetchingMoonstersDetails(false);
      setLoading(false);
      setReload(false);
    }
  };

  const handleReloadChild = useCallback(() => {
    router.refresh();
    handleReload();
  }, []);

  const handleReload = () => {
    fetchData();
  };

  useEffect(() => {
    if (isIdsLoading) {
      setLoading(true);
    } else {
      fetchData();
    }
  }, [capturedIds, idsError, isIdsLoading, reload]);

  useEffect(() => {
    if (transactionStep === 'evolveDone' || transactionStep === 'joinDone') {
      console.log('Triggering reload due to:', transactionStep);
      setReload(true);
      setIsJoinPending(false);
      setIsEvolvePending(false);
    }
  }, [transactionStep]);

  useEffect(() => {
    if (transactionStep === 'evolveFail') {
      console.log('Triggering reload due to:', transactionStep);
      setIsJoinPending(false);
      setIsEvolvePending(false);
    }
  }, [transactionStep]);

  useEffect(() => {
    if (selectedMoonsterId && capturedIds && Array.isArray(capturedIds)) {
      const ids = capturedIds.map((id) => Number(id));
      if (!ids.includes(selectedMoonsterId)) {
        setSelectedMoonsterId(null);
        setEvolutionData({ chain: [], conditions: [] });
      }
    }
  }, [capturedIds, selectedMoonsterId]);

  useEffect(() => {
    const fetchEvolution = async () => {
      if (selectedMoonsterId) {
        setEvolutionLoading(true);
        const data = await fetchMoonsterEvolution(selectedMoonsterId);
        setCachedEvolution(selectedMoonsterId, data);
        setEvolutionData(data);
        setEvolutionLoading(false);
      } else {
        setEvolutionData({ chain: [], conditions: [] });
        setEvolutionLoading(false);
      }
    };
    fetchEvolution();
  }, [selectedMoonsterId]);

  const roundState = battleRound?.[0] || '';
  const roundToken = seasonDetailsResult.data?.[5] || '0x0000000000000000000000000000000000000000';

  const getEvolutionDetails = () => {
    if (!selectedMoonsterId) return { canEvolve: false, newId: null, evolvedName: null };
    const currentIndex = evolutionData.chain.findIndex((evo) => evo.id === selectedMoonsterId);
    if (currentIndex === -1 || currentIndex === evolutionData.chain.length - 1) {
      return { canEvolve: false, newId: null, evolvedName: null };
    }
    const nextEvo = evolutionData.chain[currentIndex + 1];
    return { canEvolve: true, newId: nextEvo.id, evolvedName: nextEvo.name };
  };

  const { canEvolve, newId, evolvedName } = getEvolutionDetails();

  const handleEvolve = () => {
    if (selectedMoonsterId && newId && evolvedName) {
      const selectedMoonster = capturedMoonsters.find((m) => m.id === selectedMoonsterId);
      if (selectedMoonster) {
        setIsEvolvePending(true);
        actionEvolve(selectedMoonsterId, newId, selectedMoonster.name, evolvedName);
      }
    }
  };

  const handleJoinBattle = () => {
    if (selectedMoonsterId && currentRoundId) {
      const selectedMoonster = capturedMoonsters.find((m) => m.id === selectedMoonsterId);
      if (selectedMoonster) {
        setIsJoinPending(true);
        actionJoinBattle(Number(currentRoundId), selectedMoonsterId, roundToken as EVMAddress, selectedMoonster.name);
      }
    }
  };

  const isEmptyDataError = idsError && idsError.message.includes('returned no data ("0x")');
  const isMoonsterInRound = (selectedMoonsterId !== null && moonsterInRoundId && Number(moonsterInRoundId) === selectedMoonsterId) as boolean;

  const MoonsterListContent = () => (
    <div className="relative p-0 mt-4">
      {loading || isIdsLoading || reload || fetchingMoonstersDetails ? (
        <CryptoMoonSkeleton />
      ) : isEmptyDataError || capturedMoonsters.length === 0 ? (
        <div className="text-center text-white">
          <p>No Moonsters yet.</p>
          <p>Go to the MoonDex to catch some Moonsters!</p>
        </div>
      ) : idsError ? (
        <div className="text-center text-red-500 bg-red-900/50 p-4 rounded-md">
          {idsError.message || 'Failed to load captured Moonsters'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-md shadow-xl p-4 border border-neutral-800">
            <h2 className="text-xl font-bold text-gray-50 mb-4">Captured Moonsters</h2>
            <div className="grid grid-cols-1 gap-2">
              {capturedMoonsters.map((moonster) => {
                const position = evolutionPositions.get(moonster.id);
                const badgeColor =
                  position === 'Base'
                    ? 'bg-gradient-to-r from-green-400 to-green-600'
                    : position === 'Final'
                      ? 'bg-gradient-to-r from-purple-500 to-purple-700'
                      : 'bg-gradient-to-r from-yellow-400 to-yellow-600';
                return (
                  <div
                    key={moonster.id}
                    className={`p-2 rounded-md transition-colors ${selectedMoonsterId === moonster.id
                      ? 'bg-gray-700 border border-yellow-500'
                      : 'bg-gray-900 hover:bg-gray-700'
                      }`}
                    onClick={() => setSelectedMoonsterId(moonster.id)}
                  >
                    <div className="flex items-center space-x-4">
                      <Image
                        src={`${IMAGE_BASE_URL}${moonster.image}`}
                        alt={`${moonster.name} artwork`}
                        width={50}
                        height={50}
                        className="object-contain"
                        placeholder="blur"
                        blurDataURL="/no_image.png"
                      />
                      <div className="flex items-center space-x-2">
                        <p className="text-gray-50 font-semibold capitalize">{moonster.name}</p>
                        {evolutionPositions.has(moonster.id) ? (
                          <Badge
                            className={`sparkle-badge ${badgeColor}`}
                            title={`Evolution Position: ${position}`}
                          >
                           {isMoonsterInRound ? `${position} ⚔️` : position}
                          </Badge>
                        ) : (
                          <EvolutionSkeleton />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-gray-800 rounded-md shadow-xl p-4 border border-neutral-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-50">Evolution Chain</h2>
              {selectedMoonsterId !== null && (
                <Button
                  onClick={() => setSelectedMoonsterId(null)}
                  className="my-close-class px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                >
                  X
                </Button>
              )}
              <Tooltip anchorSelect=".my-close-class" content="Deselect Moonster" />
            </div>
            {selectedMoonsterId === null ? (
              <div className="text-center text-gray-300">
                <p>Select a Moonster to view its evolution chain.</p>
              </div>
            ) : evolutionLoading ? (
              <CryptoMoonSkeleton />
            ) : evolutionData.chain.length === 0 ? (
              <div className="text-center text-gray-300">
                <p>No evolution data available for this Moonster.</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <p className="text-gray-50 font-semibold mb-2">Evolution Path:</p>
                  <div className="flex items-center space-x-2">
                    {evolutionData.chain.map((evo, index) => {
                      const position = evolutionPositions.get(evo.id);
                      const bgColor =
                        position === 'Base'
                          ? 'bg-gradient-to-r from-green-400 to-green-600'
                          : position === 'Final'
                            ? 'bg-gradient-to-r from-purple-500 to-purple-700'
                            : 'bg-gradient-to-r from-yellow-400 to-yellow-600';
                      return (
                        <div key={evo.id} className="flex items-center">
                          {evolutionPositions.has(evo.id) ? (
                            <span
                              className={`text-gray-50 capitalize ${bgColor} rounded-md px-2 py-1`}
                              title={`Evolution Position: ${position}`}
                            >
                              {evo.name}
                            </span>
                          ) : (
                            <span className="text-gray-50 capitalize flex items-center space-x-2">
                              {evo.name}
                            </span>
                          )}
                          {index < evolutionData.chain.length - 1 && (
                            <span className="text-gray-400 mx-2">→</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-gray-50 font-semibold mb-2">Evolution Conditions:</p>
                  {evolutionData.conditions.length === 0 ? (
                    <p className="text-gray-300">No evolution conditions available.</p>
                  ) : (
                    <ul className="list-disc list-inside text-gray-50">
                      {evolutionData.conditions.map((condition, index) => (
                        <li key={index}>
                          {condition.from} evolves into {condition.to}: {condition.details}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="mt-4 flex justify-center gap-2 items-center">
                  <FaInfoCircle
                    className="my-info-class text-[#fff7ca] h-8 w-8 hover:text-pink-700 border-2 border-[#ccd1cc] rounded-full p-1 bg-black/50"
                    onClick={() => {
                      const selectedMoonster = capturedMoonsters.find((m) => m.id === selectedMoonsterId);
                      if (selectedMoonster) {
                        router.push(`/moonster/${selectedMoonster.name}`);
                      }
                    }}
                    aria-label="View Moonster Details"
                  />
                  <Tooltip anchorSelect=".my-info-class" content="View Moonster Details" />
                  <Button
                    className="bg-gradient-to-br bg-yellow-600"
                    onClick={handleEvolve}
                    disabled={
                      !canEvolve ||
                      isActionPending ||
                      isActionConfirming ||
                      transactionStep === 'approveEvolution' ||
                      transactionStep === 'evolve' ||
                      isMoonsterInRound ||
                      isEvolvePending
                    }
                  >
                    Evolve
                  </Button>
                </div>
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-gray-50 mb-4">Battle Ground</h2>
                  <div className="flex items-center space-x-2">
                    <p className="text-gray-50 text-sm mb-2">
                      {currentRoundId && Number(currentRoundId) > 0
                        ? `Round State: ${roundState}`
                        : 'No active round available.'}
                    </p>
                    <Button
                      className="bg-gradient-to-br bg-yellow-600"
                      onClick={handleJoinBattle}
                      disabled={
                        !selectedMoonsterId ||
                        !currentRoundId ||
                        Number(currentRoundId) === 0 ||
                        roundState !== 'regis' ||
                        isActionPending ||
                        isActionConfirming ||
                        transactionStep === 'approveJoin' ||
                        transactionStep === 'join' ||
                        transactionStep === 'joinDone' ||
                        isUserInRound === true ||
                        isJoinPending
                      }
                    >
                      {currentRoundId && Number(currentRoundId) > 0
                        ? `Join Round ${Number(currentRoundId)}`
                        : 'No Active Round'}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative min-h-screen">
      <style jsx>{`
        .sparkle-badge {
          position: relative;
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          font-weight: 600;
          color: white;
          text-transform: uppercase;
          font-size: 0.75rem;
        }
        .sparkle-badge::before {
          content: '';
          position: absolute;
          inset: 0;
          background: inherit;
          animation: sparkle 2s infinite;
          z-index: -1;
          border-radius: 0.375rem;
        }
        @keyframes sparkle {
          0%, 100% {
            opacity: 0.8;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
        }
      `}</style>
      <div className="relative w-full mx-auto p-4">
        <BackgroundGradient className="rounded-[22px] p-2 dark:bg-zinc-900 bg-zinc-600 border-0">
          <Background className="absolute inset-0 -z-10 grid grid-cols-3 gap-8 opacity-15" />
          <MenuBarComp />
          <CryptoMoonTrainGuide />

          {isAdmin ? (
            <>
              <p className="text-gray-50 text-center mb-4">
                You are the owner of this contract. You can manage the contract from here.
              </p>
              <Tabs defaultValue="panel" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="panel">Panel</TabsTrigger>
                  <TabsTrigger value="moonster">Moonster</TabsTrigger>
                </TabsList>
                <TabsContent value="panel">
                  <AdminPanel onReload={handleReloadChild} />
                </TabsContent>
                <TabsContent value="moonster">
                  <MoonsterListContent />
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <MoonsterListContent />
          )}
        </BackgroundGradient>
      </div>
    </div>
  );
}

export default function CapturedMoonsters() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground"><CryptoMoonSkeleton /></div>}>
      <CapturedMoonstersInner />
    </Suspense>
  );
}