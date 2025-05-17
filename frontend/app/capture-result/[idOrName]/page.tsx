'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAccount, useReadContract } from 'wagmi';
import Image from 'next/image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

import { abiUserManager } from '@/utils';
import { SC_USER_MANAGER } from '@/context/constants';
import { MoonstersDetails } from '@/types/moonsters';
import { useAction } from '@/context/ActionContext';
import { getMoonsterByName } from '@/actions/getMoonsterData';
import { BackgroundGradient } from '@/components/ui/background-gradient';
import Background from '@/components/Background';
import MenuBarComp from '@/components/Menubar';
import { CryptoMoonSkeleton } from '@/components/Loader';
import DefaultLayout from '@/components/ui/Layout/DefaultLayout';

// Blockchain explorer URL for Lisk Sepolia Testnet
const EXPLORER_URL = 'https://sepolia-blockscout.lisk.com/tx/';
const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_IMAGE_BASE;

type EVMAddress = `0x${string}`;

const CaptureResultPage = () => {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { address, isConnected, chainId } = useAccount();
  const { isActionPending, isActionConfirming, actionCapture } = useAction();
  const [loading, setLoading] = useState<boolean>(true);
  const [moonster, setMoonster] = useState<MoonstersDetails | null>(null);
  const [captureResult, setCaptureResult] = useState<'success' | 'fail' | 'pending' | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [pollingFailed, setPollingFailed] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const idOrName = params.idOrName as string;
  const chainNetwork = Number(chainId);

  // Sync transactionHash and error state with URL parameters
  useEffect(() => {
    const hash = searchParams.get('hash');
    const error = searchParams.get('error');
    console.log('All search params:', Object.fromEntries(searchParams));
    console.log('Raw error from searchParams:', error);
    setTransactionHash(hash);
    if (error) {
      try {
        setErrorMessage(decodeURIComponent(error));
        setCaptureResult('fail');
      } catch (err) {
        console.error('Failed to decode URI:', err);
        setErrorMessage('Invalid error message received. Please try again.');
        setCaptureResult('fail');
        toast.error('Invalid error message format. Please try again.', { duration: 5000 });
      }
    }
  }, [searchParams]);

  // Fetch captured Moonster IDs
  const { data: capturedIds, isLoading: isIdsLoading, error: idsError, refetch: refetchIds } = useReadContract({
    abi: abiUserManager,
    address: SC_USER_MANAGER,
    functionName: 'getUserIds',
    args: address ? [address] : undefined,
    chainId: 4202,
  });

  console.log('capturedIds', capturedIds);

  // Fetch Moonster details
  useEffect(() => {
    const fetchMoonster = async () => {
      if (!idOrName) return;

      try {
        setLoading(true);
        setFetchError(null);
        console.log('Fetching Moonster with name:', idOrName);
        const MoonstersDetails = await getMoonsterByName(idOrName);
        console.log('Moonster details:', MoonstersDetails);
        if (MoonstersDetails) {
          setMoonster(MoonstersDetails);
        } else {
          throw new Error('No Moonster data returned.');
        }
      } catch (err) {
        const errorMessage = 'Failed to load Moonster details. Please try again.';
        setFetchError(errorMessage);
        toast.error(errorMessage, { duration: 5000 });
      } finally {
        setLoading(false);
      }
    };

    fetchMoonster();
  }, [idOrName]);

  // Polling logic for captured IDs
  useEffect(() => {
    if (!isIdsLoading && !idsError && capturedIds && moonster && transactionHash && !errorMessage) {
      const ids = capturedIds.map((id) => Number(id));
      console.log('Captured IDs:', ids, 'Moonster ID:', moonster.id);

      // If captureResult is already set, skip polling
      if (captureResult === 'success' || captureResult === 'fail') return;

      // If the ID is already in the list, set success immediately
      if (ids.includes(moonster.id)) {
        setCaptureResult('success');
        setIsPolling(false);
        return;
      }

      // Start polling if transactionHash exists and ID is not found
      setIsPolling(true);
      setCaptureResult('pending');

      const maxPollingTime = 30_000; // 30 seconds
      const pollingInterval = 3_000; // 3 seconds
      const startTime = Date.now();

      const poll = async () => {
        try {
          const { data: newIds } = await refetchIds();
          const updatedIds = newIds ? newIds.map((id) => Number(id)) : [];
          console.log('Polling Captured IDs:', updatedIds);

          if (updatedIds.includes(moonster.id)) {
            setCaptureResult('success');
            setIsPolling(false);
            return;
          }

          if (Date.now() - startTime >= maxPollingTime) {
            setCaptureResult('fail');
            setIsPolling(false);
            setPollingFailed(true);
            toast.error('Capture process failed to update on-chain. Please try again.', { duration: 5000 });
            return;
          }

          // Continue polling
          setTimeout(poll, pollingInterval);
        } catch (err) {
          console.error('Polling error:', err);
          setCaptureResult('fail');
          setIsPolling(false);
          setPollingFailed(true);
          toast.error('Error while checking capture status. Please try again.', { duration: 5000 });
        }
      };

      // Start polling
      poll();
    } else if (idsError) {
      console.error('Captured IDs error:', idsError);
      toast.error('Failed to load captured Moonster IDs.', { duration: 5000 });
      setCaptureResult('fail');
      setIsPolling(false);
    }
  }, [capturedIds, isIdsLoading, idsError, moonster, transactionHash, refetchIds, captureResult, errorMessage]);

  // Redirect if not connected or wrong network
  useEffect(() => {
    if (!isConnected || chainNetwork !== 4202) {
      toast.error('Please connect to the Lisk Sepolia Testnet.', { duration: 5000 });
      router.push('/');
    }
  }, [isConnected, chainNetwork, router]);

  // Handle Try Again button click
  const handleTryAgain = async () => {
    if (!moonster || !moonster.id || moonster.chance === undefined) {
      toast.error('Moonster details not available. Please try again later.', { duration: 5000 });
      return;
    }

    try {
      toast.info(`Attempting to capture ${moonster.name} again...`, { duration: 5000 });
      console.log('Try Again clicked:', { id: moonster.id, chance: moonster.chance, name: moonster.name });
      await actionCapture(moonster.id, moonster.chance, moonster.name);
      // Reset polling state for a new attempt
      setIsPolling(false);
      setPollingFailed(false);
      setCaptureResult(null);
      setErrorMessage(null);
      setTransactionHash(null); // Reset transaction hash to force re-evaluation
    } catch (err) {
      console.error('handleTryAgain error:', err);
      toast.error('Failed to retry capture. Please try again.', { duration: 5000 });
    }
  };

  if (loading) {
    return <CryptoMoonSkeleton />;
  }

  // Show error state if fetch failed
  if (fetchError || !moonster) {
    return (
      <div className="relative min-h-screen">
        <div className="relative w-full mx-auto p-4">
          <BackgroundGradient className="rounded-[22px] p-2 dark:bg-zinc-900 bg-zinc-600 border-0">
            <Background className="absolute inset-0 -z-10 grid grid-cols-3 gap-8 opacity-15" />
            <MenuBarComp />
            <div className="max-w-5xl w-full mx-auto p-4">
              <h2 className="text-2xl font-bold text-white mb-4">Capture Result</h2>
              <div className="bg-gray-800 rounded-md shadow-xl p-4 border border-neutral-800">
                <p className="text-red-400">{fetchError || 'Moonster data not available.'}</p>
                {transactionHash && transactionHash !== 'undefined' && (
                  <p className="text-gray-50 text-sm mt-2">
                    <span className="font-semibold">Transaction: </span>
                    <a
                      href={`${EXPLORER_URL}${transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      View on Lisk Sepolia Explorer
                    </a>
                  </p>
                )}
                <div className="mt-4 flex justify-center gap-3">
                  <Button
                    onClick={() => router.push('/moondex')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    disabled={isActionPending || isActionConfirming}
                  >
                    ← Back to MoonDex
                  </Button>
                  <Button
                    onClick={() => router.push('/moontrain')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    disabled={isActionPending || isActionConfirming}
                  >
                    Go to MoonTrain →
                  </Button>
                </div>
              </div>
            </div>
          </BackgroundGradient>
        </div>
      </div>
    );
  }

  return (
    <DefaultLayout>
      <div className="relative min-h-screen">
        <div className="relative w-full mx-auto p-4">
          <BackgroundGradient className="rounded-[22px] p-2 dark:bg-zinc-900 bg-zinc-600 border-0">
            <Background className="absolute inset-0 -z-10 grid grid-cols-3 gap-8 opacity-15" />
            <MenuBarComp />
            <div className="max-w-5xl w-full mx-auto p-4">
              <h2 className="text-2xl font-bold text-white mb-4">Capture Result</h2>
              <div className="bg-gray-800 rounded-md shadow-xl p-4 border border-neutral-800">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold capitalize text-gray-50">{moonster.name}</h3>
                </div>
                <div className="flex justify-center mb-4">
                  <Image
                    src={`${IMAGE_BASE_URL}${moonster.image}`}
                    alt={`${moonster.name} artwork`}
                    width={200}
                    height={200}
                    className="object-contain"
                    placeholder="blur"
                    blurDataURL="/no_image.png"
                  />
                </div>
                <div className="text-gray-50 text-sm space-y-2">
                  <p>
                    <span className="font-semibold">Capture Result: </span>
                    {transactionHash === null && errorMessage ? (
                      <span className="text-red-400">{errorMessage}</span>
                    ) : isPolling ? (
                      <span className="text-yellow-400">Checking capture status...</span>
                    ) : captureResult === 'success' ? (
                      <span className="text-green-400">Success! Moonster captured!</span>
                    ) : captureResult === 'fail' ? (
                      <span className="text-red-400">
                        {pollingFailed ? 'Capture process failed to update on-chain.' : 'Failed to capture Moonster.'}
                      </span>
                    ) : (
                      <span>Loading...</span>
                    )}
                  </p>
                  <p>
                    <span className="font-semibold">Capture Chance: </span>
                    {moonster.chance || 0}%
                  </p>
                  <p>
                    <span className="font-semibold">Location: </span>
                    {moonster.location || 'Unknown'}
                  </p>
                  {transactionHash && transactionHash !== 'undefined' && (
                    <p>
                      <span className="font-semibold">Transaction: </span>
                      <a
                        href={`${EXPLORER_URL}${transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        View on Lisk Sepolia Explorer
                      </a>
                    </p>
                  )}
                  {(captureResult === 'fail' || (transactionHash === null && errorMessage)) && !pollingFailed && (
                    <p className="text-yellow-400">
                      The capture attempt failed due to the error. You can try again or choose another Moonster.
                    </p>
                  )}
                  {pollingFailed && (
                    <p className="text-yellow-400">
                      The capture transaction may have failed to update on-chain. Please try again.
                    </p>
                  )}
                </div>
                <div className="mt-4 flex justify-center gap-3">
                  <Button
                    onClick={() => router.push('/moondex')}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-blue-700"
                    disabled={isActionPending || isActionConfirming || isPolling}
                  >
                    ← Back to MoonDex
                  </Button>
                  {/* {(captureResult === 'fail' || (transactionHash === null && errorMessage)) && (
                    <Button
                      onClick={handleTryAgain}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                      disabled={isActionPending || isActionConfirming || isPolling}
                    >
                      Try Again
                    </Button>
                  )} */}
                  <Button
                    onClick={() => router.push('/moontrain')}
                    className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-blue-700"
                    disabled={isActionPending || isActionConfirming || isPolling}
                  >
                    Go to MoonTrain →
                  </Button>
                </div>
              </div>
            </div>
          </BackgroundGradient>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default CaptureResultPage;