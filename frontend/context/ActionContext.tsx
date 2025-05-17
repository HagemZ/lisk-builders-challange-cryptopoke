'use client';
// all console.log being uncomment out

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { waitForTransactionReceipt } from '@wagmi/core';
import { abiBattleManager, abiIDRXCP, abiUserManager } from '@/utils';
import { SC_BATTLE_MANAGER, SC_IDRXCP_TESTNET, SC_USER_MANAGER } from '@/context/constants';
import { generateSignature, generateSignatureEvolve } from '@/actions/generateSignature';
import { useQueryClient } from '@tanstack/react-query';
import { useCapture } from './CaptureContext';
import { config } from '@/utils/config';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import { getMoonsterByIds } from '@/actions/getMoonsterData';

interface Moonster {
  id: number;
  chance: number;
  name: string;
}

type EVMAddress = `0x${string}`;

interface ActionContextType {
    moonster: Moonster | null;
    setMoonster: (moonster: Moonster | null) => void;
    actionCapture: (id: number, chance: number, pokemonName?: string) => Promise<void>;
    actionEvolve: (id: number, newId: number, pokemonName?: string, evolvedName?: string) => Promise<void>;
    actionJoinBattle: (roundId: number, pokemonId: number, tokenAddress: EVMAddress, pokemonName?: string) => Promise<void>;
    isActionPending: boolean;
    isActionConfirming: boolean;
    transactionStep: 'idle' | 'approveCapture' | 'capture' | 'captureDone' | 'approveEvolution' | 'evolve' | 'evolveFail' | 'evolveDone' | 'approveJoin' | 'join' | 'joinDone';
}

const ActionContext = createContext<ActionContextType | undefined>(undefined);

