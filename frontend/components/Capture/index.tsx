'use client';

import Image from 'next/image';
import { useCapture } from '@/context/CaptureContext';
import { useAction } from '@/context/ActionContext';
import { useEffect, useState, useMemo } from 'react';
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/button';
import { FaBookmark, FaCircle, FaInfoCircle } from 'react-icons/fa';
import PokeballIcon from '../Icon';
import { toast } from 'sonner';
import { Tooltip } from 'react-tooltip';
import { IoMdGitCompare } from 'react-icons/io';
import { useComparison } from '@/context/ComparisonContext';
import { abiUserManager, abiIDRXCP } from '@/utils';
import { SC_USER_MANAGER, SC_IDRXCP_TESTNET } from '@/context/constants';
import { getMoonsterByIds } from '@/actions/getMoonsterData';
import { MoonstersDetails } from '@/types/moonsters';
import { fetchMoonsterEvolution } from '@/actions/moonsterAction'; // Updated import
import { EvolutionDetails } from '@/types/evolution';
import { useDebounce } from 'use-debounce';
import { CryptoPokeSkeleton } from '../Loader';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { formatUnits } from 'ethers';

type EVMAddress = `0x${string}`;
interface CaptureMoonsterProps {
    walletState: boolean;
    netWorkId: number;
}
const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_IMAGE_BASE;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const CaptureMoonster: React.FC<CaptureMoonsterProps> = ({ walletState, netWorkId }) => {
    const router = useRouter();
    const { setMoonster } = useAction(); 
    const queryClient = useQueryClient();
    const { data: hash, isPending, writeContract, error: writeError, reset: resetWrite } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed, error: receiptError } = useWaitForTransactionReceipt({ hash });
    const [transactionStep, setTransactionStep] = useState<'idle' | 'approve' | 'bookmark' | 'remove'>('idle');
    const [moonsterId, setMoonsterId] = useState<number>(0);
    const [currentMoonsterName, setCurrentMoonsterName] = useState<string>('');
    const [addressClient, setAddressClient] = useState<EVMAddress | undefined>(undefined);

    const { captureList, addToCapture, removeFromCapture, clearCapture, isMounted } = useCapture();
    const { actionCapture, isActionPending, isActionConfirming } = useAction();
    const { address, chainId, isConnected } = useAccount();
    const [isClient, setIsClient] = useState(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [networkClient, setNetworkClient] = useState<number | null>(null);
    const { comparisonList, addToComparison, isMounted: isCompareMounted } = useComparison();
    const [feeBookMarks, setFeeBookMarks] = useState<bigint | null>(null);
    const [feeCapture, setFeeCapture] = useState<bigint | null>(null);
    const [bookmarkedMoonster, setBookmarkedMoonster] = useState<MoonstersDetails[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [bookmarkOrder, setBookmarkOrder] = useState<number[]>([]);
    const [transactionSubmitted, setTransactionSubmitted] = useState<boolean>(false);
    const [evolutionData, setEvolutionData] = useState<Map<number, EvolutionDetails>>(new Map());

    const [isActionPendingCapture, setIsActionPendingCapture] = useState(false);
    const [isActionConfirmingCapture, setIsActionConfirmingCapture] = useState(false);

    const chainNetwork = Number(chainId);
    const itemsPerPage = 3;
    const totalPages = Math.ceil(bookmarkedMoonster.length / itemsPerPage);
    const paginatedMoonster = bookmarkedMoonster.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage,
    );

    const maxCaptureLimit = Number(process.env.NEXT_PUBLIC_MAX_CAPTURED_MOONSTER) || 5;

    const { data: listBmMoonster, queryKey: bookmarksQueryKey, isLoading: isBookmarksLoading, error: bookmarksError } = useReadContract({
        abi: abiUserManager,
        address: SC_USER_MANAGER,
        functionName: 'getUserBookmarks',
        args: address ? [address] : undefined,
    });

    const { data: capturedIds, isLoading: isCapturedIdsLoading, error: capturedIdsError } = useReadContract({
        abi: abiUserManager,
        address: SC_USER_MANAGER,
        functionName: 'getUserIds',
        args: address ? [address] : undefined,
        chainId: 4202,
    });

    console.log("capturedIds:", capturedIds);

    const isEmptyDataError = useMemo(
        () => bookmarksError && bookmarksError.message.includes('returned no data ("0x")'),
        [bookmarksError]
    );

    const isMaxCaptureReached = useMemo(() => {
        if (isCapturedIdsLoading || capturedIdsError || !capturedIds) return false;
        return capturedIds.length >= maxCaptureLimit;
    }, [capturedIds, isCapturedIdsLoading, capturedIdsError, maxCaptureLimit]);

    // Fetch and update evolution data
    useEffect(() => {
        const fetchEvolutions = async () => {
            const newEvolutionData = new Map<number, EvolutionDetails>();
            for (const moonster of captureList) {
                const evolution = await fetchMoonsterEvolution(moonster.id);
                newEvolutionData.set(moonster.id, evolution);
            }
            setEvolutionData(newEvolutionData);
        };
        fetchEvolutions();
    }, [captureList]);

    // Update bookmarked Moonster details
    useEffect(() => {
        const fetchBookmarkedMoonster = async () => {
            if (isEmptyDataError) {
                if (bookmarkedMoonster.length !== 0 || bookmarkOrder.length !== 0) {
                    setBookmarkedMoonster([]);
                    setBookmarkOrder([]);
                    setCurrentPage(1);
                }
            } else if (listBmMoonster && Array.isArray(listBmMoonster) && listBmMoonster.length > 0) {
                const ids = listBmMoonster.map((id) => Number(id));
                const sortedIds = ids.sort((a, b) => {
                    const aIndex = bookmarkOrder.indexOf(a);
                    const bIndex = bookmarkOrder.indexOf(b);
                    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                    if (aIndex !== -1) return -1;
                    if (bIndex !== -1) return 1;
                    return 0;
                });
                const moonsterDetails = await getMoonsterByIds(sortedIds);
                setBookmarkedMoonster(moonsterDetails);
                setCurrentPage(1);
            } else if (listBmMoonster && Array.isArray(listBmMoonster) && listBmMoonster.length === 0) {
                if (bookmarkedMoonster.length !== 0 || bookmarkOrder.length !== 0) {
                    setBookmarkedMoonster([]);
                    setBookmarkOrder([]);
                    setCurrentPage(1);
                }
            }
        };
        fetchBookmarkedMoonster();
    }, [listBmMoonster, bookmarkOrder, isEmptyDataError]);

    useEffect(() => {
        if (address) {
            setIsClient(true);
            setNetworkClient(chainNetwork);
            setAddressClient(address);
        } else {
            setIsClient(false);
        }
        setTimeout(() => setLoading(false), 2000);
    }, [address, chainId, isConnected]);

    useEffect(() => {
        if (netWorkId !== 4202) {
            router.push('/');
        }
    }, [netWorkId, router]);

    const { data: checkDataFees } = useReadContract({
        abi: abiUserManager,
        address: SC_USER_MANAGER,
        functionName: 'getFees',
        args: [SC_IDRXCP_TESTNET],
    });

    const [baseFee, bookmarkFee] = (checkDataFees ?? [BigInt(0), BigInt(0), BigInt(0)]) as [bigint, bigint, bigint];

    useEffect(() => {
        if (netWorkId === 4202) {
            setFeeBookMarks(bookmarkFee);
            setFeeCapture(baseFee);
        }
    }, [baseFee, bookmarkFee, netWorkId]);

    const addtoBookmark = async (id: number) => {
        if (!isConnected) {
            toast.error('Please connect your wallet to bookmark Moonster.');
            return;
        }
        if (networkClient !== 4202) {
            toast.error('Please switch to the Lisk Sepolia Testnet.');
            return;
        }
        if (!feeBookMarks) {
            toast.error('Bookmark fee not available.');
            return;
        }
        if (id <= 0 || !Number.isInteger(id)) {
            toast.error('Invalid Moonster ID.');
            return;
        }
        if (!addressClient) {
            toast.error('No wallet address found.');
            return;
        }

        try {
            setMoonsterId(id);
            setTransactionStep('approve');
            writeContract({
                address: SC_IDRXCP_TESTNET,
                abi: abiIDRXCP,
                functionName: 'approve',
                args: [SC_USER_MANAGER, feeBookMarks],
            });
        } catch (err) {
            console.error('Error initiating approve transaction:', err);
            toast.error('Failed to initiate approve transaction.');
            setTransactionStep('idle');
            setMoonsterId(0);
            resetWrite();
        }
    };

    const removeBmSC = async (id: number) => {
        if (!isConnected) {
            toast.error('Please connect your wallet to remove bookmark.');
            return;
        }
        if (networkClient !== 4202) {
            toast.error('Please switch to the Lisk Sepolia Testnet.');
            return;
        }
        if (id <= 0 || !Number.isInteger(id)) {
            toast.error('Invalid Moonster ID.');
            return;
        }
        if (!addressClient) {
            toast.error('No wallet address found.');
            return;
        }

        try {
            setMoonsterId(id);
            setTransactionStep('remove');
            writeContract({
                address: SC_USER_MANAGER,
                abi: abiUserManager,
                functionName: 'removeBookmark',
                args: [BigInt(id)],
            });
        } catch (err) {
            console.error('Error initiating remove:', err);
            toast.error('Failed to initiate remove.');
            setTransactionStep('idle');
            setMoonsterId(0);
            resetWrite();
        }
    };

    const addMoonsterToCaptureList = (moonster: MoonstersDetails) => {
        if (isMaxCaptureReached || isMoonsterCaptured(moonster.id)) {
            toast.error('Max Capture Reached or Moonster already captured in evolution chain');
            return;
        }
        const moonsterWithEvolution = {
            ...moonster,
            evolutionChain: moonster.evolutionChain || [],
        };
        addToCapture(moonsterWithEvolution);
    };

    useEffect(() => {
        if (transactionStep === 'approve' && isConfirmed && hash) {
            const initiateBookmark = async () => {
                try {
                    setTransactionStep('bookmark');
                    writeContract({
                        address: SC_USER_MANAGER,
                        abi: abiUserManager,
                        functionName: 'bookmarkPokemon',
                        args: [BigInt(moonsterId), SC_IDRXCP_TESTNET],
                    });
                } catch (err) {
                    console.error('Error initiating bookmark transaction:', err);
                    toast.error('Failed to initiate bookmark transaction.');
                    setTransactionStep('idle');
                    setMoonsterId(0);
                    resetWrite();
                }
            };
            initiateBookmark();
        } else if (transactionStep === 'bookmark' && isConfirmed && hash) {
            setBookmarkOrder((prev) => [moonsterId, ...prev.filter((id) => id !== moonsterId)]);
            const moonster = captureList.find((m) => m.id === moonsterId);
            if (moonster) {
                removeFromCapture(moonster.name);
                toast.success(`${moonster.name} removed from capture list.`);
            }

            delay(5000);

            queryClient.invalidateQueries({ queryKey: bookmarksQueryKey, refetchType: 'active' });

            delay(2000);

            toast.dismiss();
            setTransactionStep('idle');
            setMoonsterId(0);
            resetWrite();
        } else if (transactionStep === 'remove' && isConfirmed && hash) {
            setBookmarkOrder((prev) => prev.filter((id) => id !== moonsterId));
            const moonster = bookmarkedMoonster.find((m) => m.id === moonsterId);
            if (moonster) {
                toast.success(`${moonster.name} bookmark removed.`);
            }

            delay(5000);

            queryClient.invalidateQueries({ queryKey: bookmarksQueryKey, refetchType: 'active' });

            delay(2000);
            toast.dismiss();
            setTransactionStep('idle');
            setMoonsterId(0);
            resetWrite();
        }
    }, [transactionStep, isConfirmed, hash, moonsterId, captureList, removeFromCapture, queryClient, bookmarksQueryKey, bookmarkedMoonster, writeContract, resetWrite]);

    useEffect(() => {
        if (receiptError) {
            console.error('Transaction receipt error:', receiptError);
            toast.error(`Transaction failed: ${receiptError.message || 'Unknown error'}`);
            toast.dismiss();
            setTransactionStep('idle');
            setMoonsterId(0);
            resetWrite();
        }
    }, [receiptError, resetWrite]);

    useEffect(() => {
        if (writeError) {
            console.error('WriteContract error:', writeError);
            if (writeError.message.includes('User rejected the request')) {
                toast.error('Transaction rejected. No fees were charged.');
                toast.dismiss();
            } else {
                toast.error(`Transaction error: ${writeError.message}`);
                toast.dismiss();
            }
            setTransactionStep('idle');
            setMoonsterId(0);
            resetWrite();
        }
    }, [writeError, resetWrite]);

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (isConfirming && transactionStep !== 'idle') {
            timeout = setTimeout(() => {
                console.warn('Transaction confirmation timeout, dismissing toast');
                toast.error('Transaction confirmation timed out. Please check the transaction status.');
                setTransactionStep('idle');
                setMoonsterId(0);
                resetWrite();
            }, 30000);
        }
        return () => clearTimeout(timeout);
    }, [isConfirming, transactionStep, resetWrite]);

    useEffect(() => {
        if (isPending) {
            toast.loading(
                `${transactionStep === 'approve' ? 'Approve for Bookmark' : transactionStep === 'bookmark' ? 'Bookmark' : 'Remove'} transaction is pending...`,
                { id: `pending-${transactionStep}`, duration: 5000 }
            );
        } else if (isConfirming) {
            toast.loading(
                `Waiting for ${transactionStep === 'approve' ? 'approve for bookmark' : transactionStep === 'bookmark' ? 'bookmark' : 'remove'} confirmation...`,
                { id: `confirming-${transactionStep}`, duration: 5000 }
            );
        } else if (isConfirmed) {
            if (transactionStep === 'approve') {
                toast.success('Approve for bookmark transaction confirmed. Initiating bookmark...', { id: 'approve-confirmed' });
            } else if (transactionStep === 'bookmark') {
                toast.success('Bookmark transaction confirmed successfully.', { id: 'bookmark-confirmed' });
            } else if (transactionStep === 'remove') {
                toast.success('Remove transaction confirmed successfully.', { id: 'remove-confirmed' });
            }
        }
    }, [isPending, isConfirming, isConfirmed, transactionStep]);

    if (!isMounted || !isCompareMounted) {
        return null;
    }

    const isMoonsterCaptured = (moonsterId: number) => {
        if (isCapturedIdsLoading || capturedIdsError || !capturedIds) return false;
        const capturedIdsList = capturedIds.map((id) => Number(id));
        const evolution = evolutionData.get(moonsterId);
        if (evolution && evolution.chain.length > 0) {
            const evolutionIds = evolution.chain.map((evo) => evo.id).filter((id): id is number => id !== undefined);
            return capturedIdsList.includes(moonsterId) || evolutionIds.some((id) => capturedIdsList.includes(id));
        }
        return capturedIdsList.includes(moonsterId);
    };

    useEffect(() => {
        if (isActionPending && hash) {
            setTransactionSubmitted(true);
        }
        if (!isActionPending && !isActionConfirming) {
            setTransactionSubmitted(false);
        }
    }, [isActionPending, hash, isActionConfirming]);

    const actionCaptureNew = async (id: number, chance: number, name: string) => {
        setIsActionPendingCapture(true);
        try {
            if (isMaxCaptureReached || isMoonsterCaptured(id)) {
                toast.error('Max Capture Reached or Moonster already captured in evolution chain');
                return;
            }

            // Send POST request to API route with moonster data in body
            const response = await fetch('/api/capture-in-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, chance, name }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setMoonster(data.moonster);
                    router.push('/capture-in-action');
                } else {
                    toast.error(data.message || 'Failed to initiate capture.');
                }
            } else {
                toast.error('Server error during capture initiation.');
            }
        } catch (error) {
            toast.error('Failed to initiate capture.');
            console.error('Capture error:', error);
        } finally {
            setIsActionPendingCapture(false);
            setIsActionConfirmingCapture(false);
        }
    };

    return (
        <div className="max-w-5xl w-full mx-auto p-4">
            <Dialog
                open={transactionSubmitted || isActionConfirming}
                onOpenChange={(open) => {
                    if (!open && !(isActionPending || isActionConfirming)) {
                        setCurrentMoonsterName('');
                        setTransactionSubmitted(false);
                    }
                }}
            >
                <DialogContent className="bg-gray-800 text-gray-50 border-neutral-700 max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold capitalize">
                            Capturing {currentMoonsterName}
                        </DialogTitle>
                        <DialogDescription className="text-gray-300 flex items-center">
                            Transaction in progress...
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 space-y-2">
                        <p>
                            <span className="font-semibold">Your Capture Chance:</span> {captureList.find(m => m.name === currentMoonsterName)?.chance || 0}%
                        </p>
                        <p className="flex items-center space-x-2">
                            <span className="font-semibold">Capture Fee:</span>
                            {feeCapture ? formatUnits(feeCapture, 2) : 'N/A'}
                            <Image src="/tokens/26732.png" alt="IDRX" height={24} width={24} />
                        </p>
                        <p className="text-yellow-400">
                            <span className="font-semibold">Warning:</span> Transaction with capture chance below 100% may fail to capture this Moonster, but the capture fee will still be charged.
                        </p>
                    </div>
                    <div className="mt-4">
                        <button
                            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                            onClick={() => {
                                if (!(isActionPending || isActionConfirming)) {
                                    setCurrentMoonsterName('');
                                }
                            }}
                            disabled={isActionPending || isActionConfirming}
                        >
                            Close
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            <div>
                <h2 className="text-2xl font-bold text-white mb-4">List Hunt Moonster</h2>
                {loading || isCapturedIdsLoading ? (
                    <div><CryptoPokeSkeleton /></div>
                ) : captureList.length === 0 ? (
                    <div className="text-center text-white mb-8">
                        <p>No Moonsters selected for capture.</p>
                        <p>Go to the Search tab to select Moonsters with location data.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {captureList.map((moonster) => {
                                // Check if this Moonster is currently being captured
                                const isCapturingThisMoonster =
                                    (isActionPending || isActionConfirming) && moonster.name === currentMoonsterName;

                                return isCapturingThisMoonster ? (
                                    <CardSkeleton key={moonster.name} />
                                ) : (
                                    <div key={moonster.name} className="bg-gray-800 rounded-md shadow-xl p-4 border border-neutral-800">
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="text-xl font-bold capitalize text-gray-50">{moonster.name}</h3>
                                            <Button
                                                onClick={() => removeFromCapture(moonster.name)}
                                                className="my-close-class px-4 py-5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                                            >
                                                X
                                            </Button>
                                            <Tooltip anchorSelect=".my-close-class" content="Remove from Capture" />
                                        </div>
                                        <div className="flex justify-center mb-2">
                                            <Image
                                                src={`${IMAGE_BASE_URL}${moonster.image}`}
                                                alt={`${moonster.name} artwork`}
                                                width={150}
                                                height={150}
                                                className="object-contain"
                                                placeholder="blur"
                                                blurDataURL="/no_image.png"
                                            />
                                        </div>
                                        <div className="text-gray-50 text-sm">
                                            <p><span className="font-semibold">Location:</span> {moonster.location}</p>
                                            <p><span className="font-semibold">Capture Chance:</span> {moonster.chance}%</p>
                                        </div>
                                        <div className="text-gray-50 text-sm mt-2 grid grid-cols-2 gap-2">
                                            <FaInfoCircle
                                                className="my-info-class text-[#fff7ca] h-8 w-8 hover:text-pink-700 border-2 border-[#ccd1cc] rounded-full p-1 bg-black/50"
                                                onClick={() => router.push(`/moonster/${moonster.name}`)}
                                                aria-label="View Moonster Details"
                                            />
                                            <Tooltip anchorSelect=".my-info-class" content="View Moonster Details" />
                                            <button
                                                className="my-bookmark-class bg-white rounded-2xl text-black hover:bg-yellow-700"
                                                onClick={() => addtoBookmark(moonster.id)}
                                                disabled={isPending || isConfirming || transactionStep !== 'idle'}
                                            >
                                                {isPending || isConfirming
                                                    ? `Processing ${transactionStep === 'approve' ? 'Approve' : transactionStep === 'bookmark' ? 'Bookmark' : 'Remove'}...`
                                                    : 'Bookmark'}
                                            </button>
                                            <Tooltip anchorSelect=".my-bookmark-class" content="Bookmark Moonster" />
                                            <IoMdGitCompare
                                                className={`my-compare-class h-8 w-8 border-2 border-[#083ac2] rounded-full p-1 bg-black/50 ${comparisonList.some(item => item.name === moonster.name)
                                                    ? 'text-pink-700'
                                                    : 'text-[#0caa68] hover:text-pink-700'
                                                    }`}
                                                onClick={() => addToComparison(moonster.name, moonster.id)}
                                            />
                                            <Tooltip anchorSelect=".my-compare-class" content="Compare Moonster" />
                                            {isMoonsterCaptured(moonster.id) ? (
                                                <span className="my-captured-class text-green-400 font-semibold bg-green-900/50 rounded-2xl px-4 py-2 text-center">
                                                    Captured (Evolution Chain)
                                                </span>
                                            ) : (
                                                <button
                                                    className={`my-capture-class bg-white rounded-2xl hover:bg-amber-900 inline-flex text-zinc-900 items-center justify-center group overflow-hidden ${isMaxCaptureReached ? 'opacity-50 cursor-not-allowed' : ''
                                                        }`}
                                                    onClick={() => {
                                                        if (isMaxCaptureReached || isMoonsterCaptured(moonster.id)) {
                                                            toast.error('Max Capture Reached or Moonster already captured in evolution chain');
                                                            return;
                                                        }
                                                        setCurrentMoonsterName(moonster.name);
                                                        // actionCapture(moonster.id, moonster.chance, moonster.name);
                                                        actionCaptureNew(moonster.id, moonster.chance, moonster.name);
                                                    }}
                                                    disabled={isActionPending || isActionConfirming || isMaxCaptureReached || isMoonsterCaptured(moonster.id) || isActionPendingCapture || isActionConfirmingCapture  }
                                                >
                                                    <span className="p-1 text-sm transition-transform duration-300 transform group-hover:translate-x-2">
                                                        Capture
                                                    </span>

                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-4 text-center">
                            <button
                                onClick={clearCapture}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
                            >
                                Clear Capture List
                            </button>
                            <button
                                onClick={() => {
                                    console.log('Manual refresh clicked, refetching getUserBookmarks');
                                    queryClient.invalidateQueries({
                                        queryKey: bookmarksQueryKey,
                                        refetchType: 'active',
                                    });
                                }}
                                className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Refresh Bookmarks
                            </button>
                        </div>
                    </>
                )}
            </div>

            <div className="mt-8">
                <h2 className="text-2xl font-bold text-white mb-4">Bookmarked Moonsters</h2>
                {isBookmarksLoading || isCapturedIdsLoading ? (
                    <div><CryptoPokeSkeleton /></div>
                ) : isEmptyDataError || bookmarkedMoonster.length === 0 ? (
                    <div className="text-center text-white">
                        <p>No Moonsters bookmarked yet or if u have please wait for collecting data</p>
                    </div>
                ) : bookmarksError ? (
                    <div className="text-center text-red-500 bg-red-900/50 p-4 rounded-md">
                        {bookmarksError.message || 'Failed to load bookmarked Moonsters'}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {paginatedMoonster.map((moonster) => (
                                <div key={moonster.name} className="bg-gray-800 rounded-md shadow-xl p-4 border border-neutral-800">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-xl font-bold capitalize text-gray-50">{moonster.name}</h3>
                                        <Button
                                            onClick={() => removeBmSC(moonster.id)}
                                            className="my-close-class px-4 py-5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                                            disabled={isPending || isConfirming || transactionStep !== 'idle'}
                                        >
                                            X
                                        </Button>
                                        <Tooltip anchorSelect=".my-close-class" content="Remove Bookmark" />
                                    </div>
                                    <div className="flex justify-center mb-2">
                                        <Image
                                            src={`${IMAGE_BASE_URL}${moonster.image}`}
                                            alt={`${moonster.name} artwork`}
                                            width={150}
                                            height={150}
                                            className="object-contain"
                                            placeholder="blur"
                                            blurDataURL="/no_image.png"
                                        />
                                    </div>
                                    <div className="text-gray-50 text-sm">
                                        <p><span className="font-semibold">Description:</span> {moonster.description}</p>
                                        <p><span className="font-semibold">Location:</span> {moonster.location || 'Unknown Location'}</p>
                                        <p><span className="font-semibold">Capture Chance:</span> {moonster.chance || 0}%</p>
                                    </div>
                                    <div className="text-gray-50 text-sm mt-2 grid grid-cols-3 gap-2 justify-items-center">
                                        <FaCircle
                                            className={`my-capture-class text-[#8b1000] h-8 w-8 border-2 border-[#ccd1cc] rounded-full p-1 bg-black/50 ${isMaxCaptureReached || isMoonsterCaptured(moonster.id) ? 'opacity-50 cursor-not-allowed' : ' hover:text-pink-700'
                                                }`}
                                            onClick={() => addMoonsterToCaptureList(moonster)}
                                            aria-label="Add to Capture List"
                                        />
                                        <Tooltip
                                            anchorSelect=".my-capture-class"
                                            content={isMoonsterCaptured(moonster.id)
                                                ? 'Moonster or its evolution already captured'
                                                : isMaxCaptureReached
                                                    ? 'Max Capture Reached'
                                                    : 'Capture Now'}
                                        />
                                        <FaInfoCircle
                                            className="my-info-class text-[#fff7ca] h-8 w-8  hover:text-pink-700 border-2 border-[#ccd1cc] rounded-full p-1 bg-black/50"
                                            onClick={() => router.push(`/moonster/${moonster.name}`)}
                                            aria-label="View Moonster Details"
                                        />
                                        <Tooltip anchorSelect=".my-info-class" content="View Moonster Details" />
                                        <IoMdGitCompare
                                            className={`my-compare-class h-8 w-8  border-2 border-[#083ac2] rounded-full p-1 bg-black/50 ${comparisonList.some(item => item.name === moonster.name)
                                                ? 'text-pink-700'
                                                : 'text-[#0caa68] hover:text-pink-700'
                                                }`}
                                            onClick={() => addToComparison(moonster.name, moonster.id)}
                                        />
                                        <Tooltip anchorSelect=".my-compare-class" content="Compare" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        {totalPages > 1 && (
                            <div className="mt-4 flex justify-center items-center space-x-2">
                                <button
                                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 bg-gray-600 text-white rounded-md disabled:opacity-50 hover:bg-gray-700"
                                >
                                    Previous
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`px-3 py-1 rounded-md ${currentPage === page
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-600 text-white hover:bg-gray-700'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 bg-gray-600 text-white rounded-md disabled:opacity-50 hover:bg-gray-700"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const CardSkeleton = () => (
    <div className="bg-gray-800 rounded-md shadow-xl p-4 border border-neutral-800 animate-pulse">
        {/* Skeleton for name and close button */}
        <div className="flex justify-between items-center mb-2">
            <div className="h-6 w-1/2 bg-gray-600 rounded"></div>
            <div className="h-10 w-10 bg-gray-600 rounded-md"></div>
        </div>
        {/* Skeleton for image */}
        <div className="flex justify-center mb-2">
            <div className="h-36 w-36 bg-gray-600 rounded-full"></div>
        </div>
        {/* Skeleton for details */}
        <div className="space-y-2">
            <div className="h-4 w-3/4 bg-gray-600 rounded"></div>
            <div className="h-4 w-1/2 bg-gray-600 rounded"></div>
        </div>
        {/* Skeleton for buttons */}
        <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="h-10 w-10 bg-gray-600 rounded-full"></div>
            <div className="h-10 w-full bg-gray-600 rounded-2xl"></div>
            <div className="h-10 w-10 bg-gray-600 rounded-full"></div>
            <div className="h-10 w-full bg-gray-600 rounded-2xl"></div>
        </div>
    </div>
);

export default CaptureMoonster;