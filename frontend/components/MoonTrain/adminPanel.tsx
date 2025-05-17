'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { waitForTransactionReceipt } from '@wagmi/core';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FaPlus, FaRandom, FaGift, FaMinus } from 'react-icons/fa';
import { SC_BATTLE_MANAGER, SC_SEASON_MANAGER, SC_USER_MANAGER, SC_MOONSTERS } from '@/context/constants';
import { formatUnits, parseUnits } from 'ethers';
import { isAddress } from 'viem';
import Image from 'next/image';
import { CryptoPokeSkeleton } from '../Loader';
import { abiBattleManager, abiUserManager, abiSeasonManager, abiMoonsters } from '@/utils';
import { useRouter } from 'next/navigation';
import { config } from '@/utils/config';
import { compareMoonsters, fetchMoonsterData, getMoonsterByIds } from '@/actions/getMoonsterData';
import { MoonstersDetails } from '@/types/moonsters';

type EVMAddress = `0x${string}`;
const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_IMAGE_BASE;

interface RoundParticipant {
    address: EVMAddress;
    moonsterId: number;
}

interface PairMatch {
    player1: EVMAddress;
    id1: number;
    player2: EVMAddress;
    id2: number;
    winner: EVMAddress;
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

interface MoonsterAnalysis {
    typeAdvantage1: boolean;
    typeAdvantage2: boolean;
    statAdvantage1: number;
    statAdvantage2: number;
    combinedAdvantage1: number;
    combinedAdvantage2: number;
}

// Utility to shorten addresses (xxxx...xxxx)
const shortenAddress = (address: string): string => {
    if (!address || address.length < 8) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

type ChildProps = {
    onReload: () => void;
};

const CRYPTO_MOON_ADDRESS = SC_MOONSTERS;
const CRYPTO_MOON_ABI = abiMoonsters;

const AdminPanel: React.FC<ChildProps> = ({ onReload }) => {
    const router = useRouter();
    const { address, chainId, isConnected } = useAccount();
    const [isSeasonModalOpen, setIsSeasonModalOpen] = useState(false);
    const [isRoundModalOpen, setIsRoundModalOpen] = useState(false);
    const [selectedSeasonToken, setSelectedSeasonToken] = useState<string>('');
    const [baseRewards, setBaseRewards] = useState<string>('');
    const [seasonLabel, setSeasonLabel] = useState<string>('');
    const [isDistributingSeasonReward, setIsDistributingSeasonReward] = useState(false);

    const [moonsterData, setMoonsterData] = useState<Map<number, MoonstersDetails>>(new Map());
    const [pairMoonsterData, setPairMoonsterData] = useState<Map<number, MoonstersDetails>>(new Map());
    const [isRefetching, setIsRefetching] = useState(false);

    const { writeContractAsync: writeSeasonAsync, isPending: isPendingSeason, data: hashSeason, reset: resetSeason } = useWriteContract();
    const { isLoading: isConfirmingSeason, isSuccess: isConfirmedSeason, error: receiptErrorSeason } = useWaitForTransactionReceipt({
        hash: hashSeason,
        timeout: 30000,
    });

    const { writeContractAsync, isPending: isPendingRound, data: hashRound, reset: resetRound } = useWriteContract();
    const { isLoading: isConfirmingRound, isSuccess: isConfirmedRound, error: receiptErrorRound } = useWaitForTransactionReceipt({
        hash: hashRound,
        timeout: 30000,
    });

    const { writeContractAsync: writePairingAsync, isPending: isPendingPairing, data: hashPairing, reset: resetPairing } = useWriteContract();
    const { isLoading: isConfirmingPairing, isSuccess: isConfirmedPairing, error: receiptErrorPairing } = useWaitForTransactionReceipt({
        hash: hashPairing,
        timeout: 30000,
    });

    const { writeContractAsync: writeResultAsync, isPending: isPendingResult, data: hashResult, reset: resetResult } = useWriteContract();
    const { isLoading: isConfirmingResult, isSuccess: isConfirmedResult, error: receiptErrorResult } = useWaitForTransactionReceipt({
        hash: hashResult,
        timeout: 30000,
    });

    const { writeContractAsync: writeRewardAsync, isPending: isPendingReward, data: hashReward, reset: resetReward } = useWriteContract();
    const { isLoading: isConfirmingReward, isSuccess: isConfirmedReward, error: receiptErrorReward } = useWaitForTransactionReceipt({
        hash: hashReward,
        timeout: 30000,
    });

    const { writeContractAsync: writeEndSeasonAsync, isPending: isPendingEndSeason, data: hashEndSeason, reset: resetEndSeason } = useWriteContract();
    const { isLoading: isConfirmingEndSeason, isSuccess: isConfirmedEndSeason, error: receiptErrorEndSeason } = useWaitForTransactionReceipt({
        hash: hashEndSeason,
        timeout: 30000,
    });

    const { writeContractAsync: writeSeasonRewardAsync, isPending: isPendingSeasonReward, data: hashSeasonReward, reset: resetRewardSeason } = useWriteContract();
    const { isLoading: isConfirmingSeasonReward, isSuccess: isConfirmedSeasonReward, error: receiptErrorSeasonReward } = useWaitForTransactionReceipt({
        hash: hashSeasonReward,
        timeout: 30000,
    });

    const networkClient = Number(chainId);

    // Fetch contract owner
    const ownerResult = useReadContract({
        abi: abiUserManager,
        address: SC_USER_MANAGER as EVMAddress,
        functionName: 'owner',
        account: address,
    });



    const isOwner = useMemo(
        () => address && ownerResult.data && address.toLowerCase() === ownerResult.data.toLowerCase(),
        [address, ownerResult.data]
    );



    // Fetch current season ID
    const seasonResult = useReadContract({
        abi: abiSeasonManager,
        address: SC_SEASON_MANAGER as EVMAddress,
        functionName: 'getCurrentSeasonId',
    });

    // Fetch season details using getSeason
    const seasonDetailsResult = useReadContract({
        abi: abiSeasonManager,
        address: SC_SEASON_MANAGER as EVMAddress,
        functionName: 'getSeason',
        args: [seasonResult.data ?? BigInt(0)],
        query: {
            enabled: !!seasonResult.data && Number(seasonResult.data) > 0,
        },
    });

    // Fetch season label using getSeasonLabel
    const seasonLabelResult = useReadContract({
        abi: abiSeasonManager,
        address: SC_SEASON_MANAGER as EVMAddress,
        functionName: 'getSeasonLabel',
        args: [seasonResult.data ?? BigInt(0)],
        query: {
            enabled: !!seasonResult.data && Number(seasonResult.data) > 0,
        },
    });

    // Fetch current Prize Pool
    const seasonRewardsResult = useReadContract({
        abi: abiSeasonManager,
        address: SC_SEASON_MANAGER as EVMAddress,
        functionName: 'getCurrentSeasonRewards',
        query: {
            enabled: !!seasonResult.data && Number(seasonResult.data) > 0,
        },
    });

    // Fetch top players
    const topPlayersResult = useReadContract({
        abi: abiSeasonManager,
        address: SC_SEASON_MANAGER as EVMAddress,
        functionName: 'getTopPlayers',
        args: [seasonResult.data ?? BigInt(0), BigInt(3), BigInt(0)],
        query: {
            enabled: !!seasonResult.data && Number(seasonResult.data) > 0,
        },
    });

    const seasonState = seasonDetailsResult.data?.[0] || '';
    const seasonToken = seasonDetailsResult.data?.[5] || '0x0000000000000000000000000000000000000000';
    const seasonLabelData = seasonLabelResult.data || '';
    const currentSeasonRewards = seasonRewardsResult.data || BigInt(0);
    const topPlayers = topPlayersResult.data || [];

    // Fetch current Season ID
    const { data: currentSeasonId } = useReadContract({
        abi: abiSeasonManager,
        address: SC_SEASON_MANAGER,
        functionName: 'getCurrentSeasonId',
        chainId: 4202,
    });

    // Fetch current round ID
    const roundResult = useReadContract({
        abi: abiBattleManager,
        address: SC_BATTLE_MANAGER as EVMAddress,
        functionName: 'getCurrentRoundId',
    });

    // Fetch battle round details
    const battleRoundResult = useReadContract({
        abi: abiBattleManager,
        address: SC_BATTLE_MANAGER as EVMAddress,
        functionName: 'battleRounds',
        args: [currentSeasonId ?? BigInt(0), roundResult.data ?? BigInt(0)],
        account: address,
        query: {
            enabled: (!!roundResult.data && Number(roundResult.data) > 0) && (!!currentSeasonId && Number(currentSeasonId) > 0),
        },
    });

    const roundInfoResult = useReadContract({
        abi: abiBattleManager,
        address: SC_BATTLE_MANAGER as EVMAddress,
        functionName: 'getRoundInfo',
        args: [currentSeasonId ?? BigInt(0), roundResult.data ?? BigInt(0), true],
        account: address,
        query: {
            enabled: !!roundResult.data && Number(roundResult.data) > 0 && isOwner,
        },
    });

    const pairMatchResult = useReadContract({
        abi: abiBattleManager,
        address: SC_BATTLE_MANAGER as EVMAddress,
        functionName: 'getPairMatch',
        args: [currentSeasonId ?? BigInt(0), roundResult.data ?? BigInt(0)],
        account: address,
        query: {
            enabled: !!roundResult.data && Number(roundResult.data) > 0 && (battleRoundResult.data?.[0] === 'ongoing' || battleRoundResult.data?.[0] === 'ended' || battleRoundResult.data?.[0] === 'completed'),
        },
    });

    const roundDetailsResult = useReadContract({
        abi: abiBattleManager,
        address: SC_BATTLE_MANAGER as EVMAddress,
        functionName: 'getRoundInfo',
        args: [currentSeasonId ?? BigInt(0), roundResult.data ?? BigInt(0), true],
        account: address,
        query: {
            enabled: !!roundResult.data && Number(roundResult.data) > 0,
        },
    });

    const roundState = battleRoundResult.data?.[0] || '';

    const tokenResult = useReadContract({
        abi: abiUserManager,
        address: SC_USER_MANAGER as EVMAddress,
        functionName: 'getPublicTokenBalances',
        account: address,
    });

    // Destructure all three return values: tokenAddresses, balances, decimals
    const [tokenAddresses = [], balances = [], decimals = []] = (tokenResult.data ?? [[], [], []]) as readonly [readonly EVMAddress[], readonly bigint[], readonly bigint[]];

    const participants: RoundParticipant[] = useMemo(() => {
        if (!roundInfoResult.data) return [];
        const [addresses, moonsterIds] = roundInfoResult.data as unknown as [EVMAddress[], bigint[]];
        return addresses
            .map((addr, index) => ({
                address: addr,
                moonsterId: Number(moonsterIds[index]),
            }))
            .filter((p) => isAddress(p.address) && p.moonsterId > 0);
    }, [roundInfoResult.data]);

    const pairMatches: PairMatch[] = useMemo(() => {
        if (!pairMatchResult.data) return [];
        const [players1, ids1, players2, ids2, winners] = pairMatchResult.data as [
            EVMAddress[],
            bigint[],
            EVMAddress[],
            bigint[],
            EVMAddress[]
        ];
        return players1.map((player1, index) => ({
            player1,
            id1: Number(ids1[index]),
            player2: players2[index],
            id2: Number(ids2[index]),
            winner: winners[index],
        })).filter((match) => isAddress(match.player1) && isAddress(match.player2) && match.id1 > 0 && match.id2 > 0);
    }, [pairMatchResult.data]);

    const orphanAddress = useMemo(() => {
        if (!roundDetailsResult.data) return null;
        const [, , orphan] = roundDetailsResult.data as [EVMAddress[], bigint[], EVMAddress];
        return isAddress(orphan) ? orphan : null;
    }, [roundDetailsResult.data]);

    const orphanMoonsterId = useMemo(() => {
        if (!roundDetailsResult.data || !orphanAddress) return null;
        const [, moonsterIds] = roundDetailsResult.data as [EVMAddress[], bigint[], EVMAddress];
        const participantIndex = (roundDetailsResult.data as [EVMAddress[], bigint[], EVMAddress])[0].findIndex(
            addr => addr.toLowerCase() === orphanAddress.toLowerCase()
        );
        return participantIndex !== -1 ? Number(moonsterIds[participantIndex]) : null;
    }, [roundDetailsResult.data, orphanAddress]);

    // Fetch Moonster data for participants
    useEffect(() => {
        if (participants.length === 0) {
            setMoonsterData(new Map());
            return;
        }

        const fetchMoonsters = async () => {
            const ids = participants.map(participant => participant.moonsterId);
            const moonsters = await getMoonsterByIds(ids);
            const newMoonsterData = new Map<number, MoonstersDetails>();

            moonsters.forEach(moonster => {
                newMoonsterData.set(moonster.id, moonster);
            });

            setMoonsterData(newMoonsterData);
        };

        fetchMoonsters();
    }, [participants]);

    // Fetch Moonster data for pair matches
    useEffect(() => {
        if (pairMatches.length === 0) {
            setPairMoonsterData(new Map());
            return;
        }
    
        const fetchMoonsters = async () => {
            const ids = [...new Set([...pairMatches.map((m) => m.id1), ...pairMatches.map((m) => m.id2)])]; // Remove duplicates
            const moonsters = await fetchMoonsterData(ids);
            setPairMoonsterData(moonsters);
        };
    
        fetchMoonsters();
    }, [pairMatches]);

    const [winners, setWinners] = useState<Map<number, EVMAddress>>(new Map());
    const [analyses, setAnalyses] = useState<Map<number, MoonsterAnalysis>>(new Map());

    useEffect(() => {
        const determineWinners = async () => {
            if (pairMatches.length === 0 || pairMoonsterData.size === 0) {
                setWinners(new Map());
                setAnalyses(new Map());
                return;
            }
    
            try {
                const { winners, analyses } = await compareMoonsters(pairMatches);
                
                const typedWinners = new Map<number, EVMAddress>(
                    Array.from(winners.entries()).map(([key, value]) => [key, value as EVMAddress])
                );
                setWinners(typedWinners);
                setAnalyses(analyses);
            } catch (error) {
                console.error('Error determining winners:', error);
                pairMatches.forEach((_, index) => {
                    toast.error(`Failed to determine winner for match ${index + 1}.`, { id: `error-winner-${index}` });
                });
                setWinners(new Map());
                setAnalyses(new Map());
            }
        };
    
        determineWinners();
    }, [pairMatches, pairMoonsterData]);

    const handleCreateSeason = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isConnected) {
            toast.error('Please connect your wallet.', { id: 'error-season' });
            return;
        }
        if (networkClient !== 4202) {
            toast.error('Please switch to Lisk Sepolia Testnet.', { id: 'error-season' });
            return;
        }
        if (!isOwner) {
            toast.error('Only the contract owner can create a season.', { id: 'error-season' });
            return;
        }
        if (!selectedSeasonToken || !isAddress(selectedSeasonToken)) {
            toast.error('Please select a valid token address.', { id: 'error-season' });
            return;
        }
        if (!baseRewards || isNaN(Number(baseRewards)) || Number(baseRewards) <= 0) {
            toast.error('Please enter a valid base rewards amount.', { id: 'error-season' });
            return;
        }
        if (!seasonLabel) {
            toast.error('Please enter a season label.', { id: 'error-season' });
            return;
        }
        if (seasonResult.data && Number(seasonResult.data) > 0 && seasonState !== 'ended') {
            toast.error('Cannot create a new season until the current season has ended.', { id: 'error-season' });
            return;
        }

        const tokenIndex = tokenAddresses.findIndex(
            (addr) => addr.toLowerCase() === selectedSeasonToken.toLowerCase()
        );
        if (tokenIndex === -1) {
            toast.error('Selected token not found in available tokens.', { id: 'error-season' });
            return;
        }
        const tokenDecimals = Number(decimals[tokenIndex]);
        if (isNaN(tokenDecimals) || tokenDecimals < 0) {
            toast.error('Invalid decimals for the selected token.', { id: 'error-season' });
            return;
        }

        try {
            const finalBaseReward = parseUnits(baseRewards, tokenDecimals);
            await writeSeasonAsync({
                address: SC_SEASON_MANAGER as EVMAddress,
                abi: abiSeasonManager,
                functionName: 'initializeSeason',
                args: [finalBaseReward, selectedSeasonToken as EVMAddress, seasonLabel],
            });
            toast.success('Season creation transaction submitted!', { id: 'pending-season' });
            onReload();
        } catch (err: any) {
            if (err.message.includes('User rejected the request') || err.message.includes('User denied transaction signature')) {
                toast.warning('Transaction rejected. Please approve the transaction to create a new season.', { id: 'error-season' });
            } else if (err.message.includes('OwnableUnauthorizedAccount')) {
                toast.error('Only the contract owner can create a season.', { id: 'error-season' });
            } else {
                toast.error(`Failed to create season: ${err.message || 'Unknown error'}`, { id: 'error-season' });
            }
            resetSeason();
            onReload();
        }
        router.refresh();
    };