export const ActionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const router = useRouter();
    const [moonster, setMoonster] = useState<Moonster | null>(null);
    const { address, chainId } = useAccount();
    const queryClient = useQueryClient();
    const { writeContractAsync, isPending: isWritePending, error: writeError, reset: resetWrite } = useWriteContract();
    const [transactionStep, setTransactionStep] = useState<
        'idle' | 'approveCapture' | 'capture' | 'captureDone' | 'approveEvolution' | 'evolve' | 'evolveFail' | 'evolveDone' | 'approveJoin' | 'join' | 'joinDone'
    >('idle');
    const [toastId, setToastId] = useState<string | number | undefined>(undefined);
    const [currentHash, setCurrentHash] = useState<string | undefined>(undefined);
    const { captureList, removeFromCapture } = useCapture();
    const [isActionPending, setIsActionPending] = useState(false);
    const [isActionConfirming, setIsActionConfirming] = useState(false);
    const hasFinalizedRef = useRef(false);
    const [isEvolving, setIsEvolving] = useState(false);

    const networkClient = Number(chainId);

    const { data: checkDataFees } = useReadContract({
        abi: abiUserManager,
        address: SC_USER_MANAGER,
        functionName: 'getFees',
        args: [SC_IDRXCP_TESTNET],
    });

    const [baseFee, _, evolutionFee] = (checkDataFees ?? [BigInt(0), BigInt(0), BigInt(0)]) as [bigint, bigint, bigint];

    const { isLoading: isConfirming, isSuccess: isConfirmed, error: receiptError } = useWaitForTransactionReceipt({
        hash: currentHash as `0x${string}` | undefined,
        timeout: 60000,
    });

    useEffect(() => {
        if (isConfirming && (transactionStep === 'approveCapture' || transactionStep === 'capture' || transactionStep === 'approveEvolution' || transactionStep === 'evolve' || transactionStep === 'approveJoin' || transactionStep === 'join')) {
            const newToastId = `${transactionStep}-confirming`;
            toast.loading(`Waiting ${transactionStep === 'approveCapture' ? 'approve for capture' : transactionStep === 'capture' ? 'capture' : transactionStep === 'approveEvolution' ? 'approve for evolution' : transactionStep === 'evolve' ? 'evolution' : transactionStep === 'approveJoin' ? 'approve for join' : 'join'} confirmation...`, {
                id: newToastId,
                duration: 60000,
            });
            setToastId(newToastId);
            setIsActionConfirming(true);
        } else if (isConfirmed && currentHash && transactionStep === 'approveCapture') {
            const newToastId = 'approve-capture-confirmed';
            toast.dismiss(toastId);
            toast.success('Approve for capture confirmed. Initiating capture...', {
                id: newToastId,
                duration: 5000,
            });
            setToastId(newToastId);
            setCurrentHash(undefined);
            setIsActionConfirming(false);
        } else if (isConfirmed && currentHash && transactionStep === 'capture') {
            const newToastId = 'capture-confirmed';
            toast.dismiss(toastId);
            toast.success('Capture confirmed', {
                id: newToastId,
                duration: 5000,
            });
            setToastId(newToastId);
            setIsActionConfirming(false);
            setTransactionStep('captureDone');
        } else if (isConfirmed && currentHash && transactionStep === 'approveEvolution') {
            const newToastId = 'approve-evolution-confirmed';
            toast.dismiss(toastId);
            toast.success('Approve for evolution confirmed. Initiating evolution...', {
                id: newToastId,
                duration: 5000,
            });
            setToastId(newToastId);
            setCurrentHash(undefined);
            setIsActionConfirming(false);
        } else if (isConfirmed && currentHash && transactionStep === 'evolve') {
            const newToastId = 'evolve-confirmed';
            toast.dismiss(toastId);
            toast.success('Evolution confirmed ', {
                id: newToastId,
                duration: 5000,
            });
            setToastId(newToastId);
            setCurrentHash(undefined);
            setIsActionConfirming(false);
            setTransactionStep('evolveDone');
        } else if (isConfirmed && currentHash && transactionStep === 'approveJoin') {
            const newToastId = 'approve-join-confirmed';
            toast.dismiss(toastId);
            toast.success('Approve for join confirmed. Initiating join...', {
                id: newToastId,
                duration: 5000,
            });
            setToastId(newToastId);
            setCurrentHash(undefined);
            setIsActionConfirming(false);
        } else if (isConfirmed && currentHash && transactionStep === 'join') {
            const newToastId = 'join-confirmed';
            toast.dismiss(toastId);
            toast.success('Joined round on progress...', {
                id: newToastId,
                duration: 5000,
            });
            setToastId(newToastId);
            setCurrentHash(undefined);
            setIsActionConfirming(false);
            setTransactionStep('joinDone');
        } else if (receiptError && (transactionStep === 'approveCapture' || transactionStep === 'capture' || transactionStep === 'approveEvolution' || transactionStep === 'evolve' || transactionStep === 'approveJoin' || transactionStep === 'join')) {
            console.log('transactionStep', transactionStep);
            const newToastId = 'action-error';
            toast.dismiss(toastId);
            let errorMessage = 'Transaction failed: Unknown error';
            if (receiptError.message.includes('Round is not in registration phase')) {
                errorMessage = 'Round is not in registration phase.';
            } else if (receiptError.message.includes('User does not own this Pokemon')) {
                errorMessage = 'You do not own this Pokémon.';
            } else if (receiptError.message.includes('Round is full')) {
                errorMessage = 'Round is full.';
            } else if (receiptError.message.includes('User already joined this round')) {
                errorMessage = 'You have already joined this round.';
            } else if (receiptError.message.includes('Cannot evolve Pokemon in an active battle round')) {
                errorMessage = 'Cannot evolve Pokémon in an active battle round.';
            } else if (receiptError.message.includes('Invalid signature')) {
                errorMessage = 'Transaction failed: Invalid signature. Please check your wallet or contact support.';
            } else if (receiptError.message.includes('Token is not accepted')) {
                errorMessage = 'Transaction failed: Token is not accepted.';
            } else if (receiptError.message.includes('Signature already used')) {
                errorMessage = 'Transaction failed: Signature already used.';
            } else if (receiptError.message.includes('Transfer failed')) {
                errorMessage = 'Transaction failed: Token transfer failed.';
            }
            toast.error(errorMessage, {
                id: newToastId,
                duration: 5000,
            });
            setToastId(newToastId);
            setTransactionStep('idle');
            setCurrentHash(undefined);
            setIsActionPending(false);
            setIsActionConfirming(false);
            resetWrite();
            if (transactionStep === 'evolve' || transactionStep === 'approveEvolution' || transactionStep === 'join' || transactionStep === 'approveJoin') {
                const queryKey = [
                    'readContract',
                    {
                        abi: abiUserManager,
                        address: SC_USER_MANAGER,
                        functionName: 'getUserIds',
                        args: [address],
                        chainId: networkClient,
                    },
                ];
                queryClient.invalidateQueries({
                    queryKey,
                    refetchType: 'active',
                });
            }
        }
    }, [isConfirming, isConfirmed, receiptError, currentHash, transactionStep, toastId, resetWrite, queryClient, address, networkClient]);

    useEffect(() => {
        if (transactionStep === 'captureDone' && !hasFinalizedRef.current) {
            hasFinalizedRef.current = true;
            const newToastId = 'capture-done';
            toast.success('Capture on Progress, Please wait...', {
                id: newToastId,
                duration: 5000,
                onAutoClose: (t) => {
                    queryClient.invalidateQueries({
                        queryKey: ['getUserBookmarks', address],
                        refetchType: 'active',
                    });
                    setTransactionStep('idle');
                    setToastId(undefined);
                    // setIsActionPending(false);
                    // setIsActionConfirming(false);
                    toast.dismiss();
                    resetWrite();
                },
            });
            setToastId(newToastId);
        }
    }, [transactionStep, queryClient, address, router, resetWrite, currentHash]);

    useEffect(() => {
        if (transactionStep === 'evolveDone' && !hasFinalizedRef.current) {
            hasFinalizedRef.current = true;
            const newToastId = 'evolve-done';
            toast.dismiss(toastId);
            toast.success('Evolution on Progress, please wait...', {
                id: newToastId,
                duration: 5000,
                onAutoClose: () => {
                    setTransactionStep('idle');
                    setToastId(undefined);
                    setCurrentHash(undefined);
                    // setIsActionPending(false);
                    // setIsActionConfirming(false);
                    setIsEvolving(false);
                    toast.dismiss();
                    resetWrite();
                },
            });
            setToastId(newToastId);
        }
    }, [transactionStep, toastId, resetWrite]);

    useEffect(() => {
        if (transactionStep === 'joinDone' && !hasFinalizedRef.current) {
            hasFinalizedRef.current = true;
            const newToastId = 'join-done';
            toast.success('Joined the battle round!', {
                id: newToastId,
                duration: 5000,
                onAutoClose: () => {
                    setTransactionStep('idle');
                    setToastId(undefined);
                    setCurrentHash(undefined);
                    // setIsActionPending(false);
                    // setIsActionConfirming(false);
                    toast.dismiss();
                    resetWrite();
                },
            });
            setToastId(newToastId);
        }
    }, [transactionStep]);

    useEffect(() => {
        if (transactionStep === 'idle') {
            hasFinalizedRef.current = false;
        }
    }, [transactionStep]);

    const toastStyle = {
        duration: 5000,
        position: 'bottom-right' as const,
        limit: 3, // Limit to 3 toasts at a time
    };

    const showMessageCustom = async (
        message: string,
        icon?: string
    ) => {

        toast.custom(
            (t) => (
                <div className="flex items-center bg-gray-800 border-2 border-red-500 text-white p-4 rounded-lg shadow-lg max-w-md">
                    {icon && <span className="mr-2">{icon}</span>}
                    <span className="font-bold">
                        {message}
                    </span>
                </div>
            ),
            toastStyle
        );
    };

    const actionCapture = useCallback(
        async (id: number, chance: number, pokemonName: string = `Pokémon ID ${id}`) => {
            if (!address) {
                const newToastId = 'capture-error';
                toast.error('Please connect your wallet to capture Pokémon.', { id: newToastId, duration: 5000 });
                setToastId(newToastId);
                return;
            }
            if (networkClient !== 4202) {
                const newToastId = 'capture-error';
                toast.error('Please switch to the Lisk Sepolia Testnet.', { id: newToastId, duration: 5000 });
                setToastId(newToastId);
                return;
            }
            if (id <= 0 || !Number.isInteger(id)) {
                const newToastId = 'capture-error';
                toast.error('Invalid Pokémon ID.', { id: newToastId, duration: 5000 });
                setToastId(newToastId);
                return;
            }

            const moonsterList = await getMoonsterByIds([id]);
            if (moonsterList[0]?.chance !== chance) {
                const newToastId = 'capture-error';
                toast.error('Invalid Moonster chance.', { id: newToastId, duration: 5000 });
                setToastId(newToastId);
                return;
            }

            if (chance < 0 || !Number.isInteger(chance)) {
                const newToastId = 'capture-error';
                toast.error('Invalid encounter chance.', { id: newToastId, duration: 5000 });
                setToastId(newToastId);
                return;
            }
            if (!baseFee) {
                const newToastId = 'capture-error';
                toast.error('Capture fee not available.', { id: newToastId, duration: 5000 });
                setToastId(newToastId);
                return;
            }

            try {
                setIsActionPending(true);
                setCurrentHash(undefined);
                hasFinalizedRef.current = false;
                // console.log('actionCapture started:', { id, chance, pokemonName });

                const provider = new ethers.JsonRpcProvider('https://rpc.sepolia-api.lisk.com');
                const idrxContract = new ethers.Contract(SC_IDRXCP_TESTNET, abiIDRXCP, provider);
                const balance = await idrxContract.balanceOf(address);
                // console.log('IDRXCP balance:', balance.toString());
                const allowance = await idrxContract.allowance(address, SC_USER_MANAGER);
                // console.log('Allowance:', allowance.toString());

                if (BigInt(balance) < BigInt(baseFee)) {
                    const newToastId = 'capture-error';
                    toast.error('Insufficient IDRXCP balance for capture.', { id: newToastId, duration: 5000 });
                    setToastId(newToastId);
                    setIsActionPending(false);
                    return;
                }

                const { signature, timestamp } = await generateSignature({
                    userAddress: address,
                    tokenAddress: SC_IDRXCP_TESTNET,
                    chance,
                    id,
                });
                // console.log('Signature generated:', { signature, timestamp });

                const cpInterface = new ethers.Interface(abiUserManager);
                const payAndAssignIdCallData = cpInterface.encodeFunctionData('payAndAssignId', [
                    SC_IDRXCP_TESTNET,
                    BigInt(id),
                    BigInt(chance),
                    BigInt(timestamp),
                    signature as `0x${string}`,
                ]);
                try {
                    await provider.call({
                        // to: SC_CP_TESTNET,
                        to: SC_USER_MANAGER,
                        data: payAndAssignIdCallData,
                        from: address,
                    });
                    // console.log('payAndAssignId simulation succeeded');
                } catch (simError: any) {
                    if (simError.data) {
                        try {
                            const revertReason = ethers.toUtf8String(ethers.getBytes(simError.data));
                            console.log('Revert reason:', revertReason);
                        } catch {
                            console.log('Raw revert data:', simError.data);
                        }
                    }
                }

                if (BigInt(allowance) < BigInt(baseFee)) {
                    // console.log('Allowance insufficient, executing approve separately');
                    const newToastId = 'approve-pending';
                    toast.loading('Approving token allowance...', { id: newToastId, duration: 60000 });
                    setToastId(newToastId);
                    setTransactionStep('approveCapture');

                    const approveHash = await writeContractAsync({
                        address: SC_IDRXCP_TESTNET,
                        abi: abiIDRXCP,
                        functionName: 'approve',
                        args: [SC_USER_MANAGER, baseFee],
                        gas: BigInt(100000),
                        // value: BigInt(0),
                    });
                    // console.log('Approve hash:', approveHash);
                    setCurrentHash(approveHash);

                    const receipt = await waitForTransactionReceipt(config, {
                        hash: approveHash as `0x${string}`,
                        timeout: 60000,
                    });
                    if (receipt.status !== 'success') {
                        throw new Error('Approve transaction failed');
                    }
                    // console.log('Approve transaction confirmed');
                    toast.dismiss(newToastId);
                } else {
                    console.log('Allowance sufficient, skipping approve');
                }

                setTransactionStep('capture');
                const newToastId = 'capture-pending';
                toast.loading('Capture transaction is pending...', { id: newToastId, duration: 60000 });
                setToastId(newToastId);

                const captureHash = await writeContractAsync({
                    // address: SC_CP_TESTNET,
                    address: SC_USER_MANAGER,
                    abi: abiUserManager,
                    functionName: 'payAndAssignId',
                    args: [SC_IDRXCP_TESTNET, BigInt(id), BigInt(chance), BigInt(timestamp), signature as `0x${string}`],
                    gas: BigInt(500000),
                    // value: BigInt(0),
                });
                // console.log('Capture hash:', captureHash);
                setCurrentHash(captureHash);

                const receipt = await waitForTransactionReceipt(config, {
                    hash: captureHash as `0x${string}`,
                    timeout: 60000,
                });

                // console.log('Transaction receipt:', JSON.stringify(receipt, (key, value) => 
                //     typeof value === 'bigint' ? value.toString() : value, 2));

                const idAssignedLog = receipt.logs.find((log: any) =>
                    log.address.toLowerCase() === SC_USER_MANAGER.toLowerCase() &&
                    log.topics[0] === ethers.id('IDAssigned(address,uint256)')
                );
                const captureFailedLog = receipt.logs.find((log: any) =>
                    log.address.toLowerCase() === SC_USER_MANAGER.toLowerCase() &&
                    log.topics[0] === ethers.id('CaptureFailed(address,uint256,uint256,uint256)')
                );

                if (!idAssignedLog && captureFailedLog) {
                    const decoded = cpInterface.decodeEventLog('CaptureFailed', captureFailedLog.data, captureFailedLog.topics);
                    // console.log('Capture failed:', decoded);
                    // throw new Error(`Capture failed: target chance ${decoded[2]}% , your roll is : ${decoded[3]} , please try again`);
                    throw new Error(`Capture failed: target chance ${decoded[2]}% , please try again`);
                }
                if (!idAssignedLog) {
                    throw new Error('payAndAssignId failed, no IDAssigned event found');
                }

                if (receipt.status !== 'success') {
                    throw new Error('Transaction failed');
                }

                if (idAssignedLog) {
                    setTransactionStep('captureDone');
                    setIsActionPending(false);
                    setIsActionConfirming(false);
                }
                toast.dismiss();


                // console.log('Capture completed, navigating with hash:', captureHash);
                router.push(`/capture-result/${encodeURIComponent(pokemonName)}?hash=${captureHash}`);


            } catch (err: any) {
                let errorMessage = 'Transaction error: Unknown error';
                if (err.message.includes('HTTP request failed') && err.message.includes('Status: 400')) {
                    errorMessage = 'Network error: Failed to connect to Lisk Sepolia. Please retry or check your network.';
                } else if (err.message.includes('Transaction rejected by user')) {
                    errorMessage = 'Transaction rejected.';
                } else if (err.message.includes('User rejected the request')) {
                    errorMessage = 'Transaction rejected. No fees were charged.';
                } else if (err.message.includes('Invalid signature')) {
                    errorMessage = 'Transaction rejected: Invalid signature.';
                } else if (err.message.includes('Pokemon ID already owned')) {
                    errorMessage = 'Transaction rejected: Pokémon already captured.';
                } else if (err.message.includes('Capture failed')) {
                    errorMessage = err.message;
                } else if (err.message.includes('payAndAssignId failed')) {
                    errorMessage = 'Capture failed: payAndAssignId reverted.';
                } else {
                    errorMessage = `Transaction error: ${err.message || 'Unknown error'}`;
                }
                const newToastId = 'capture-error';
                toast.dismiss(toastId);
                // toast.error(errorMessage, { id: newToastId, duration: 5000 });
                await showMessageCustom(errorMessage, '✨');
                setToastId(newToastId);
                setTransactionStep('idle');
                setCurrentHash(undefined);
                setIsActionPending(false);
                setIsActionConfirming(false);
                resetWrite();

                toast.dismiss();
                const sanitizedErrorMessage = String(errorMessage).replace(/%/g, 'percent');
                // router.push(`/capture-result/${encodeURIComponent(pokemonName)}?error=${encodeURIComponent(errorMessage)}`);
                router.push(`/capture-result/${encodeURIComponent(pokemonName)}?error=${encodeURIComponent(sanitizedErrorMessage)}`)

                // console.log('actionCapture error:', err);
            }
            router.refresh();
        },
        [address, networkClient, baseFee, writeContractAsync, queryClient, router, toastId]
    );

    const actionEvolve = useCallback(
        async (id: number, newId: number, pokemonName: string = `Pokémon ID ${id}`, evolvedName: string = `Pokémon ID ${newId}`) => {
            if (!address) {
                const newToastId = 'evolve-error';
                toast.error('Please connect your wallet to evolve Pokémon.', { id: newToastId, duration: 5000 });
                setToastId(newToastId);
                return;
            }
            if (networkClient !== 4202) {
                const newToastId = 'evolve-error';
                toast.error('Please switch to the Lisk Sepolia Testnet.', { id: newToastId, duration: 5000 });
                setToastId(newToastId);
                return;
            }
            if (id <= 0 || !Number.isInteger(id)) {
                const newToastId = 'evolve-error';
                toast.error('Invalid Pokémon ID.', { id: newToastId, duration: 5000 });
                setToastId(newToastId);
                return;
            }
            if (newId <= 0 || !Number.isInteger(newId)) {
                const newToastId = 'evolve-error';
                toast.error('Invalid evolved Pokémon ID.', { id: newToastId, duration: 5000 });
                setToastId(newToastId);
                return;
            }
            if (!evolutionFee) {
                const newToastId = 'evolve-error';
                toast.error('Evolution fee not available.', { id: newToastId, duration: 5000 });
                setToastId(newToastId);
                return;
            }
            if (isEvolving) {
                console.log('Evolution already in progress, ignoring.');
                return;
            }

            try {
                setIsEvolving(true);
                setIsActionPending(true);
                setCurrentHash(undefined);
                hasFinalizedRef.current = false;
                // console.log('actionEvolve started:', { id, newId, pokemonName, evolvedName });

                const provider = new ethers.JsonRpcProvider('https://rpc.sepolia-api.lisk.com');
                const idrxContract = new ethers.Contract(SC_IDRXCP_TESTNET, abiIDRXCP, provider);
                const balance = await idrxContract.balanceOf(address);
                // console.log('token balance:', balance.toString());
                const allowance = await idrxContract.allowance(address, SC_USER_MANAGER);
                // console.log('Allowance:', allowance.toString());

                // console.log('Fees:', {
                //     baseFee: baseFee.toString(),
                //     bookmarkFee: bookmarkFee.toString(),
                //     evolutionFee: evolutionFee.toString()
                // });

                if (BigInt(balance) < BigInt(evolutionFee)) {
                    const newToastId = 'evolve-error';
                    toast.error(`Insufficient token balance for evolution. Need ${evolutionFee.toString()}, have ${balance.toString()}.`, { id: newToastId, duration: 5000 });
                    setToastId(newToastId);
                    setIsActionPending(false);
                    setIsEvolving(false);
                    return;
                }

                const cpContract = new ethers.Contract(SC_USER_MANAGER, abiUserManager, provider);
                // console.log('Contract ABI functions:', abiCP.map(item => item.name).filter(Boolean));
                const tokenDetails = await cpContract.tokenDetails(SC_IDRXCP_TESTNET);
                // console.log('Token details:', {
                //     isAccepted: tokenDetails[0],
                //     baseFee: tokenDetails[2]?.toString(),
                //     extraFields: tokenDetails.slice(1)
                // });
                if (!tokenDetails[0]) {
                    const newToastId = 'evolve-error';
                    toast.error('Token is not accepted.', { id: newToastId, duration: 5000 });
                    setToastId(newToastId);
                    setIsActionPending(false);
                    setIsEvolving(false);
                    return;
                }

                const userIds = await cpContract.getUserIds(address);
                // console.log('User IDs (getUserIds):', userIds.map((id: bigint) => id.toString()));
                if (!userIds.includes(BigInt(id))) {
                    const newToastId = 'evolve-error';
                    toast.error('You do not own this Pokémon (getUserIds check).', { id: newToastId, duration: 5000 });
                    setToastId(newToastId);
                    setIsActionPending(false);
                    setIsEvolving(false);
                    return;
                }

                if (BigInt(allowance) < BigInt(evolutionFee)) {
                    // console.log('Allowance insufficient, executing approve separately');
                    const newToastId = 'approve-evolution-pending';
                    toast.loading('Approving token allowance for evolution...', { id: newToastId, duration: 60000 });
                    setToastId(newToastId);
                    setTransactionStep('approveEvolution');

                    const approveHash = await writeContractAsync({
                        address: SC_IDRXCP_TESTNET,
                        abi: abiIDRXCP,
                        functionName: 'approve',
                        args: [SC_USER_MANAGER, evolutionFee],
                        gas: BigInt(100000),
                        // value: BigInt(0),
                    });
                    setCurrentHash(approveHash);
                    // console.log('Approve hash:', approveHash);

                    const receipt = await waitForTransactionReceipt(config, {
                        hash: approveHash as `0x${string}`,
                        timeout: 60000,
                        confirmations: 1, // Wait for 1 confirmation
                        pollingInterval: 1000, // Poll every second
                    });
                    if (receipt.status !== 'success') {
                        throw new Error('Approve transaction failed');
                    }
                    // console.log('Approve transaction confirmed');
                    toast.dismiss(newToastId);
                } else {
                    console.log('Allowance sufficient, skipping approve');
                }

                setTransactionStep('evolve');
                const newToastId = 'evolve-pending';
                toast.dismiss(toastId);
                toast.loading('Evolution transaction is pending...', { id: newToastId, duration: 60000 });
                setToastId(newToastId);

                const { signature, timestamp } = await generateSignatureEvolve({
                    userAddress: address,
                    tokenAddress: SC_IDRXCP_TESTNET,
                    id,
                    newId,
                });
                // console.log('Signature generated:', { signature, timestamp });

                const cpInterface = new ethers.Interface(abiUserManager);
                const payAndEvolveCallData = cpInterface.encodeFunctionData('payAndEvolve', [
                    SC_IDRXCP_TESTNET,
                    BigInt(id),
                    BigInt(newId),
                    BigInt(timestamp),
                    signature as `0x${string}`,
                ]);

                const simulate = false; // Toggle for testing
                if (simulate) {
                    try {
                        await provider.call({
                            to: SC_USER_MANAGER,
                            data: payAndEvolveCallData,
                            from: address,
                        });
                        console.log('payAndEvolve simulation succeeded');
                    } catch (simError: any) {
                        if (simError.data) {
                            console.log('Raw revert data:', simError.data);
                            try {
                                const errorInterface = new ethers.Interface([
                                    'error Error(string)',
                                    'error TransferFailed(address, uint256)'
                                ]);
                                const decodedError = errorInterface.parseError(simError.data);
                                if (decodedError) {
                                    if (decodedError.name === 'Error') {
                                        const revertReason = decodedError.args[0];
                                        console.log('Decoded revert reason:', revertReason);
                                        throw new Error(`Simulation failed: ${revertReason}`);
                                    } else if (decodedError.name === 'TransferFailed') {
                                        const [token, amount] = decodedError.args;
                                        console.log('Transfer failed:', { token, amount: amount.toString() });
                                        throw new Error(`Token transfer failed for ${token} with amount ${amount.toString()}`);
                                    }
                                } else {
                                    throw new Error(`Simulation failed: Unknown revert data ${simError.data}`);
                                }
                            } catch (decodeError) {
                                console.log('Failed to decode revert data:', decodeError);
                                throw new Error(`Simulation failed: Unable to decode revert data ${simError.data}`);
                            }
                        } else {
                            console.log('No revert data provided');
                            throw new Error('payAndEvolve simulation failed: No revert data');
                        }
                    }
                }

                const evolveHash = await writeContractAsync({
                    address: SC_USER_MANAGER,
                    abi: abiUserManager,
                    functionName: 'payAndEvolve',
                    args: [SC_IDRXCP_TESTNET, BigInt(id), BigInt(newId), BigInt(timestamp), signature as `0x${string}`],
                    gas: BigInt(500000),
                    // value: BigInt(0),
                });
                // console.log('Evolve hash:', evolveHash);
                setCurrentHash(evolveHash);

                const receipt = await waitForTransactionReceipt(config, {
                    hash: evolveHash as `0x${string}`,
                    timeout: 60000,
                });
                // console.log('Transaction receipt:', JSON.stringify(receipt, (key, value) => 
                //     typeof value === 'bigint' ? value.toString() : value, 2));

                const pokemonEvolvedLog = receipt.logs.find((log: any) =>
                    log.address.toLowerCase() === SC_USER_MANAGER.toLowerCase() &&
                    log.topics[0] === ethers.id('PokemonEvolved(address,uint256,uint256)')
                );
                if (!pokemonEvolvedLog) {
                    throw new Error('payAndEvolve failed, no PokemonEvolved event found');
                }

                const decodedEvolved = cpInterface.decodeEventLog('PokemonEvolved', pokemonEvolvedLog.data, pokemonEvolvedLog.topics);
                if (
                    decodedEvolved.user.toLowerCase() !== address.toLowerCase() ||
                    Number(decodedEvolved.oldId) !== id ||
                    Number(decodedEvolved.newId) !== newId
                ) {
                    throw new Error('PokemonEvolved event data mismatch');
                }

                if (receipt.status !== 'success') {
                    throw new Error('Evolution transaction failed');
                }

                if (pokemonEvolvedLog) {
                    setIsActionPending(false);
                    setIsActionConfirming(false);
                    setTransactionStep('evolveDone');
                }

                // router.refresh();
                toast.dismiss();

                // console.log('Evolution completed, navigating with hash:', evolveHash);       
                router.push(`/evolve-result/${encodeURIComponent(evolvedName)}?hash=${evolveHash}`);

                // const queryKey = [
                //     'readContract',
                //     {
                //         abi: abiUserManager,
                //         address: SC_USER_MANAGER,
                //         functionName: 'getUserIds',
                //         args: [address],
                //         chainId: networkClient,
                //     },
                // ];
                // await queryClient.invalidateQueries({
                //     queryKey,
                //     refetchType: 'active',
                // });


            } catch (err: any) {
                let errorMessage = 'Transaction error: Unknown error';
                if (err.message.includes('HTTP request failed') && err.message.includes('Status: 400')) {
                    errorMessage = 'Network error: Failed to connect to Lisk Sepolia. Please retry or check your network.';
                } else if (err.message.includes('User rejected the request')) {
                    errorMessage = 'Transaction rejected. No fees were charged.';
                } else if (err.message.includes('Transaction rejected')) {
                    errorMessage = 'Transaction rejected.';
                } else if (err.message.includes('Invalid signature')) {
                    errorMessage = 'Transaction rejected: Invalid signature.';
                } else if (err.message.includes('Signature already used')) {
                    errorMessage = 'Transaction rejected: Signature already used.';
                } else if (err.message.includes('Token is not accepted')) {
                    errorMessage = 'Transaction rejected: Token is not accepted.';
                } else if (err.message.includes('You do not own this Pokémon')) {
                    errorMessage = 'You do not own this Pokémon.';
                } else if (err.message.includes('Cannot evolve Pokémon in an active battle round')) {
                    errorMessage = 'Cannot evolve Pokémon in an active battle round.';
                } else if (err.message.includes('Token transfer failed')) {
                    errorMessage = 'Transaction rejected: Token transfer failed.';
                } else if (err.message.includes('payAndEvolve failed')) {
                    errorMessage = 'Evolution failed: payAndEvolve reverted.';
                } else if (err.message.includes('no matching fragment')) {
                    errorMessage = 'Contract interaction failed: Invalid contract ABI. Please contact support.';
                } else if (err.message.includes('Simulation failed')) {
                    errorMessage = err.message;
                } else {
                    errorMessage = `Transaction error: ${err.message || 'Unknown error'}`;
                }
                const newToastId = 'evolve-error';
                toast.dismiss(toastId);
                // toast.error(errorMessage, { id: newToastId, duration: 5000 });
                await showMessageCustom(errorMessage, '✨');

                toast.error(errorMessage, { id: newToastId, duration: 5000 });
                setToastId(newToastId);
                setTransactionStep('evolveFail');
                // setTransactionStep('idle');
                setCurrentHash(undefined);
                setIsActionPending(false);
                setIsActionConfirming(false);
                setIsEvolving(false);
                resetWrite();
                // router.refresh();
                toast.dismiss();
                console.log('actionEvolve error:', err);

                const queryKey = [
                    'readContract',
                    {
                        abi: abiUserManager,
                        address: SC_USER_MANAGER,
                        functionName: 'getUserIds',
                        args: [address],
                        chainId: networkClient,
                    },
                ];
                queryClient.invalidateQueries({
                    queryKey,
                    refetchType: 'active',
                });
            }
            router.refresh();
        },
        [address, networkClient, evolutionFee, writeContractAsync, queryClient, router, toastId]
    );

    const actionJoinBattle = useCallback(
        async (roundId: number, moonsterId: number, tokenAddress: EVMAddress, moonsterName: string = `Moonster ID ${moonsterId}`) => {
            if (!address) {
                const newToastId = 'join-error';
                toast.error('Please connect your wallet to join the battle.', { id: newToastId, duration: 5000 });
                setToastId(newToastId);
                return;
            }
            if (networkClient !== 4202) {
                const newToastId = 'join-error';
                toast.error('Please switch to the Lisk Sepolia Testnet.', { id: newToastId, duration: 5000 });
                setToastId(newToastId);
                return;
            }
            if (roundId < 0 || !Number.isInteger(roundId)) {
                const newToastId = 'join-error';
                toast.error('Invalid round ID.', { id: newToastId, duration: 5000 });
                setToastId(newToastId);
                return;
            }
            if (moonsterId <= 0 || !Number.isInteger(moonsterId)) {
                const newToastId = 'join-error';
                toast.error('Invalid Moonster ID.', { id: newToastId, duration: 5000 });
                setToastId(newToastId);
                return;
            }
            if (!baseFee) {
                const newToastId = 'join-error';
                toast.error('Battle fee not available.', { id: newToastId, duration: 5000 });
                setToastId(newToastId);
                return;
            }

            try {
                setIsActionPending(true);
                setCurrentHash(undefined);
                hasFinalizedRef.current = false;
                // console.log('actionJoinBattle started:', { roundId, moonsterId, tokenAddress, moonsterName });

                const provider = new ethers.JsonRpcProvider('https://rpc.sepolia-api.lisk.com');
                const tokenContract = new ethers.Contract(tokenAddress, abiIDRXCP, provider);
                const balance = await tokenContract.balanceOf(address);
                // console.log('Token balance:', balance.toString());
                const allowance = await tokenContract.allowance(address, SC_BATTLE_MANAGER);
                // console.log('Allowance:', allowance.toString());

                if (BigInt(balance) < BigInt(baseFee)) {
                    const newToastId = 'join-error';
                    toast.error(`Insufficient token balance for joining battle. Need ${baseFee.toString()}, have ${balance.toString()}.`, { id: newToastId, duration: 5000 });
                    setToastId(newToastId);
                    setIsActionPending(false);
                    return;
                }

                const cpContract = new ethers.Contract(SC_USER_MANAGER, abiUserManager, provider);
                // console.log('Contract ABI functions:', abiCP.map(item => item.name).filter(Boolean));
                const tokenDetails = await cpContract.tokenDetails(tokenAddress);
                // console.log('Token details:', {
                //     isAccepted: tokenDetails[0],
                //     baseFee: tokenDetails[2]?.toString(),
                //     extraFields: tokenDetails.slice(1)
                // });
                if (!tokenDetails[0]) {
                    const newToastId = 'join-error';
                    toast.error('Token is not accepted.', { id: newToastId, duration: 5000 });
                    setToastId(newToastId);
                    setIsActionPending(false);
                    return;
                }

                const userIds = await cpContract.getUserIds(address);
                // console.log('User IDs (getUserIds):', userIds.map((id: bigint) => id.toString()));
                if (!userIds.includes(BigInt(moonsterId))) {
                    const newToastId = 'join-error';
                    toast.error('You do not own this Moonster (getUserIds check).', { id: newToastId, duration: 5000 });
                    setToastId(newToastId);
                    setIsActionPending(false);
                    return;
                }

                if (BigInt(allowance) < BigInt(baseFee)) {
                    // console.log('Allowance insufficient, executing approve separately');
                    const newToastId = 'approve-join-pending';
                    toast.loading('Approving token allowance for joining battle...', { id: newToastId, duration: 60000 });
                    setToastId(newToastId);
                    setTransactionStep('approveJoin');

                    const approveHash = await writeContractAsync({
                        address: tokenAddress,
                        abi: abiIDRXCP,
                        functionName: 'approve',
                        args: [SC_BATTLE_MANAGER, baseFee],
                        gas: BigInt(100000),
                        // value: BigInt(0),
                    });
                    // console.log('Approve hash:', approveHash);
                    setCurrentHash(approveHash);

                    const receipt = await waitForTransactionReceipt(config, {
                        hash: approveHash as `0x${string}`,
                        timeout: 60000,
                    });
                    if (receipt.status !== 'success') {
                        throw new Error('Approve transaction failed');
                    }
                    console.log('Approve transaction confirmed');
                    toast.dismiss(newToastId);
                } else {
                    console.log('Allowance sufficient, skipping approve');
                }

                setTransactionStep('join');
                const newToastId = 'join-pending';
                toast.dismiss(toastId);
                toast.loading('Join battle transaction is pending...', { id: newToastId, duration: 60000 });
                setToastId(newToastId);

                const cpInterface = new ethers.Interface(abiBattleManager);
                const joinBattleCallData = cpInterface.encodeFunctionData('joinBattle', [
                    // BigInt(roundId),
                    // BigInt(pokemonId),
                    BigInt(moonsterId),
                    tokenAddress as EVMAddress
                ]);

                const simulate = false; // Toggle for testing
                if (simulate) {
                    try {
                        await provider.call({
                            to: SC_BATTLE_MANAGER,
                            data: joinBattleCallData,
                            from: address,
                        });
                        console.log('joinBattle simulation succeeded');
                    } catch (simError: any) {
                        if (simError.data) {
                            console.log('Raw revert data:', simError.data);
                            try {
                                const errorInterface = new ethers.Interface([
                                    'error Error(string)',
                                    'error TransferFailed(address, uint256)'
                                ]);
                                const decodedError = errorInterface.parseError(simError.data);
                                if (decodedError) {
                                    if (decodedError.name === 'Error') {
                                        const revertReason = decodedError.args[0];
                                        console.log('Decoded revert reason:', revertReason);
                                        throw new Error(`Simulation failed: ${revertReason}`);
                                    } else if (decodedError.name === 'TransferFailed') {
                                        const [token, amount] = decodedError.args;
                                        console.log('Transfer failed:', { token, amount: amount.toString() });
                                        throw new Error(`Token transfer failed for ${token} with amount ${amount.toString()}`);
                                    }
                                } else {
                                    throw new Error(`Simulation failed: Unknown revert data ${simError.data}`);
                                }
                            } catch (decodeError) {
                                console.log('Failed to decode revert data:', decodeError);
                                throw new Error(`Simulation failed: Unable to decode revert data ${simError.data}`);
                            }
                        } else {
                            console.log('No revert data provided');
                            throw new Error('joinBattle simulation failed: No revert data');
                        }
                    }
                }

                // console.log("tokenAddress used :", tokenAddress)
                const joinHash = await writeContractAsync({
                    address: SC_BATTLE_MANAGER,
                    abi: abiBattleManager,
                    functionName: 'joinBattle',
                    args: [BigInt(moonsterId), tokenAddress as EVMAddress],
                    gas: BigInt(500000),
                    // value: BigInt(0),
                });
                // console.log('Join hash:', joinHash);
                setCurrentHash(joinHash);

                let receipt;
                try {
                    receipt = await waitForTransactionReceipt(config, {
                        hash: joinHash as `0x${string}`,
                        timeout: 120000,
                    });
                    console.log('Transaction receipt:', JSON.stringify(receipt, (key, value) =>
                        typeof value === 'bigint' ? value.toString() : value, 2));
                } catch (error) {
                    console.error('Failed to fetch transaction receipt:', error);
                    throw new Error('Failed to fetch transaction receipt');
                }

                if (!SC_BATTLE_MANAGER) {
                    throw new Error('SC_BATTLE_MANAGER address is undefined');
                }

                // console.log('Receipt logs:', JSON.stringify(receipt.logs, (key, value) =>
                //     typeof value === 'bigint' ? value.toString() : value, 2));

                const expectedTopic = ethers.id('PlayerJoined(uint256,address,uint256)');
                // console.log('Expected PlayerJoined topic:', expectedTopic);
                const playerJoinedLog = receipt.logs.find((log: any) => {
                    if (!log.address || !log.topics || !log.topics[0]) {
                        console.log('Invalid log entry:', log);
                        return false;
                    }
                    return (
                        log.address.toLowerCase() === SC_BATTLE_MANAGER.toLowerCase() &&
                        log.topics[0] === expectedTopic
                    );
                });

                if (!playerJoinedLog) {
                    console.error('PlayerJoined event not found in logs:', receipt.logs);
                    throw new Error('joinBattle succeeded, but no PlayerJoined event found');
                }

                const decodedJoined = cpInterface.decodeEventLog(
                    'PlayerJoined',
                    playerJoinedLog.data,
                    playerJoinedLog.topics
                );
                console.log('Decoded PlayerJoined event:', decodedJoined);
                if (
                    decodedJoined.player.toLowerCase() !== address.toLowerCase() ||
                    Number(decodedJoined.moonsterId) !== moonsterId
                ) {
                    throw new Error('PlayerJoined event data mismatch');
                }

                const actualRoundId = Number(decodedJoined.roundId);
                console.log(`Joined round ID: ${actualRoundId}, Expected round ID: ${roundId}`);

                if (receipt.status !== 'success') {
                    throw new Error('Join transaction failed');
                }


                if (playerJoinedLog) {
                    setIsActionPending(false);
                    setIsActionConfirming(false);
                    setTransactionStep('joinDone');
                }

                // router.refresh();
                toast.dismiss();
                // console.log('Join completed, navigating with hash:', joinHash);
                router.push(`/join-result/${encodeURIComponent(moonsterName)}?hash=${joinHash}`);

                queryClient.invalidateQueries({
                    queryKey: [
                        'readContract',
                        {
                            abi: abiBattleManager,
                            address: SC_BATTLE_MANAGER,
                            functionName: 'isUserInRound',
                            args: [BigInt(roundId), address],
                            chainId: networkClient,
                        },
                    ],
                    refetchType: 'active',
                });
                queryClient.invalidateQueries({
                    queryKey: [
                        'readContract',
                        {
                            abi: abiUserManager,
                            address: SC_USER_MANAGER,
                            functionName: 'getUserIds',
                            args: [address],
                            chainId: networkClient,
                        },
                    ],
                    refetchType: 'active',
                });


            } catch (err: any) {
                let errorMessage = 'Transaction error: Unknown error';
                if (err.message.includes('HTTP request failed') && err.message.includes('Status: 400')) {
                    errorMessage = 'Network error: Failed to connect to Lisk Sepolia. Please retry or check your network.';
                } else if (err.message.includes('User rejected the request')) {
                    errorMessage = 'Transaction rejected. No fees were charged.';
                } else if (err.message.includes('Round is not in registration phase')) {
                    errorMessage = 'Round is not in registration phase.';
                } else if (err.message.includes('User does not own this Pokémon')) {
                    errorMessage = 'You do not own this Pokémon.';
                } else if (err.message.includes('Round is full')) {
                    errorMessage = 'Round is full.';
                } else if (err.message.includes('User already joined this round')) {
                    errorMessage = 'You have already joined this round.';
                } else if (err.message.includes('Token is not accepted')) {
                    errorMessage = 'Transaction rejected: Token is not accepted.';
                } else if (err.message.includes('Token transfer failed')) {
                    errorMessage = 'Transaction rejected: Token transfer failed.';
                } else if (err.message.includes('joinBattle failed')) {
                    errorMessage = 'Join battle failed: joinBattle reverted.';
                } else if (err.message.includes('Simulation failed')) {
                    errorMessage = err.message;
                } else if (err.message.includes('no matching fragment')) {
                    errorMessage = 'Contract interaction failed: Invalid contract ABI. Please contact support.';
                } else {
                    errorMessage = `Transaction error: ${err.message || 'Unknown error'}`;
                }
                const newToastId = 'join-error';
                router.refresh();
                toast.dismiss();
                toast.error(errorMessage, { id: newToastId, duration: 5000 });
                setToastId(newToastId);
                setTransactionStep('idle');
                setCurrentHash(undefined);
                setIsActionPending(false);
                setIsActionConfirming(false);
                resetWrite();
                // console.log('actionJoinBattle error:', err);

                queryClient.invalidateQueries({
                    queryKey: [
                        'readContract',
                        {
                            abi: abiUserManager,
                            address: SC_USER_MANAGER,
                            functionName: 'getUserIds',
                            args: [address],
                            chainId: networkClient,
                        },
                    ],
                    refetchType: 'active',
                });
                queryClient.invalidateQueries({
                    queryKey: [
                        'readContract',
                        {
                            abi: abiBattleManager,
                            address: SC_BATTLE_MANAGER,
                            functionName: 'isUserInRound',
                            args: [BigInt(roundId), address],
                            chainId: networkClient,
                        },
                    ],
                    refetchType: 'active',
                });
                toast.dismiss();
                router.push(`/join-result/${encodeURIComponent(moonsterName)}?error=${encodeURIComponent(errorMessage)}`);
            }
        },
        [address, networkClient, baseFee, writeContractAsync, queryClient, toastId, router]
    );

    const value: ActionContextType = {
        moonster, 
        setMoonster,
        actionCapture,
        actionEvolve,
        actionJoinBattle,
        isActionPending,
        isActionConfirming,
        transactionStep,
    };

    return <ActionContext.Provider value={value}>{children}</ActionContext.Provider>;
};

export const useAction = () => {
    const context = useContext(ActionContext);
    if (!context) {
        throw new Error('useAction must be used within an ActionProvider');
    }
    return context;
};