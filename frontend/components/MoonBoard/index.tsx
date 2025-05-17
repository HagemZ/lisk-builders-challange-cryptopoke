'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { SC_BATTLE_MANAGER, SC_SEASON_MANAGER, SC_USER_MANAGER } from '@/context/constants';
import { isAddress } from 'viem';
import { abiIDRXCP, abiSeasonManager, abiBattleManager, abiUserManager } from '@/utils';
import { fetchCapturedMoonsters } from '@/actions/moonsterAction';
import { MoonstersDetails } from '@/types/moonsters';
import { CryptoPokeSkeleton } from '../Loader';
import MenuBarComp from '../Menubar';
import Background from '../Background';
import { BackgroundGradient } from '../ui/background-gradient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CryptoMoonBoardGuide from './guide';

type EVMAddress = `0x${string}`;
const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_IMAGE_BASE;

interface RoundParticipant {
  address: EVMAddress;
  pokemonId: number;
}

interface PairMatch {
  player1: EVMAddress;
  id1: number;
  player2: EVMAddress;
  id2: number;
  winner: EVMAddress;
  roundId: number;
}

interface LeaderboardEntry {
  user: EVMAddress;
  wins: number;
  draws: number;
  lossesOrOrphans: number;
  points: number;
}

const shortenAddress = (address: string): string => {
  if (!address || address.length < 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

const BLOCKSCOUT_URL = process.env.NEXT_PUBLIC_LISK_SEPOLIA_BLOCKEX || 'https://sepolia-blockscout.lisk.com/address/';
const BLOCKSCOUT_TRX_URL = process.env.NEXT_PUBLIC_LISK_SEPOLIA_SCAN || 'https://sepolia-blockscout.lisk.com/tx/';

const MoonBoard: React.FC = () => {
  const { address, chainId, isConnected } = useAccount();
  const router = useRouter();
  const [networkClient, setNetworkClient] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [moonsterData, setMoonsterData] = useState<Map<number, MoonstersDetails>>(new Map());
  const [pairMoonsterData, setPairMoonsterData] = useState<Map<number, MoonstersDetails>>(new Map());
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [offset, setOffset] = useState<number>(0);
  const [limit, setLimit] = useState<number>(10);

  useEffect(() => {
    const checkConnection = async () => {
      if (!address || !isConnected) {
        router.push('/');
        return;
      }
      setNetworkClient(Number(chainId));
      if (Number(chainId) !== 4202) {
        router.push('/');
        return;
      }
      setLoading(false);
    };
    checkConnection();
  }, [address, chainId, isConnected, router]);

  // Fetch current season ID
  const { data: currentSeasonId, isLoading: isCurrentSeasonLoading } = useReadContract({
    abi: abiSeasonManager,
    address: SC_SEASON_MANAGER,
    functionName: 'getCurrentSeasonId',
    chainId: 4202,
    query: { enabled: !!networkClient && networkClient === 4202 },
  });

  // Fetch season details for the selected or current season
  const effectiveSeasonId = selectedSeasonId !== null ? BigInt(selectedSeasonId) : currentSeasonId ?? BigInt(0);
  const seasonDetailsResult = useReadContract({
    abi: abiSeasonManager,
    address: SC_SEASON_MANAGER as EVMAddress,
    functionName: 'getSeason',
    args: [effectiveSeasonId],
    chainId: 4202,
    query: { enabled: !!effectiveSeasonId && Number(effectiveSeasonId) > 0 },
  });

  // Fetch season label
  const seasonLabelResult = useReadContract({
    abi: abiSeasonManager,
    address: SC_SEASON_MANAGER,
    functionName: 'getSeasonLabel',
    args: [effectiveSeasonId],
    chainId: 4202,
    query: { enabled: !!effectiveSeasonId && Number(effectiveSeasonId) > 0 },
  });

  // Fetch current round ID
  const roundResult = useReadContract({
    abi: abiBattleManager,
    address: SC_BATTLE_MANAGER,
    functionName: 'getCurrentRoundId',
    chainId: 4202,
  });

  // Fetch max round ID for the selected or current season
  const maxRoundsResult = useReadContract({
    abi: abiBattleManager,
    address: SC_BATTLE_MANAGER,
    functionName: 'getMaxRoundIdForSeason',
    args: [effectiveSeasonId],
    chainId: 4202,
    query: { enabled: !!effectiveSeasonId && Number(effectiveSeasonId) > 0 },
  });

  // Set default selectedRoundId to current round ID when season changes or on initial load
  useEffect(() => {
    if (roundResult.data && !selectedRoundId && maxRoundsResult.data) {
      const currentRound = Number(roundResult.data);
      const maxRound = Number(maxRoundsResult.data);
      if (currentRound > 0 && currentRound <= maxRound) {
        setSelectedRoundId(currentRound);
      } else {
        setSelectedRoundId(maxRound > 0 ? maxRound : null);
      }
    }
  }, [roundResult.data, maxRoundsResult.data, selectedSeasonId]);

  // Define effective round ID
  const effectiveRoundId = selectedRoundId !== null ? BigInt(selectedRoundId) : roundResult.data && Number(roundResult.data) > 0 ? roundResult.data : BigInt(1);

  // Fetch battle round state
  const battleRoundResult = useReadContract({
    abi: abiBattleManager,
    address: SC_BATTLE_MANAGER,
    functionName: 'battleRounds',
    args: [effectiveSeasonId, effectiveRoundId],
    chainId: 4202,
    query: {
      enabled: !!effectiveSeasonId && Number(effectiveSeasonId) > 0 && !!effectiveRoundId && Number(effectiveRoundId) > 0 && !!maxRoundsResult.data && Number(effectiveRoundId) <= Number(maxRoundsResult.data),
    },
  });

  // Fetch round participants
  const roundInfoResult = useReadContract({
    abi: abiBattleManager,
    address: SC_BATTLE_MANAGER,
    functionName: 'getRoundInfo',
    args: [effectiveSeasonId, effectiveRoundId, true],
    chainId: 4202,
    query: {
      enabled: !!effectiveSeasonId && Number(effectiveSeasonId) > 0 && !!effectiveRoundId && Number(effectiveRoundId) > 0 && !!maxRoundsResult.data && Number(effectiveRoundId) <= Number(maxRoundsResult.data),
    },
  });

  // Fetch user's Moonster in the round
  const userPokemonResult = useReadContract({
    abi: abiBattleManager,
    address: SC_BATTLE_MANAGER,
    functionName: 'getUserMoonsterInRound',
    args: [effectiveSeasonId, effectiveRoundId, address as EVMAddress],
    chainId: 4202,
    query: {
      enabled: !!address && !!effectiveSeasonId && Number(effectiveSeasonId) > 0 && !!effectiveRoundId && Number(effectiveRoundId) > 0 && !!maxRoundsResult.data && Number(effectiveRoundId) <= Number(maxRoundsResult.data),
    },
  });

  // Fetch matches for the season and selected round
  const pairMatchResult = useReadContract({
    abi: abiBattleManager,
    address: SC_BATTLE_MANAGER,
    functionName: 'getMatchesForSeason',
    args: [effectiveSeasonId, effectiveRoundId, effectiveRoundId],
    chainId: 4202,
    query: {
      enabled: !!effectiveSeasonId && Number(effectiveSeasonId) > 0 && !!effectiveRoundId && Number(effectiveRoundId) > 0 && !!maxRoundsResult.data && Number(effectiveRoundId) <= Number(maxRoundsResult.data),
    },
  });

  // console.log("pairMatchResult : ", pairMatchResult)

  // Fetch reward hash for the round
  const hashRewardMatchResult = useReadContract({
    abi: abiBattleManager,
    address: SC_BATTLE_MANAGER,
    functionName: 'getRewardHash',
    args: [effectiveRoundId],
    chainId: 4202,
    query: {
      enabled: !!effectiveSeasonId && Number(effectiveSeasonId) > 0 && !!effectiveRoundId && Number(effectiveRoundId) > 0 && battleRoundResult.data?.[0] === 'completed' && !!maxRoundsResult.data && Number(effectiveRoundId) <= Number(maxRoundsResult.data),
    },
  });

  // Fetch season reward hash
  const hashRewardSeasonResult = useReadContract({
    abi: abiSeasonManager,
    address: SC_SEASON_MANAGER,
    functionName: 'getSeasonRewardHash',
    args: [effectiveSeasonId],
    chainId: 4202,
    query: { enabled: !!effectiveSeasonId && Number(effectiveSeasonId) > 0 && seasonDetailsResult.data?.[0] === 'ended' },
  });

  // Fetch round recap
  const roundRecapInfoResult = useReadContract({
    abi: abiBattleManager,
    address: SC_BATTLE_MANAGER,
    functionName: 'getRoundRecap',
    args: [effectiveSeasonId, effectiveRoundId],
    chainId: 4202,
    query: {
      enabled: !!effectiveSeasonId && Number(effectiveSeasonId) > 0 && !!effectiveRoundId && Number(effectiveRoundId) > 0 && battleRoundResult.data?.[0] === 'completed' && !!maxRoundsResult.data && Number(effectiveRoundId) <= Number(maxRoundsResult.data),
    },
  });

  console.log('roundRecapInfoResult :', roundRecapInfoResult)

  // Extract winners from round recap
  const winners: EVMAddress[] = roundRecapInfoResult.data
    ? (roundRecapInfoResult.data[4] as EVMAddress[]).filter(
      (winner) => winner !== '0x0000000000000000000000000000000000000000'
    )
    : [];

  // Fetch token symbol
  const tokenSymbolResult = useReadContract({
    abi: abiIDRXCP,
    address: seasonDetailsResult.data?.[5] as EVMAddress,
    functionName: 'symbol',
    chainId: 4202,
    query: {
      enabled: !!seasonDetailsResult.data?.[5] && seasonDetailsResult.data?.[5] !== '0x0000000000000000000000000000000000000000' && !!effectiveSeasonId && Number(effectiveSeasonId) > 0,
    },
  });

  // Fetch token decimals
  const decimalTokenRewards = useReadContract({
    abi: abiUserManager,
    address: SC_USER_MANAGER,
    functionName: 'getDecimals',
    args: [seasonDetailsResult.data?.[5] as EVMAddress],
    chainId: 4202,
    query: {
      enabled: !!seasonDetailsResult.data?.[5] && seasonDetailsResult.data?.[5] !== '0x0000000000000000000000000000000000000000' && !!effectiveSeasonId && Number(effectiveSeasonId) > 0,
    },
  });

  // Fetch season rewards
  const seasonRewardsResult = useReadContract({
    abi: abiSeasonManager,
    address: SC_SEASON_MANAGER as EVMAddress,
    functionName: 'getCurrentSeasonRewards',
    chainId: 4202,
    query: {
      enabled: !!seasonDetailsResult.data?.[5] && seasonDetailsResult.data?.[5] !== '0x0000000000000000000000000000000000000000' && !!effectiveSeasonId && Number(effectiveSeasonId) > 0,
    },
  });

  const currentSeasonRewards = useMemo(() => {
    const decimals = decimalTokenRewards.data ?? BigInt(0);
    const rawRewards = seasonRewardsResult.data ?? BigInt(0);
    return decimals > 0 ? Number(rawRewards) / Math.pow(10, Number(decimals)) : Number(rawRewards);
  }, [decimalTokenRewards.data, seasonRewardsResult.data]);

  const participants: RoundParticipant[] = useMemo(() => {
    if (!roundInfoResult.data) return [];
    const [addresses, moonsterIds] = roundInfoResult.data as unknown as [EVMAddress[], bigint[]];
    return addresses
      .map((addr, index) => ({
        address: addr,
        pokemonId: Number(moonsterIds[index]),
      }))
      .filter((p) => isAddress(p.address) && p.pokemonId > 0);
  }, [roundInfoResult.data]);

  const pairMatches: PairMatch[] = useMemo(() => {
    if (!pairMatchResult.data) return [];
    const matchesData = (pairMatchResult.data as readonly {
      roundId: bigint;
      state: string;
      participants: readonly EVMAddress[];
      moonsterIds: readonly bigint[];
      winner: EVMAddress;
      orphan: `0x${string}`;
    }[]).map(match => ({
      ...match,
      participants: [...match.participants],
      moonsterIds: [...match.moonsterIds],
      orphan: match.orphan !== '0x0000000000000000000000000000000000000000',
    }));
    const allMatches: PairMatch[] = [];
    matchesData.forEach((round) => {
      const participants = round.participants;
      const moonsterIds = round.moonsterIds.map(id => Number(id));
      for (let i = 0; i < participants.length; i += 2) {
        if (i + 1 < participants.length) {
          allMatches.push({
            player1: participants[i],
            id1: moonsterIds[i],
            player2: participants[i + 1],
            id2: moonsterIds[i + 1],
            winner: round.winner,
            roundId: Number(round.roundId),
          });
        }
      }
    });
    return allMatches.filter((match) => match.player1 && match.player2 && match.id1 > 0 && match.id2 > 0);
  }, [pairMatchResult.data]);

  useEffect(() => {
    const fetchPokemonData = async () => {
      if (participants.length === 0) {
        setMoonsterData(new Map());
        return;
      }
      setLoading(true);
      try {
        const ids = participants.map((p) => p.pokemonId);
        const MoonstersDetails = await fetchCapturedMoonsters(ids);
        const newPokemonData = new Map<number, MoonstersDetails>();
        MoonstersDetails.forEach((pokemon) => newPokemonData.set(pokemon.id, pokemon));
        setMoonsterData(newPokemonData);
      } catch (error) {
        console.error('Error fetching Moonster data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPokemonData();
  }, [participants]);

  useEffect(() => {
    const fetchPairPokemonData = async () => {
      if (pairMatches.length === 0) {
        setPairMoonsterData(new Map());
        return;
      }
      setLoading(true);
      try {
        const ids = [...pairMatches.map((m) => m.id1), ...pairMatches.map((m) => m.id2)];
        const MoonstersDetails = await fetchCapturedMoonsters(ids);
        const newPokemonData = new Map<number, MoonstersDetails>();
        MoonstersDetails.forEach((pokemon) => newPokemonData.set(pokemon.id, pokemon));
        setPairMoonsterData(newPokemonData);
      } catch (error) {
        console.error('Error fetching pair Moonster data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPairPokemonData();
  }, [pairMatches]);

  const leaderboardResult = useReadContract({
    abi: abiSeasonManager,
    address: SC_SEASON_MANAGER,
    functionName: 'getLeaderboard',
    args: [effectiveSeasonId, BigInt(offset), BigInt(limit)],
    chainId: 4202,
    query: { enabled: !!effectiveSeasonId && Number(effectiveSeasonId) > 0 },
  });

  const leaderboard: LeaderboardEntry[] = useMemo(() => {
    if (!leaderboardResult.data) return [];
    return (leaderboardResult.data as readonly {
      user: EVMAddress;
      wins: bigint;
      draws: bigint;
      lossesOrOrphans: bigint;
      points: bigint;
    }[]).map(entry => ({
      user: entry.user,
      wins: Number(entry.wins),
      draws: Number(entry.draws),
      lossesOrOrphans: Number(entry.lossesOrOrphans),
      points: Number(entry.points),
    }));
  }, [leaderboardResult.data]);

  const roundState = battleRoundResult.data?.[0] || '';
  const roundToken = seasonDetailsResult.data?.[5] || '0x0000000000000000000000000000000000000000';
  const userPokemonId = userPokemonResult.data ? Number(userPokemonResult.data) : null;
  const seasonState = seasonDetailsResult.data?.[0] || '';
  const seasonLabel = seasonLabelResult.data || '';

  // Calculate valid round options
  const maxRound = maxRoundsResult.data ? Number(maxRoundsResult.data) : 0;
  const roundOptions = maxRound > 0 ? Array.from({ length: maxRound }, (_, i) => maxRound - i).filter(round => round > 0) : [];

  return (
    <div className="relative min-h-screen">
      <div className="relative w-full mx-auto p-4">
        <BackgroundGradient className="rounded-[22px] p-2 dark:bg-zinc-900 bg-zinc-600 border-0">
          <Background className="absolute inset-0 -z-10 grid grid-cols-3 gap-8 opacity-15" />
          <MenuBarComp />
          <CryptoMoonBoardGuide />
          <div className="max-w-5xl w-full mx-auto p-4">
            <div className="bg-gray-800 rounded-md shadow-xl p-4 border border-neutral-800 mb-4">
              <h2 className="text-2xl font-bold text-white mb-4">MoonBoard</h2>
              <p className="text-gray-50">
                <span className="font-semibold">Current Season:</span> {seasonLabel || 'No Info'}
              </p>
              <p className="text-gray-50 mt-2">
                <span className="font-semibold">Current Season Prize Pool:</span>{' '}
                {seasonRewardsResult.error ? (
                  `Error fetching prize pool: ${seasonRewardsResult.error.message}`
                ) : currentSeasonRewards !== undefined && currentSeasonRewards !== null ? (
                  <span className="inline-flex items-center">
                    {Number(currentSeasonRewards)}{' '}
                    <Image
                      src="/tokens/26732.png"
                      alt="IDRX"
                      height={20}
                      width={20}
                      className="ml-2"
                    />
                  </span>
                ) : (
                  '0 (No Rewards Available)'
                )}
              </p>
              {seasonState === 'ended' && (
                <p className="text-gray-50 mt-2">
                  <span className="font-semibold">Rewards:</span>{' '}
                  {hashRewardSeasonResult.error
                    ? `Error fetching rewards link: ${hashRewardSeasonResult.error.message}`
                    : hashRewardSeasonResult.data && seasonState === 'ended'
                      ? (
                        <a
                          href={`${BLOCKSCOUT_TRX_URL}${hashRewardSeasonResult.data}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline"
                        >
                          {shortenAddress(hashRewardSeasonResult.data as string)}
                        </a>
                      )
                      : 'No rewards link available (state not ended)'}
                </p>
              )}
              <p className="text-gray-50 mt-2">
                <span className="font-semibold">Current Round ID:</span>{' '}
                {roundResult.error
                  ? 'Error fetching round'
                  : roundResult.data !== undefined
                    ? Number(roundResult.data)
                    : 'No Round Created'}
              </p>
              {/* <p className="text-gray-50 mt-2">
                <span className="font-semibold">Maximum Round ID for Season {(selectedSeasonId ?? Number(currentSeasonId)) || 'N/A'}:</span>{' '}
                {maxRoundsResult.error
                  ? `Error: ${maxRoundsResult.error.message}`
                  : maxRoundsResult.isLoading
                    ? 'Loading...'
                    : maxRound > 0
                      ? maxRound
                      : 'No Rounds Yet'}
              </p> */}
              <div className="mt-4 flex flex-wrap gap-4">
                <div>
                  <label htmlFor="seasonSelect" className="text-gray-50 mr-2">
                    Select Season:
                  </label>
                  <select
                    id="seasonSelect"
                    value={selectedSeasonId ?? ''}
                    onChange={(e) => {
                      const value = e.target.value ? Number(e.target.value) : null;
                      setSelectedSeasonId(value);
                      setSelectedRoundId(null);
                    }}
                    className="p-2 bg-gray-700 text-white rounded-md"
                    disabled={isCurrentSeasonLoading}
                  >
                    <option value="">
                      {isCurrentSeasonLoading
                        ? 'Loading Season...'
                        : `Current Season (${currentSeasonId ? Number(currentSeasonId) : 'N/A'})`}
                    </option>
                    {currentSeasonId &&
                      Array.from({ length: Number(currentSeasonId) }, (_, i) => Number(currentSeasonId) - i)
                        .filter((season) => season >= 1)
                        .map((season) => (
                          <option key={season} value={season}>
                            Season {season}
                          </option>
                        ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="roundSelect" className="text-gray-50 mr-2">
                    Select Round:
                  </label>
                  <select
                    id="roundSelect"
                    value={selectedRoundId ?? ''}
                    onChange={(e) => {
                      const value = e.target.value ? Number(e.target.value) : null;
                      setSelectedRoundId(value);
                    }}
                    className="p-2 bg-gray-700 text-white rounded-md"
                    disabled={maxRoundsResult.isLoading || maxRound === 0}
                  >
                    <option value="">
                      {maxRoundsResult.isLoading ? 'Loading Rounds...' : maxRound === 0 ? 'No Rounds Available' : 'Select Round'}
                    </option>
                    {roundOptions.map((round) => (
                      <option key={round} value={round}>
                        Round {round}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            {loading || isCurrentSeasonLoading || maxRoundsResult.isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, index) => (
                  <CryptoPokeSkeleton key={index} />
                ))}
              </div>
            ) : (
              <>
                <div className="bg-gray-800 rounded-md shadow-xl p-4 border border-neutral-800 mb-4">
                  <p className="text-gray-50">
                    <span className="font-semibold">Selected Season ID:</span>{' '}
                    {selectedSeasonId !== null ? selectedSeasonId : Number(currentSeasonId) || 'No Season'}
                  </p>
                  <p className="text-gray-50 mt-2">
                    <span className="font-semibold">Selected Round:</span>{' '}
                    {selectedRoundId !== null ? `Round ${selectedRoundId}` : roundResult.data ? `Round ${Number(roundResult.data)}` : 'No Round Selected'}
                  </p>
                  <p className="text-gray-50 mt-2">
                    <span className="font-semibold">Round State:</span>{' '}
                    {battleRoundResult.error
                      ? 'Error fetching round state'
                      : effectiveRoundId && Number(effectiveRoundId) > 0
                        ? roundState || 'Unknown'
                        : 'No Round Selected'}
                  </p>
                  <p className="text-gray-50 mt-2">
                    <span className="font-semibold">Round Token:</span>{' '}
                    {battleRoundResult.error
                      ? 'Error fetching round token'
                      : effectiveRoundId && Number(effectiveRoundId) > 0
                        ? (
                          <a
                            href={`${BLOCKSCOUT_URL}${roundToken}?tab=contract`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline"
                          >
                            {tokenSymbolResult.data
                              ? `${tokenSymbolResult.data} (${shortenAddress(roundToken)})`
                              : tokenSymbolResult.error
                                ? 'Error fetching token symbol'
                                : shortenAddress(roundToken)}
                          </a>
                        )
                        : 'None'}
                  </p>
                  <p className="text-gray-50 mt-2">
                    <span className="font-semibold">Season State:</span>{' '}
                    {seasonDetailsResult.error
                      ? 'Error fetching season state'
                      : seasonState || 'No Season'}
                  </p>
                  <p className="text-gray-50 mt-2">
                    <span className="font-semibold">Rewards:</span>{' '}
                    {hashRewardMatchResult.error
                      ? `Error fetching rewards link: ${hashRewardMatchResult.error.message}`
                      : hashRewardMatchResult.data && roundState === 'completed'
                        ? (
                          <a
                            href={`${BLOCKSCOUT_TRX_URL}${hashRewardMatchResult.data}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline"
                          >
                            {shortenAddress(hashRewardMatchResult.data as string)}
                          </a>
                        )
                        : 'No rewards link available (Round not completed)'}
                  </p>
                </div>
                <Tabs defaultValue="participants" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-zinc-400 text-muted-foreground">
                    <TabsTrigger value="participants">Participants</TabsTrigger>
                    <TabsTrigger value="matches">Matches</TabsTrigger>
                    <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
                  </TabsList>
                  <TabsContent value="participants">
                    <div className="bg-gray-800 rounded-md shadow-xl p-4 border border-neutral-800 mb-4">
                      <h3 className="text-xl font-bold text-gray-50 mb-4">Round Participants</h3>
                      {roundInfoResult.isLoading ? (
                        <div className="space-y-2">
                          {[...Array(3)].map((_, index) => (
                            <CryptoPokeSkeleton key={index} />
                          ))}
                        </div>
                      ) : roundInfoResult.error ? (
                        <p className="text-red-500">
                          Error fetching participants: {roundInfoResult.error.message}
                        </p>
                      ) : participants.length === 0 ? (
                        <p className="text-gray-400">No Participants</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full table-auto text-gray-50">
                            <thead>
                              <tr className="bg-gray-700">
                                <th className="px-4 py-2 text-left">Trainer</th>
                                <th className="px-4 py-2 text-left">Moonster Name</th>
                                <th className="px-4 py-2 text-left">Image</th>
                              </tr>
                            </thead>
                            <tbody>
                              {participants.map((participant, index) => {
                                const pokemon = moonsterData.get(participant.pokemonId);
                                const isCurrentUserPokemon =
                                  address &&
                                  participant.address.toLowerCase() === address.toLowerCase() &&
                                  userPokemonId !== null &&
                                  participant.pokemonId === userPokemonId;
                                const isWinner = winners.some(
                                  (winner) => winner.toLowerCase() === participant.address.toLowerCase()
                                );
                                return (
                                  <tr
                                    key={`${participant.address}-${participant.pokemonId}`}
                                    className={`border-t border-gray-700 ${isCurrentUserPokemon ? 'bg-yellow-600/30 border-yellow-500' : ''}`}
                                  >
                                    <td className="px-4 py-2">
                                      {shortenAddress(participant.address)}
                                      {isWinner && <span className="text-yellow-400">✨</span>}
                                    </td>
                                    <td className="px-4 py-2 capitalize">
                                      {pokemon ? pokemon.name : 'Loading...'}
                                    </td>
                                    <td className="px-4 py-2">
                                      {pokemon ? (
                                        <Image
                                        src={`${IMAGE_BASE_URL}${pokemon.image}`}
                                          alt={`${pokemon.name} artwork`}
                                          width={50}
                                          height={50}
                                          className="object-contain"
                                          placeholder="blur"
                                          blurDataURL="/no_image.png"
                                        />
                                      ) : (
                                        <div className="h-12 w-12 rounded-md bg-gray-600/50 animate-pulse" />
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          {/* <table className="w-full table-auto text-gray-50">
                            <thead>
                              <tr className="bg-gray-700">
                                <th className="px-4 py-2 text-left">Trainer</th>
                                <th className="px-4 py-2 text-left">Moonster Name</th>
                                <th className="px-4 py-2 text-left">Image</th>
                              </tr>
                            </thead>
                            <tbody>
                              {participants.map((participant, index) => {
                                const pokemon = moonsterData.get(participant.pokemonId);
                                const isCurrentUserPokemon =
                                  address &&
                                  participant.address.toLowerCase() === address.toLowerCase() &&
                                  userPokemonId !== null &&
                                  participant.pokemonId === userPokemonId;
                                return (
                                  <tr
                                    key={`${participant.address}-${participant.pokemonId}`}
                                    className={`border-t border-gray-700 ${isCurrentUserPokemon ? 'bg-yellow-600/30 border-yellow-500' : ''}`}
                                  >
                                    <td className="px-4 py-2">
                                      {shortenAddress(participant.address)}
                                    </td>
                                    <td className="px-4 py-2 capitalize">
                                      {pokemon ? pokemon.name : 'Loading...'}
                                    </td>
                                    <td className="px-4 py-2">
                                      {pokemon ? (
                                        <Image
                                          src={pokemon.image}
                                          alt={`${pokemon.name} artwork`}
                                          width={50}
                                          height={50}
                                          className="object-contain"
                                          placeholder="blur"
                                          blurDataURL="/no_image.png"
                                        />
                                      ) : (
                                        <div className="h-12 w-12 rounded-md bg-gray-600/50 animate-pulse" />
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table> */}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="matches">
                    <div className="bg-gray-800 rounded-md shadow-xl p-4 border border-neutral-800 mb-4">
                      <h3 className="text-xl font-bold text-gray-50 mb-4">Pair Matches</h3>
                      {roundState === 'regis' ? (
                        <p className="text-gray-400">No Matches (Round in Registration)</p>
                      ) : roundState === 'completed' ? (
                        roundRecapInfoResult.isLoading ? (
                          <div className="space-y-2">
                            {[...Array(2)].map((_, index) => (
                              <CryptoPokeSkeleton key={index} />
                            ))}
                          </div>
                        ) : roundRecapInfoResult.error ? (
                          <p className="text-red-500">
                            Error fetching round recap: {roundRecapInfoResult.error.message}
                          </p>
                        ) : !roundRecapInfoResult.data || roundRecapInfoResult.data[0].length === 0 ? (
                          <p className="text-gray-400">No Matches</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full table-auto text-gray-50">
                              <thead>
                                <tr className="bg-gray-700">
                                  <th className="px-4 py-2 text-left">Round</th>
                                  <th className="px-4 py-2 text-left">Trainer 1</th>
                                  <th className="px-4 py-2 text-left">Moonster 1</th>
                                  <th className="px-4 py-2 text-left">Image</th>
                                  <th className="px-4 py-2 text-left">vs</th>
                                  <th className="px-4 py-2 text-left">Trainer 2</th>
                                  <th className="px-4 py-2 text-left">Moonster 2</th>
                                  <th className="px-4 py-2 text-left">Image</th>
                                  <th className="px-4 py-2 text-left">Winner</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  const [players1, ids1, players2, ids2, winners] = roundRecapInfoResult.data as [
                                    EVMAddress[],
                                    bigint[],
                                    EVMAddress[],
                                    bigint[],
                                    EVMAddress[]
                                  ];
                                  const recapMatches = players1.map((player1, index) => ({
                                    player1,
                                    id1: Number(ids1[index]),
                                    player2: players2[index],
                                    id2: Number(ids2[index]),
                                    winner: winners[index],
                                    roundId: Number(effectiveRoundId),
                                  })).filter((match) => match.player1 && match.player2 && match.id1 > 0 && match.id2 > 0);
                                  return recapMatches.map((match, index) => {
                                    const pokemon1 = pairMoonsterData.get(match.id1);
                                    const pokemon2 = pairMoonsterData.get(match.id2);
                                    const isWinnerTBD = match.winner === '0x0000000000000000000000000000000000000000';
                                    const isCurrentUserPlayer1 =
                                      address && match.player1.toLowerCase() === address.toLowerCase();
                                    const isCurrentUserPlayer2 =
                                      address && match.player2.toLowerCase() === address.toLowerCase();
                                    const isPlayer1Winner =
                                      !isWinnerTBD && match.winner.toLowerCase() === match.player1.toLowerCase();
                                    const isPlayer2Winner =
                                      !isWinnerTBD && match.winner.toLowerCase() === match.player2.toLowerCase();
                                    return (
                                      <tr
                                        key={index}
                                        className={`border-t border-gray-700 ${isCurrentUserPlayer1 || isCurrentUserPlayer2 ? 'bg-yellow-600/30 border-yellow-500' : ''}`}
                                      >
                                        <td className="px-4 py-2">{match.roundId}</td>
                                        <td className="px-4 py-2">
                                          {shortenAddress(match.player1)}
                                          {isPlayer1Winner && <span className="text-yellow-400">✨</span>}
                                        </td>
                                        <td className="px-4 py-2 capitalize">
                                          {pokemon1 ? pokemon1.name : 'Loading...'} (#{match.id1})
                                        </td>
                                        <td className="px-4 py-2">
                                          {pokemon1 ? (
                                            <Image
                                            src={`${IMAGE_BASE_URL}${pokemon1.image}`}
                                              alt={`${pokemon1.name} artwork`}
                                              width={50}
                                              height={50}
                                              className="object-contain"
                                              placeholder="blur"
                                              blurDataURL="/no_image.png"
                                            />
                                          ) : (
                                            <div className="h-12 w-12 rounded-md bg-gray-600/50 animate-pulse" />
                                          )}
                                        </td>
                                        <td className="px-4 py-2 text-center text-yellow-400 font-bold">vs</td>
                                        <td className="px-4 py-2">
                                          {shortenAddress(match.player2)}
                                          {isPlayer2Winner && <span className="text-yellow-400">✨</span>}
                                        </td>
                                        <td className="px-4 py-2 capitalize">
                                          {pokemon2 ? pokemon2.name : 'Loading...'} (#{match.id2})
                                        </td>
                                        <td className="px-4 py-2">
                                          {pokemon2 ? (
                                            <Image
                                            src={`${IMAGE_BASE_URL}${pokemon2.image}`}
                                              alt={`${pokemon2.name} artwork`}
                                              width={50}
                                              height={50}
                                              className="object-contain"
                                              placeholder="blur"
                                              blurDataURL="/no_image.png"
                                            />
                                          ) : (
                                            <div className="h-12 w-12 rounded-md bg-gray-600/50 animate-pulse" />
                                          )}
                                        </td>
                                        <td className="px-4 py-2">
                                          {isWinnerTBD ? 'TBD' : shortenAddress(match.winner)}
                                        </td>
                                      </tr>
                                    );
                                  });
                                })()}
                              </tbody>
                            </table>
                          </div>
                        )
                      ) : (
                        pairMatchResult.isLoading ? (
                          <div className="space-y-2">
                            {[...Array(2)].map((_, index) => (
                              <CryptoPokeSkeleton key={index} />
                            ))}
                          </div>
                        ) : pairMatchResult.error ? (
                          <p className="text-red-500">
                            Error fetching pair matches: {pairMatchResult.error.message}
                          </p>
                        ) : pairMatches.length === 0 ? (
                          <p className="text-gray-400">No Matches</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full table-auto text-gray-50">
                              <thead>
                                <tr className="bg-gray-700">
                                  <th className="px-4 py-2 text-left">Round</th>
                                  <th className="px-4 py-2 text-left">Trainer 1</th>
                                  <th className="px-4 py-2 text-left">Moonster 1</th>
                                  <th className="px-4 py-2 text-left">Image</th>
                                  <th className="px-4 py-2 text-left">vs</th>
                                  <th className="px-4 py-2 text-left">Trainer 2</th>
                                  <th className="px-4 py-2 text-left">Moonster 2</th>
                                  <th className="px-4 py-2 text-left">Image</th>
                                  <th className="px-4 py-2 text-left">Winner</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pairMatches.map((match, index) => {
                                  const pokemon1 = pairMoonsterData.get(match.id1);
                                  const pokemon2 = pairMoonsterData.get(match.id2);
                                  const isWinnerTBD = match.winner === '0x0000000000000000000000000000000000000000';
                                  const isCurrentUserPlayer1 = address && match.player1.toLowerCase() === address.toLowerCase();
                                  const isCurrentUserPlayer2 = address && match.player2.toLowerCase() === address.toLowerCase();
                                  const isPlayer1Winner = !isWinnerTBD && match.winner.toLowerCase() === match.player1.toLowerCase();
                                  const isPlayer2Winner = !isWinnerTBD && match.winner.toLowerCase() === match.player2.toLowerCase();
                                  return (
                                    <tr key={index} className={`border-t border-gray-700 ${isCurrentUserPlayer1 || isCurrentUserPlayer2 ? 'bg-yellow-600/30 border-yellow-500' : ''}`}>
                                      <td className="px-4 py-2">{match.roundId}</td>
                                      <td className="px-4 py-2">
                                        {shortenAddress(match.player1)}
                                        {isPlayer1Winner && <span className="text-yellow-400">✨</span>}
                                      </td>
                                      <td className="px-4 py-2 capitalize">
                                        {pokemon1 ? pokemon1.name : 'Loading...'} (#{match.id1})
                                      </td>
                                      <td className="px-4 py-2">
                                        {pokemon1 ? (
                                          <Image
                                          src={`${IMAGE_BASE_URL}${pokemon1.image}`}
                                            alt={`${pokemon1.name} artwork`}
                                            width={50}
                                            height={50}
                                            className="object-contain"
                                            placeholder="blur"
                                            blurDataURL="/no_image.png"
                                          />
                                        ) : (
                                          <div className="h-12 w-12 rounded-md bg-gray-600/50 animate-pulse" />
                                        )}
                                      </td>
                                      <td className="px-4 py-2 text-center text-yellow-400 font-bold">vs</td>
                                      <td className="px-4 py-2">
                                        {shortenAddress(match.player2)}
                                        {isPlayer2Winner && <span className="text-yellow-400">✨</span>}
                                      </td>
                                      <td className="px-4 py-2 capitalize">
                                        {pokemon2 ? pokemon2.name : 'Loading...'} (#{match.id2})
                                      </td>
                                      <td className="px-4 py-2">
                                        {pokemon2 ? (
                                          <Image
                                          src={`${IMAGE_BASE_URL}${pokemon2.image}`}
                                            alt={`${pokemon2.name} artwork`}
                                            width={50}
                                            height={50}
                                            className="object-contain"
                                            placeholder="blur"
                                            blurDataURL="/no_image.png"
                                          />
                                        ) : (
                                          <div className="h-12 w-12 rounded-md bg-gray-600/50 animate-pulse" />
                                        )}
                                      </td>
                                      <td className="px-4 py-2">
                                        {isWinnerTBD ? 'TBD' : shortenAddress(match.winner)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="leaderboard">
                    <div className="bg-gray-800 rounded-md shadow-xl p-4 border border-neutral-800 mb-4">
                      <h3 className="text-xl font-bold text-gray-50 mb-4">Leaderboard</h3>
                      {seasonDetailsResult.isLoading ? (
                        <div className="space-y-2">
                          {[...Array(3)].map((_, index) => (
                            <CryptoPokeSkeleton key={index} />
                          ))}
                        </div>
                      ) : seasonDetailsResult.error ? (
                        <p className="text-red-500">
                          Error fetching season: {seasonDetailsResult.error.message}
                        </p>
                      ) : (
                        <>
                          <div className="mb-4 flex space-x-4">
                            <label className="text-gray-50">
                              Offset:
                              <input
                                type="number"
                                value={offset}
                                onChange={(e) => setOffset(Math.max(0, Number(e.target.value)))}
                                className="ml-2 p-1 bg-gray-700 text-white rounded-md w-20"
                                min="0"
                              />
                            </label>
                            <label className="text-gray-50">
                              Limit:
                              <input
                                type="number"
                                value={limit}
                                onChange={(e) => setLimit(Math.max(1, Number(e.target.value)))}
                                className="ml-2 p-1 bg-gray-700 text-white rounded-md w-20"
                                min="1"
                              />
                            </label>
                          </div>
                          {leaderboardResult.isLoading ? (
                            <div className="space-y-2">
                              {[...Array(3)].map((_, index) => (
                                <CryptoPokeSkeleton key={index} />
                              ))}
                            </div>
                          ) : leaderboardResult.error ? (
                            <p className="text-red-500">
                              Error fetching leaderboard: {leaderboardResult.error.message}
                            </p>
                          ) : leaderboard.length === 0 ? (
                            <p className="text-gray-400">No leaderboard data available</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full table-auto text-gray-50">
                                <thead>
                                  <tr className="bg-gray-700">
                                    <th className="px-4 py-2 text-left">Rank</th>
                                    <th className="px-4 py-2 text-left">Trainer</th>
                                    <th className="px-4 py-2 text-left">Wins</th>
                                    {/* <th className="px-4 py-2 text-left">Draws</th> */}
                                    <th className="px-4 py-2 text-left">Losses/Orphans</th>
                                    <th className="px-4 py-2 text-left">Points</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {leaderboard.map((entry, index) => {
                                    const isCurrentUser = address && entry.user.toLowerCase() === address.toLowerCase();
                                    return (
                                      <tr
                                        key={entry.user}
                                        className={`border-t border-gray-700 ${isCurrentUser ? 'bg-yellow-600/30 border-yellow-500' : ''}`}
                                      >
                                        <td className="px-4 py-2">{offset + index + 1}</td>
                                        <td className="px-4 py-2">{shortenAddress(entry.user)}</td>
                                        <td className="px-4 py-2">{entry.wins}</td>
                                        {/* <td className="px-4 py-2">{entry.draws}</td> */}
                                        <td className="px-4 py-2">{entry.lossesOrOrphans}</td>
                                        <td className="px-4 py-2">{entry.points}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </BackgroundGradient>
      </div>
    </div>
  );
};

export default MoonBoard;