    const handleSubmitRound = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isConnected) {
            toast.error('Please connect your wallet.', { id: 'error-round' });
            return;
        }
        if (networkClient !== 4202) {
            toast.error('Please switch to Lisk Sepolia Testnet.', { id: 'error-round' });
            return;
        }
        if (!isOwner) {
            toast.error('Only the contract owner can create a round.', { id: 'error-round' });
            return;
        }
        if (!seasonResult.data || Number(seasonResult.data) === 0) {
            toast.error('No active season. Please create a season first.', { id: 'error-round' });
            return;
        }
        if (seasonState !== 'active') {
            toast.error('The current season is not active. Cannot create a round.', { id: 'error-round' });
            return;
        }
        if (roundResult.data && Number(roundResult.data) > 0 && roundState !== 'completed') {
            toast.error('Cannot create a new round until the current round has completed.', { id: 'error-round' });
            return;
        }

        try {
            await writeContractAsync({
                address: SC_BATTLE_MANAGER as EVMAddress,
                abi: abiBattleManager,
                functionName: 'createRoundMatch',
            });
            toast.success('Round creation transaction submitted!', { id: 'pending-round' });
            setIsRoundModalOpen(false);
            onReload();
            toast.dismiss();
        } catch (err: any) {
            if (err.message.includes('User rejected the request') || err.message.includes('User denied transaction signature')) {
                toast.warning('Transaction rejected. Please approve the transaction to create a new round.', { id: 'error-round' });
            } else if (err.message.includes('Token is not accepted')) {
                toast.error('Selected token is not accepted.', { id: 'error-round' });
            } else if (err.message.includes('OwnableUnauthorizedAccount')) {
                toast.error('Only the contract owner can create a round.', { id: 'error-round' });
            } else {
                toast.error(`Failed to create round: ${err.message || 'Unknown error'}`, { id: 'error-round' });
            }
            resetRound();
            setIsRoundModalOpen(false);
            router.refresh();
            onReload();
        }
        router.refresh();
    };

    const handleTriggerPairing = async () => {
        if (!isConnected) {
            toast.error('Please connect your wallet.', { id: 'error-pairing' });
            return;
        }
        if (networkClient !== 4202) {
            toast.error('Please switch to Lisk Sepolia Testnet.', { id: 'error-pairing' });
            return;
        }
        if (!isOwner) {
            toast.error('Only the contract owner can trigger pairing.', { id: 'error-pairing' });
            return;
        }
        if (!seasonResult.data || Number(seasonResult.data) === 0) {
            toast.error('No active season. Please create a season first.', { id: 'error-pairing' });
            return;
        }
        if (!roundResult.data || Number(roundResult.data) === 0) {
            toast.error('No active round available to trigger pairing.', { id: 'error-pairing' });
            return;
        }
        if (roundState !== 'regis') {
            toast.error('Pairing can only be triggered during the registration phase.', { id: 'error-pairing' });
            return;
        }
        if (participants.length < 2) {
            toast.error('At least 2 participants are required to trigger pairing.', { id: 'error-pairing' });
            return;
        }

        try {
            await writePairingAsync({
                address: SC_BATTLE_MANAGER as EVMAddress,
                abi: abiBattleManager,
                functionName: 'triggerPairing',
            });
            toast.success('Pairing transaction submitted!', { id: 'pending-pairing' });
            onReload();
            toast.dismiss();
        } catch (err: any) {
            if (err.message.includes('User rejected the request') || err.message.includes('User denied transaction signature')) {
                toast.warning('Transaction rejected. Please approve the transaction to trigger pairing.', { id: 'error-pairing' });
            } else if (err.message.includes('OwnableUnauthorizedAccount')) {
                toast.error('Only the contract owner can trigger pairing.', { id: 'error-pairing' });
            } else {
                toast.error(`Failed to trigger pairing: ${err.message || 'Unknown error'}`, { id: 'error-pairing' });
            }
            resetPairing();
            onReload();
        }
        router.refresh();
    };



    const handleSubmitResults = async () => {
        if (!isConnected) {
            toast.error('Please connect your wallet.', { id: 'error-result' });
            return;
        }
        if (networkClient !== 4202) {
            toast.error('Please switch to Lisk Sepolia Testnet.', { id: 'error-result' });
            return;
        }
        if (!isOwner) {
            toast.error('Only the contract owner can update results.', { id: 'error-result' });
            return;
        }
        if (!seasonResult.data || Number(seasonResult.data) === 0) {
            toast.error('No active season. Please create a season first.', { id: 'error-result' });
            return;
        }
        if (!roundResult.data || Number(roundResult.data) === 0) {
            toast.error('No active round to update results for.', { id: 'error-result' });
            return;
        }
        if (roundState !== 'ongoing') {
            toast.error('Results can only be updated during the ongoing phase.', { id: 'error-result' });
            return;
        }
        if (pairMatches.length === 0) {
            toast.error('No pair matches to update.', { id: 'error-result' });
            return;
        }
        if (winners.size !== pairMatches.length) {
            toast.error('Winners not determined for all matches.', { id: 'error-result' });
            return;
        }

        const pairedAddresses = new Set<EVMAddress>();
        pairMatches.forEach(match => {
            pairedAddresses.add(match.player1);
            pairedAddresses.add(match.player2);
        });

        const orphanParticipant = participants.find(participant => !pairedAddresses.has(participant.address));
        const orphan = orphanParticipant ? orphanParticipant.address : ('0x0000000000000000000000000000000000000000' as EVMAddress);
        const matchIndices = Array.from(winners.keys()).map(index => BigInt(index)) as readonly bigint[];
        const winnerAddresses = Array.from(winners.values());

        try {
            await writeResultAsync({
                address: SC_BATTLE_MANAGER as EVMAddress,
                abi: abiBattleManager,
                functionName: 'updateResultPairMatch',
                args: [roundResult.data, matchIndices, winnerAddresses, orphan],
            });
            toast.success('Results transaction submitted!', { id: 'pending-result' });
            router.push('/moonboard');
            router.refresh();
            onReload();
            toast.dismiss();
        } catch (err: any) {
            if (err.message.includes('User rejected the request') || err.message.includes('User denied transaction signature')) {
                toast.warning('Transaction rejected. Please approve the transaction to update results.', { id: 'error-result' });
            } else if (err.message.includes('OwnableUnauthorizedAccount')) {
                toast.error('Only the contract owner can update results.', { id: 'error-result' });
            } else {
                toast.error(`Failed to update results: ${err.message || 'Unknown error'}`, { id: 'error-result' });
            }
            resetResult();
            router.refresh();
            onReload();
        }
        router.refresh();
    };

    const handleDistributeRewards = async () => {
        if (!isConnected) {
            toast.error('Please connect your wallet.', { id: 'error-reward' });
            return;
        }
        if (networkClient !== 4202) {
            toast.error('Please switch to Lisk Sepolia Testnet.', { id: 'error-reward' });
            return;
        }
        if (!isOwner) {
            toast.error('Only the contract owner can distribute rewards.', { id: 'error-reward' });
            return;
        }
        if (!seasonResult.data || Number(seasonResult.data) === 0) {
            toast.error('No active season. Please create a season first.', { id: 'error-reward' });
            return;
        }
        if (!roundResult.data || Number(roundResult.data) === 0) {
            toast.error('No active round to distribute rewards for.', { id: 'error-reward' });
            return;
        }
        if (roundState !== 'ended') {
            toast.error('Rewards can only be distributed during the ended phase after results are updated.', { id: 'error-reward' });
            return;
        }
        if (pairMatches.length === 0) {
            toast.error('No pair matches to distribute rewards for.', { id: 'error-reward' });
            return;
        }
        const allMatchesHaveWinners = pairMatches.every(
            (match) => match.winner !== '0x0000000000000000000000000000000000000000'
        );
        if (!allMatchesHaveWinners) {
            toast.error('All matches must have a winner before distributing rewards.', { id: 'error-reward' });
            return;
        }

        try {
            const rewardHash = await writeRewardAsync({
                address: SC_BATTLE_MANAGER as EVMAddress,
                abi: abiBattleManager,
                functionName: 'sendRewardMatch',
                args: [roundResult.data],
            });
            toast.success('Reward distribution transaction submitted!', { id: 'pending-reward' });

            const receipt = await waitForTransactionReceipt(config, {
                hash: rewardHash as `0x${string}`,
                timeout: 60000,
            });

            if (receipt.status !== 'success') {
                throw new Error('Reward distribution transaction failed on-chain.');
            }
            toast.success('Reward distribution confirmed!', { id: 'confirmed-reward' });

            await writeRewardAsync({
                address: SC_BATTLE_MANAGER as EVMAddress,
                abi: abiBattleManager,
                functionName: 'saveRewardHashLink',
                args: [roundResult.data, rewardHash],
            });
            toast.success('Reward hash saved successfully!', { id: 'hash-saved' });

            onReload();
            router.push('/moonboard');
        } catch (err: any) {
            if (err.message.includes('User rejected the request') || err.message.includes('User denied transaction signature')) {
                toast.warning('Transaction rejected. Please approve the transaction to distribute rewards.', { id: 'error-reward' });
            } else if (err.message.includes('OwnableUnauthorizedAccount')) {
                toast.error('Only the contract owner can distribute rewards.', { id: 'error-reward' });
            } else {
                toast.error(`Failed to distribute rewards: ${err.message || 'Unknown error'}`, { id: 'error-reward' });
            }
            resetReward();
            onReload();
        }
        router.refresh();
    };

    const handleEndSeason = async () => {
        if (!isConnected) {
            toast.error('Please connect your wallet.', { id: 'error-end-season' });
            return;
        }
        if (networkClient !== 4202) {
            toast.error('Please switch to Lisk Sepolia Testnet.', { id: 'error-end-season' });
            return;
        }
        if (!isOwner) {
            toast.error('Only the contract owner can end a season.', { id: 'error-end-season' });
            return;
        }
        if (!seasonResult.data || Number(seasonResult.data) === 0) {
            toast.error('No active season to end.', { id: 'error-end-season' });
            return;
        }
        if (seasonState !== 'active') {
            toast.error('Only an active season can be ended.', { id: 'error-end-season' });
            return;
        }

        try {
            await writeEndSeasonAsync({
                address: SC_SEASON_MANAGER as EVMAddress,
                abi: abiSeasonManager,
                functionName: 'endSeason',
            });
            toast.success('Season end transaction submitted!', { id: 'pending-end-season' });
            toast.dismiss();
            router.refresh();
            onReload();
            router.push('/moonboard');
        } catch (err: any) {
            if (err.message.includes('User rejected the request') || err.message.includes('User denied transaction signature')) {
                toast.warning('Transaction rejected. Please approve the transaction to end the season.', { id: 'error-end-season' });
            } else if (err.message.includes('OwnableUnauthorizedAccount')) {
                toast.error('Only the contract owner can end a season.', { id: 'error-end-season' });
            } else {
                toast.error(`Failed to end season: ${err.message || 'Unknown error'}`, { id: 'error-end-season' });
            }
            resetEndSeason();
            onReload();
            router.refresh();
        }
        router.refresh();
    };

    const handleDistributeSeasonRewards = async () => {
        if (!isConnected) {
            toast.error('Please connect your wallet.', { id: 'error-reward' });
            return;
        }
        if (networkClient !== 4202) {
            toast.error('Please switch to Lisk Sepolia Testnet.', { id: 'error-reward' });
            return;
        }
        if (!isOwner) {
            toast.error('Only the contract owner can distribute rewards.', { id: 'error-reward' });
            return;
        }
        if (!seasonResult || Number(seasonResult) === 0) {
            toast.error('No active season to distribute rewards for.', { id: 'error-reward' });
            return;
        }
        if (seasonState !== 'ended') {
            toast.error('Season must be in "ended" state to distribute rewards.', { id: 'error-reward' });
            return;
        }

        if (topPlayers.length === 0) {
            toast.error('No top players available to distribute rewards.', { id: 'error-season-reward' });
            return;
        }

        setIsDistributingSeasonReward(true);
        try {
            const seasonRewardHash = await writeSeasonRewardAsync({
                address: SC_BATTLE_MANAGER as EVMAddress,
                abi: abiBattleManager,
                functionName: 'distributeSeasonRewards',
                account: address,
            });
            toast.success('Reward distribution transaction submitted!', { id: 'pending-season-reward' });

            const receiptSeason = await waitForTransactionReceipt(config, {
                hash: seasonRewardHash as `0x${string}`,
                timeout: 60000,
            });

            if (receiptSeason.status !== 'success') {
                throw new Error('Season reward distribution transaction failed on-chain.');
            }
            toast.success('Reward Season distribution confirmed!', { id: 'confirmed-season-reward' });

            await writeRewardAsync({
                address: SC_SEASON_MANAGER as EVMAddress,
                abi: abiSeasonManager,
                functionName: 'saveSeasonRewardHashLink',
                args: [seasonResult.data ?? BigInt(0), seasonRewardHash],
            });
            toast.success('Season reward hash saved successfully!', { id: 'hash-season-reward-saved' });

            router.refresh();
            onReload();
            router.push('/moonboard');
        } catch (err: any) {
            if (err.message.includes('User rejected the request') || err.message.includes('User denied transaction signature')) {
                toast.warning('Transaction rejected. Please approve the transaction to distribute season rewards.', { id: 'error-season-reward' });
            } else if (err.message.includes('OwnableUnauthorizedAccount')) {
                toast.error('Only the contract owner can distribute rewards.', { id: 'error-season-reward' });
            } else {
                toast.error(`Failed to distribute rewards: ${err.message || 'Unknown error'}`, { id: 'error-season-reward' });
            }
            resetRewardSeason();
            setIsDistributingSeasonReward(false);
            router.refresh();
        } finally {
            setIsDistributingSeasonReward(false);
            toast.dismiss();
            router.refresh();
        }
    };

    useEffect(() => {
        if (isConfirmingSeasonReward) {
            toast.loading('Waiting for reward distribution confirmation...', { id: 'confirming-season-reward' });
        } else if (isConfirmedSeasonReward) {
            toast.dismiss('confirming-reward');
            toast.success('Rewards distributed successfully!', { id: 'confirmed-season-reward' });
            toast.dismiss();
            router.refresh();
        }
    }, [isConfirmingSeasonReward, isConfirmedSeasonReward, router]);

    useEffect(() => {
        if (receiptErrorSeasonReward) {
            toast.error(`Reward distribution failed: ${receiptErrorSeasonReward.message || 'Unknown error'}`, { id: 'error-season-reward' });
        }
    }, [receiptErrorSeasonReward]);

    const isDistributeDisabled = !isConnected || networkClient !== 4202 || !isOwner || !seasonResult || Number(seasonResult) === 0 || seasonState !== 'ended' || isDistributingSeasonReward || isConfirmingSeasonReward || topPlayers.length === 0;

    useEffect(() => {
        if (isConfirmingSeason) {
            toast.loading('Waiting for season creation confirmation...', { id: 'confirming-season' });
        } else if (isConfirmedSeason) {
            toast.dismiss('confirming-season');
            toast.success('Season created successfully!', { id: 'confirmed-season' });
            setIsSeasonModalOpen(false);
            setSelectedSeasonToken('');
            setBaseRewards('');
            setSeasonLabel('');
            seasonResult.refetch();
            seasonDetailsResult.refetch();
            seasonLabelResult.refetch();
            resetSeason();
            onReload();
            router.refresh();
        }
    }, [isConfirmingSeason, isConfirmedSeason, seasonResult, seasonDetailsResult, seasonLabelResult, resetSeason, onReload]);

    useEffect(() => {
        if (receiptErrorSeason) {
            toast.error(`Season creation failed: ${receiptErrorSeason.message || 'Unknown error'}`, { id: 'error-season' });
            resetSeason();
        }
    }, [receiptErrorSeason, resetSeason]);

    useEffect(() => {
        if (isConfirmingRound) {
            toast.loading('Waiting for round creation confirmation...', { id: 'confirming-round' });
        } else if (isConfirmedRound) {
            toast.dismiss('confirming-round');
            toast.success('Round created successfully!', { id: 'confirmed-round' });
            setIsRoundModalOpen(false);
            roundResult.refetch();
            resetRound();
            router.refresh();
        }
    }, [isConfirmingRound, isConfirmedRound, roundResult, resetRound]);

    useEffect(() => {
        if (receiptErrorRound) {
            toast.error(`Round creation failed: ${receiptErrorRound.message || 'Unknown error'}`, { id: 'error-round' });
            resetRound();
        }
    }, [receiptErrorRound, resetRound]);

    useEffect(() => {
        if (isConfirmingPairing) {
            toast.loading('Waiting for pairing confirmation...', { id: 'confirming-pairing' });
        } else if (isConfirmedPairing) {
            toast.dismiss('confirming-pairing');
            toast.success('Pairing triggered successfully!', { id: 'confirmed-pairing' });
            roundResult.refetch();
            battleRoundResult.refetch();
            roundInfoResult.refetch();
            pairMatchResult.refetch();
            roundDetailsResult.refetch();
            resetPairing();
            onReload();
            router.refresh();
        }
    }, [isConfirmingPairing, isConfirmedPairing, roundResult, battleRoundResult, roundInfoResult, pairMatchResult, roundDetailsResult, resetPairing]);

    useEffect(() => {
        if (receiptErrorPairing) {
            toast.error(`Pairing failed: ${receiptErrorPairing.message || 'Unknown error'}`, { id: 'error-pairing' });
            resetPairing();
        }
    }, [receiptErrorPairing, resetPairing]);

    useEffect(() => {
        if (isConfirmingResult) {
            toast.loading('Waiting for results update confirmation...', { id: 'confirming-result' });
        } else if (isConfirmedResult) {
            toast.dismiss('confirming-result');
            toast.success('Results updated successfully!', { id: 'confirmed-result' });
            roundResult.refetch();
            battleRoundResult.refetch();
            roundInfoResult.refetch();
            pairMatchResult.refetch();
            roundDetailsResult.refetch();
            toast.dismiss();
            setWinners(new Map());
            resetResult();
            onReload();
            router.refresh();
        }
    }, [isConfirmingResult, isConfirmedResult, roundResult, battleRoundResult, roundInfoResult, pairMatchResult, roundDetailsResult, resetResult]);

    useEffect(() => {
        if (receiptErrorResult) {
            toast.error(`Results update failed: ${receiptErrorResult.message || 'Unknown error'}`, { id: 'error-result' });
            resetResult();
        }
    }, [receiptErrorResult, resetResult]);

    useEffect(() => {
        if (isConfirmingReward) {
            toast.loading('Waiting for reward distribution confirmation...', { id: 'confirming-reward' });
        } else if (isConfirmedReward) {
            toast.dismiss('confirming-reward');
            toast.success('Rewards distributed successfully! Refetching data...', { id: 'confirmed-reward' });
            setIsRefetching(true);
            Promise.all([
                roundResult.refetch(),
                battleRoundResult.refetch(),
                roundInfoResult.refetch(),
                pairMatchResult.refetch(),
                roundDetailsResult.refetch(),
                tokenResult.refetch(),
            ]).finally(() => {
                setIsRefetching(false);
                setWinners(new Map());
                resetReward();
            });
        }
    }, [isConfirmingReward, isConfirmedReward, roundResult, battleRoundResult, roundInfoResult, pairMatchResult, roundDetailsResult, tokenResult, resetReward]);

    useEffect(() => {
        if (receiptErrorReward) {
            toast.error(`Reward distribution failed: ${receiptErrorReward.message || 'Unknown error'}`, { id: 'error-reward' });
            resetReward();
        }
    }, [receiptErrorReward, resetReward]);

    useEffect(() => {
        if (isConfirmingEndSeason) {
            toast.loading('Waiting for season end confirmation...', { id: 'confirming-end-season' });
        } else if (isConfirmedEndSeason) {
            toast.dismiss('confirming-end-season');
            toast.success('Season ended successfully!', { id: 'confirmed-end-season' });
            seasonResult.refetch();
            seasonDetailsResult.refetch();
            seasonLabelResult.refetch();
            resetEndSeason();
            onReload();
            router.refresh();
        }
    }, [isConfirmingEndSeason, isConfirmedEndSeason, seasonResult, seasonDetailsResult, seasonLabelResult, resetEndSeason, onReload]);

    useEffect(() => {
        if (receiptErrorEndSeason) {
            toast.error(`Season end failed: ${receiptErrorEndSeason.message || 'Unknown error'}`, { id: 'error-end-season' });
            resetEndSeason();
        }
    }, [receiptErrorEndSeason, resetEndSeason]);

    useEffect(() => {
        console.log('AdminPanel results:', {
            connectedAddress: address,
            ownerAddress: ownerResult.data,
            isOwner,
            tokenError: tokenResult.error ? tokenResult.error.message : null,
            tokenData: tokenResult.data,
            tokenLoading: tokenResult.isLoading,
            currentSeasonId: seasonResult.data ? Number(seasonResult.data) : null,
            seasonState,
            seasonToken,
            seasonLabel: seasonLabelData,
            currentSeasonRewards: currentSeasonRewards ? Number(currentSeasonRewards) : null,
            seasonDetailsError: seasonDetailsResult.error ? seasonDetailsResult.error.message : null,
            seasonLabelError: seasonLabelResult.error ? seasonLabelResult.error.message : null,
            transactionSeason: {
                hash: hashSeason,
                isPending: isPendingSeason,
                isConfirming: isConfirmingSeason,
                isConfirmed: isConfirmedSeason,
                receiptError: receiptErrorSeason ? receiptErrorSeason.message : null,
            },
            transactionRound: {
                hash: hashRound,
                isPending: isPendingRound,
                isConfirming: isConfirmingRound,
                isConfirmed: isConfirmedRound,
                receiptError: receiptErrorRound ? receiptErrorRound.message : null,
            },
            transactionPairing: {
                hash: hashPairing,
                isPending: isPendingPairing,
                isConfirming: isConfirmingPairing,
                isConfirmed: isConfirmedPairing,
                receiptError: receiptErrorPairing ? receiptErrorPairing.message : null,
            },
            transactionResult: {
                hash: hashResult,
                isPending: isPendingResult,
                isConfirming: isConfirmingResult,
                isConfirmed: isConfirmedResult,
                receiptError: receiptErrorResult ? receiptErrorResult.message : null,
            },
            transactionReward: {
                hash: hashReward,
                isPending: isPendingReward,
                isConfirming: isConfirmingReward,
                isConfirmed: isConfirmedReward,
                receiptError: receiptErrorReward ? receiptErrorReward.message : null,
            },
            transactionEndSeason: {
                hash: hashEndSeason,
                isPending: isPendingEndSeason,
                isConfirming: isConfirmingEndSeason,
                isConfirmed: isConfirmedEndSeason,
                receiptError: receiptErrorEndSeason ? receiptErrorEndSeason.message : null,
            },
            transactionDistributeRewardSeason: {
                hash: hashSeasonReward,
                isPending: isPendingSeasonReward,
                isConfirming: isConfirmingSeasonReward,
                isConfirmed: isConfirmedSeasonReward,
                receiptError: receiptErrorSeasonReward ? receiptErrorSeasonReward.message : null,
            },
            currentRoundId: roundResult.data ? Number(roundResult.data) : null,
            roundState,
            battleRoundError: battleRoundResult.error ? battleRoundResult.error.message : null,
            roundInfo: {
                data: roundInfoResult.data,
                loading: roundInfoResult.isLoading,
                error: roundInfoResult.error ? roundInfoResult.error.message : null,
                participants,
            },
            pairMatches: {
                data: pairMatchResult.data,
                loading: pairMatchResult.isLoading,
                error: pairMatchResult.error ? pairMatchResult.error.message : null,
                matches: pairMatches,
            },
            roundDetails: {
                data: roundDetailsResult.data,
                loading: roundDetailsResult.isLoading,
                error: roundDetailsResult.error ? roundDetailsResult.error.message : null,
                orphanAddress,
                orphanMoonsterId,
            },
            moonsterData: Array.from(moonsterData.entries()),
            pairMoonsterData: Array.from(pairMoonsterData.entries()),
            winners: Array.from(winners.entries()),
            analyses: Array.from(analyses.entries()),
            isRefetching,
        });
    }, [
        address,
        ownerResult.data,
        isOwner,
        tokenResult.error,
        tokenResult.data,
        tokenResult.isLoading,
        seasonResult.data,
        seasonDetailsResult.data,
        seasonDetailsResult.error,
        seasonLabelResult.data,
        seasonLabelResult.error,
        hashSeason,
        isPendingSeason,
        isConfirmingSeason,
        isConfirmedSeason,
        receiptErrorSeason,
        hashRound,
        isPendingRound,
        isConfirmingRound,
        isConfirmedRound,
        receiptErrorRound,
        hashPairing,
        isPendingPairing,
        isConfirmingPairing,
        isConfirmedPairing,
        receiptErrorPairing,
        hashResult,
        isPendingResult,
        isConfirmingResult,
        isConfirmedResult,
        receiptErrorResult,
        hashReward,
        isPendingReward,
        isConfirmingReward,
        isConfirmedReward,
        receiptErrorReward,
        hashEndSeason,
        isPendingEndSeason,
        isConfirmingEndSeason,
        isConfirmedEndSeason,
        receiptErrorEndSeason,
        hashSeasonReward,
        isPendingSeasonReward,
        isConfirmingSeasonReward,
        receiptErrorSeasonReward,
        roundResult.data,
        battleRoundResult.data,
        battleRoundResult.error,
        roundInfoResult.data,
        roundInfoResult.isLoading,
        roundInfoResult.error,
        participants,
        pairMatchResult.data,
        pairMatchResult.isLoading,
        pairMatchResult.error,
        pairMatches,
        roundDetailsResult.data,
        roundDetailsResult.isLoading,
        roundDetailsResult.error,
        orphanAddress,
        orphanMoonsterId,
        moonsterData,
        pairMoonsterData,
        winners,
        analyses,
        isRefetching,
    ]);

    const isCreateSeasonDisabled =
        !isConnected ||
        networkClient !== 4202 ||
        !isOwner ||
        isPendingSeason ||
        isConfirmingSeason ||
        (seasonResult.data && Number(seasonResult.data) > 0 && seasonState !== 'ended') as boolean;

    const isCreateRoundDisabled =
        !isConnected ||
        networkClient !== 4202 ||
        !isOwner ||
        isPendingRound ||
        isConfirmingRound ||
        (!seasonResult.data || Number(seasonResult.data) === 0) ||
        seasonState !== 'active' ||
        (roundResult.data && Number(roundResult.data) > 0 && roundState !== 'completed') as boolean;

    const isTriggerPairingDisabled =
        !isConnected ||
        networkClient !== 4202 ||
        !isOwner ||
        isPendingPairing ||
        isConfirmingPairing ||
        (!seasonResult.data || Number(seasonResult.data) === 0) ||
        !roundResult.data ||
        Number(roundResult.data) === 0 ||
        roundState !== 'regis' ||
        participants.length < 2;

    const isUpdateResultsDisabled =
        !isConnected ||
        networkClient !== 4202 ||
        !isOwner ||
        isPendingResult ||
        isConfirmingResult ||
        (!seasonResult.data || Number(seasonResult.data) === 0) ||
        !roundResult.data ||
        Number(roundResult.data) === 0 ||
        roundState !== 'ongoing' ||
        pairMatches.length === 0 ||
        winners.size !== pairMatches.length;

    const isDistributeRewardsDisabled =
        !isConnected ||
        networkClient !== 4202 ||
        !isOwner ||
        isPendingReward ||
        isConfirmingReward ||
        (!seasonResult.data || Number(seasonResult.data) === 0) ||
        !roundResult.data ||
        Number(roundResult.data) === 0 ||
        roundState !== 'ended' ||
        pairMatches.length === 0 ||
        pairMatches.some(match => match.winner === '0x0000000000000000000000000000000000000000');

    const isEndSeasonDisabled =
        !isConnected ||
        networkClient !== 4202 ||
        !isOwner ||
        isPendingEndSeason ||
        isConfirmingEndSeason ||
        (!seasonResult.data || Number(seasonResult.data) === 0) ||
        seasonState !== 'active';

    console.log({
        isConnected,
        networkClient,
        isPendingPairing,
        isConfirmingPairing,
        seasonResultData: seasonResult.data,
        roundResultData: roundResult.data,
        roundState,
        participantsLength: participants.length,
        isTriggerPairingDisabled,
    });


    return (
        <div className="max-w-5xl w-full mx-auto p-4">
            <h2 className="text-2xl font-bold text-white mb-4">Admin Panel</h2>
            {isRefetching || seasonResult.isLoading || roundResult.isLoading || battleRoundResult.isLoading || seasonLabelResult.isLoading ? (
                <div className="space-y-2">
                    {[...Array(3)].map((_, index) => (
                        <CryptoPokeSkeleton key={index} />
                    ))}
                </div>
            ) : (
                <div>
                    <div className="bg-gray-800 rounded-md shadow-xl p-4 border border-neutral-800 mb-4">

                        <p className="text-gray-50 mt-2">
                            <span className="font-semibold">Top Players:</span>{' '}
                            {topPlayersResult.error
                                ? 'Error fetching top players'
                                : topPlayers.length > 0
                                    ? topPlayers.map((player, index) => (
                                        <span key={player}>
                                            #{index + 1}: {shortenAddress(player)}{index < topPlayers.length - 1 ? ', ' : ''}
                                        </span>
                                    ))
                                    : 'No top players'}
                        </p>
                        <p className="text-gray-50 mt-2">
                            <span className="font-semibold">Current Round ID:</span>{' '}
                            {roundResult.error
                                ? 'Error fetching round'
                                : roundResult.data !== undefined
                                    ? Number(roundResult.data)
                                    : 'No Round Created'}
                        </p>
                        <p className="text-gray-50 mt-2">
                            <span className="font-semibold">Round State:</span>{' '}
                            {battleRoundResult.error
                                ? 'Error fetching round state'
                                : roundResult.data && Number(roundResult.data) > 0
                                    ? roundState || 'Unknown'
                                    : 'No Round Created'}
                        </p>

                    </div>

                    {isOwner && (
                        <Tabs defaultValue="seasons" className="w-full">
                            <TabsList className="grid w-full grid-cols-4 bg-zinc-400 text-muted-foreground ">
                                <TabsTrigger value="seasons">Seasons</TabsTrigger>
                                <TabsTrigger value="participants">Participants</TabsTrigger>
                                <TabsTrigger value="matches">Matches</TabsTrigger>
                                <TabsTrigger value="results">Results</TabsTrigger>
                            </TabsList>
                            <TabsContent value="seasons">
                                <div className="bg-gray-800 rounded-md shadow-xl p-4 border border-neutral-800 mb-4">
                                    <h3 className="text-xl font-bold text-gray-50 mb-4">Season Management</h3>
                                    {seasonResult.isLoading ? (
                                        <div className="space-y-2">
                                            {[...Array(1)].map((_, index) => (
                                                <CryptoPokeSkeleton key={index} />
                                            ))}
                                        </div>
                                    ) : seasonResult.error ? (
                                        <p className="text-red-500">
                                            Error fetching season: {seasonResult.error.message}
                                        </p>
                                    ) : (
                                        <><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <Button
                                                onClick={() => setIsSeasonModalOpen(true)}
                                                className="bg-blue-600 text-white hover:bg-blue-700 flex items-center space-x-2 mb-4"
                                                disabled={isCreateSeasonDisabled}
                                            >
                                                <FaPlus />
                                                <span>Create New Season</span>
                                            </Button>

                                            {Number(seasonResult.data) > 0 && seasonState === 'active' && (
                                                <Button
                                                    onClick={handleEndSeason}
                                                    className="bg-blue-600 text-white hover:bg-blue-700 flex items-center space-x-2 mb-4"
                                                    disabled={isEndSeasonDisabled}
                                                >
                                                    <FaMinus />
                                                    <span>End Season</span>
                                                </Button>
                                            )}

                                            <Button
                                                onClick={handleDistributeSeasonRewards}
                                                className="bg-pink-600 text-white hover:bg-pink-700"
                                                disabled={isDistributeDisabled}
                                            >
                                                {isDistributingSeasonReward || isConfirmingSeasonReward ? 'Distributing...' : 'Distribute Rewards'}
                                            </Button>
                                        </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                                                {Number(seasonResult.data) === 0 ? (
                                                    <p className="text-gray-400">No season created yet.</p>
                                                ) : (
                                                    <div>
                                                        <p className="text-gray-50">
                                                            <span className="font-semibold">Season ID:</span> {Number(seasonResult.data)}
                                                        </p>
                                                        <p className="text-gray-50">
                                                            <span className="font-semibold">Label:</span> {seasonLabelData || 'No Label'}
                                                        </p>
                                                        <p className="text-gray-50">
                                                            <span className="font-semibold">State:</span> {seasonState}
                                                        </p>
                                                        <p className="text-gray-50">
                                                            <span className="font-semibold">Token:</span> {seasonToken}
                                                        </p>
                                                        <p className="text-gray-50">
                                                            <span className="font-semibold">Prize Pool:</span> {Number(currentSeasonRewards)}
                                                        </p>
                                                        <p className="text-gray-50">
                                                            <span className="font-semibold">Reward Distribution:</span> #1: 35%, #2: 25%, #3: 20%, Owner: 20%
                                                        </p>
                                                    </div>
                                                )}
                                            </div></>
                                    )}
                                </div>
                            </TabsContent>
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
                                        <p className="text-gray-400">N/A Data</p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full table-auto text-gray-50">
                                                <thead>
                                                    <tr className="bg-gray-700">
                                                        <th className="px-4 py-2 text-left">Address</th>
                                                        <th className="px-4 py-2 text-left">Moonster ID</th>
                                                        <th className="px-4 py-2 text-left">Moonster Name</th>
                                                        <th className="px-4 py-2 text-left">Image</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {participants.map((participant, index) => {
                                                        const moonster = moonsterData.get(participant.moonsterId);
                                                        return (
                                                            <tr
                                                                key={`${participant.address}-${participant.moonsterId}`}
                                                                className="border-t border-gray-700"
                                                            >
                                                                <td className="px-4 py-2">
                                                                    {shortenAddress(participant.address)}
                                                                </td>
                                                                <td className="px-4 py-2">{participant.moonsterId}</td>
                                                                <td className="px-4 py-2 capitalize">
                                                                    {moonster ? moonster.name : 'Loading...'}
                                                                </td>
                                                                <td className="px-4 py-2">
                                                                    {moonster ? (
                                                                        <Image
                                                                        src={`${IMAGE_BASE_URL}${moonster.image}`}
                                                                            
                                                                            alt={`${moonster.name} artwork`}
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
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                            <TabsContent value="matches">
                                <div className="bg-gray-800 rounded-md shadow-xl p-4 border border-neutral-800 mb-4">
                                    <h3 className="text-xl font-bold text-gray-50 mb-4">Pair Matches</h3>
                                    {roundState === 'regis' ? (
                                        <p className="text-gray-400">N/A Data</p>
                                    ) : pairMatchResult.isLoading ? (
                                        <div className="space-y-2">
                                            {[...Array(2)].map((_, index) => (
                                                <CryptoPokeSkeleton key={index} />
                                            ))}
                                        </div>
                                    ) : pairMatchResult.error ? (
                                        <p className="text-red-500">
                                            Error fetching pair matches: {pairMatchResult.error.message}
                                        </p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full table-auto text-gray-50">
                                                <thead>
                                                    <tr className="bg-gray-700">
                                                        <th className="px-4 py-2 text-left">Player 1</th>
                                                        <th className="px-4 py-2 text-left">Moonster 1</th>
                                                        <th className="px-4 py-2 text-left">Image</th>
                                                        <th className="px-4 py-2 text-left">vs</th>
                                                        <th className="px-4 py-2 text-left">Player 2</th>
                                                        <th className="px-4 py-2 text-left">Moonster 2</th>
                                                        <th className="px-4 py-2 text-left">Image</th>
                                                        <th className="px-4 py-2 text-left">Winner</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {pairMatches.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={8} className="px-4 py-2 text-center text-gray-400">
                                                                No pair matches available.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        pairMatches.map((match, index) => {
                                                            const pokemon1 = pairMoonsterData.get(match.id1);
                                                            const pokemon2 = pairMoonsterData.get(match.id2);
                                                            const isWinnerTBD = match.winner === '0x0000000000000000000000000000000000000000';
                                                            return (
                                                                <tr key={index} className="border-t border-gray-700">
                                                                    <td className="px-4 py-2">{shortenAddress(match.player1)}</td>
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
                                                                    <td className="px-4 py-2">{shortenAddress(match.player2)}</td>
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
                                                        })
                                                    )}
                                                    {orphanAddress && (
                                                        <>
                                                            <tr className="border-t border-gray-700 bg-gray-700">
                                                                <td colSpan={8} className="px-4 py-2 text-center text-yellow-400 font-semibold">
                                                                    Orphan Match
                                                                </td>
                                                            </tr>
                                                            <tr className="border-t border-gray-700">
                                                                <td className="px-4 py-2">{shortenAddress(orphanAddress)}</td>
                                                                <td className="px-4 py-2 capitalize">
                                                                    {orphanMoonsterId && moonsterData.get(orphanMoonsterId)
                                                                        ? moonsterData.get(orphanMoonsterId)?.name || 'Loading...'
                                                                        : 'Loading...'}{' '}
                                                                    (#{orphanMoonsterId || 'N/A'})
                                                                </td>
                                                                <td className="px-4 py-2">
                                                                    {orphanMoonsterId && moonsterData.get(orphanMoonsterId) ? (
                                                                        <Image
                                                                        src={`${IMAGE_BASE_URL}{moonsterData.get(orphanMoonsterId)?.image || '/no_image.png'}`}                                                                           
                                                                            alt="Orphan Moonster artwork"
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
                                                                <td colSpan={4} className="px-4 py-2 text-center text-gray-400">
                                                                    No opponent (orphan participant)
                                                                </td>
                                                                <td className="px-4 py-2">N/A</td>
                                                            </tr>
                                                        </>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                            <TabsContent value="results">
                                <div className="bg-gray-800 rounded-md shadow-xl p-4 border border-neutral-800 mb-4">
                                    <h3 className="text-xl font-bold text-gray-50 mb-4">Match Results</h3>
                                    {roundState === 'regis' ? (
                                        <p className="text-gray-400">N/A Data</p>
                                    ) : pairMatchResult.isLoading ? (
                                        <div className="space-y-2">
                                            {[...Array(2)].map((_, index) => (
                                                <CryptoPokeSkeleton key={index} />
                                            ))}
                                        </div>
                                    ) : pairMatchResult.error ? (
                                        <p className="text-red-500">
                                            Error fetching pair matches: {pairMatchResult.error.message}
                                        </p>
                                    ) : (
                                        <>
                                            <div className="overflow-x-auto">
                                                <table className="w-full table-auto text-gray-50">
                                                    <thead>
                                                        <tr className="bg-gray-700">
                                                            <th className="px-4 py-2 text-left">Player 1</th>
                                                            <th className="px-4 py-2 text-left">Moonster 1</th>
                                                            <th className="px-4 py-2 text-left">Image</th>
                                                            <th className="px-4 py-2 text-left">vs</th>
                                                            <th className="px-4 py-2 text-left">Player 2</th>
                                                            <th className="px-4 py-2 text-left">Moonster 2</th>
                                                            <th className="px-4 py-2 text-left">Image</th>
                                                            <th className="px-4 py-2 text-left">Predicted Winner</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {pairMatches.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={8} className="px-4 py-2 text-center text-gray-400">
                                                                    No pair matches available.
                                                                </td>
                                                            </tr>
                                                        ) : winners.size !== pairMatches.length ? (
                                                            <tr>
                                                                <td colSpan={8} className="px-4 py-2 text-center text-gray-400">
                                                                    Calculating winners...
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            pairMatches.map((match, index) => {
                                                                const pokemon1 = pairMoonsterData.get(match.id1);
                                                                const pokemon2 = pairMoonsterData.get(match.id2);
                                                                const predictedWinner = winners.get(index);
                                                                const isWinnerTBD = !predictedWinner || predictedWinner === '0x0000000000000000000000000000000000000000';
                                                                return (
                                                                    <tr key={index} className="border-t border-gray-700">
                                                                        <td className="px-4 py-2">{shortenAddress(match.player1)}</td>
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
                                                                        <td className="px-4 py-2">{shortenAddress(match.player2)}</td>
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
                                                                            {isWinnerTBD ? 'TBD' : shortenAddress(predictedWinner)}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {roundState === 'ongoing' && (
                                                <div className="mt-4 flex space-x-4">
                                                    <Button
                                                        onClick={handleSubmitResults}
                                                        className="bg-purple-600 text-white hover:bg-purple-700"
                                                        disabled={isUpdateResultsDisabled}
                                                    >
                                                        {isPendingResult || isConfirmingResult ? 'Submitting...' : 'Submit Results'}
                                                    </Button>

                                                </div>
                                            )}
                                            {roundState === 'ended' && (
                                                <div className="mt-4 flex space-x-4">

                                                    <Button
                                                        onClick={handleDistributeRewards}
                                                        className="bg-pink-600 text-white hover:bg-pink-700 flex items-center space-x-2"
                                                        disabled={isDistributeRewardsDisabled}
                                                    >
                                                        <FaGift />
                                                        <span>{isPendingReward || isConfirmingReward ? 'Distributing...' : 'Distribute Rewards'}</span>
                                                    </Button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    )}
                    {isOwner && (
                        <div className="flex space-x-4">
                            {/* {( seasonResult.data && Number(seasonResult.data) > 0 ) && seasonState === 'active' && ( */}
                            {Number(seasonResult.data) > 0 && seasonState === 'active' && (
                                <Button
                                    onClick={() => setIsRoundModalOpen(true)}
                                    className="bg-blue-600 text-white hover:bg-blue-700 flex items-center space-x-2"
                                    disabled={isCreateRoundDisabled}
                                >
                                    <FaPlus />
                                    <span>Create New Round</span>
                                </Button>
                            )}
                            {/* {seasonResult.data && Number(seasonResult.data) > 0 && seasonState === 'active' && roundResult.data && Number(roundResult.data) > 0 && roundState === 'regis' && participants.length >= 2 && ( */}
                            {Number(seasonResult.data) > 0 && seasonState === 'active' && Number(roundResult.data) > 0 && roundState === 'regis' && participants.length >= 2 && (
                                <Button
                                    onClick={handleTriggerPairing}
                                    className="bg-green-600 text-white hover:bg-green-700 flex items-center space-x-2"
                                    disabled={isTriggerPairingDisabled}
                                >
                                    <FaRandom />
                                    <span>Trigger Pairing</span>
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            )}

            <Dialog open={isSeasonModalOpen} onOpenChange={setIsSeasonModalOpen}>
                <DialogContent className="bg-gray-800 text-gray-50 border-neutral-700 max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Create New Season</DialogTitle>
                        <DialogDescription className="text-gray-300">
                            Enter the base rewards, select an accepted token, and provide a label to start a new season.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSeason} className="space-y-4">
                        <div>
                            <label htmlFor="baseRewards" className="block text-sm font-medium text-gray-50">
                                Base Rewards
                            </label>
                            <input
                                id="baseRewards"
                                type="number"
                                step="100"
                                min="100"
                                value={baseRewards}
                                onChange={(e) => setBaseRewards(e.target.value)}
                                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-gray-50 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                                placeholder="Enter base rewards (e.g., 100)"
                                required
                            />
                            <p className="mt-1 text-xs text-gray-400">
                                Enter the amount in human-readable format (e.g., 100 for 100.00 tokens). It will be adjusted based on the token's decimals.
                            </p>
                        </div>
                        <div>
                            <label htmlFor="seasonToken" className="block text-sm font-medium text-gray-50">
                                Token Address
                            </label>
                            <select
                                id="seasonToken"
                                value={selectedSeasonToken}
                                onChange={(e) => setSelectedSeasonToken(e.target.value)}
                                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-gray-50 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                                required
                            >
                                <option value="">Select a token</option>
                                {tokenAddresses.map((tokenAddress, index) => (
                                    <option key={tokenAddress} value={tokenAddress}>
                                        {shortenAddress(tokenAddress)} (Balance: {balances[index] ? formatUnits(balances[index], decimals[index]) : '0'}, Decimals: {decimals[index]})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="seasonLabel" className="block text-sm font-medium text-gray-50">
                                Season Label
                            </label>
                            <input
                                id="seasonLabel"
                                type="text"
                                value={seasonLabel}
                                onChange={(e) => setSeasonLabel(e.target.value)}
                                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-gray-50 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                                placeholder="Enter season label (e.g., Season 1)"
                                required
                            />
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button
                                type="button"
                                onClick={() => setIsSeasonModalOpen(false)}
                                className="bg-gray-600 text-white hover:bg-gray-700"
                                disabled={isPendingSeason || isConfirmingSeason}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-blue-600 text-white hover:bg-blue-700"
                                disabled={isCreateSeasonDisabled || isPendingSeason || isConfirmingSeason}
                            >
                                {isPendingSeason || isConfirmingSeason ? 'Creating...' : 'Create Season'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={isRoundModalOpen} onOpenChange={setIsRoundModalOpen}>
                <DialogContent className="bg-gray-800 text-gray-50 border-neutral-700 max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Create New Round</DialogTitle>
                        <DialogDescription className="text-gray-300">
                            Create a new round for the current season. Ensure the season is active and the previous round is completed.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitRound} className="space-y-4"> <div>
                        <p className="text-sm text-gray-50"> <span className="font-semibold">Current Season:</span> {seasonResult.data ? Number(seasonResult.data) : 'None'} </p>
                        <p className="text-sm text-gray-50"> <span className="font-semibold">Season State:</span> {seasonState || 'Unknown'} </p>
                        <p className="text-sm text-gray-50"> <span className="font-semibold">Current Round:</span> {roundResult.data ? Number(roundResult.data) : 'None'} </p>
                        <p className="text-sm text-gray-50"> <span className="font-semibold">Round State:</span> {roundState || 'Unknown'} </p>
                    </div>
                        <div className="flex justify-end space-x-2">
                            <Button type="button" onClick={() => setIsRoundModalOpen(false)} className="bg-gray-600 text-white hover:bg-gray-700" disabled={isPendingRound || isConfirmingRound} >
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700" disabled={isCreateRoundDisabled || isPendingRound || isConfirmingRound} > {isPendingRound || isConfirmingRound ? 'Creating...' : 'Create Round'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>);
};
export default AdminPanel;