'use client';
import { useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { CryptoPokeSkeleton } from '@/components/Loader'; // Adjust import path if needed
import { useAction } from '@/context/ActionContext';
import { BackgroundGradient } from '@/components/ui/background-gradient';
import Background from '@/components/Background';
import DefaultLayout from '@/components/ui/Layout/DefaultLayout';

const CaptureConfirmation = () => {
    const { actionCapture, isActionPending, isActionConfirming, moonster } = useAction();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // Redirect if no moonster data is available
    useEffect(() => {
        if (!moonster) {
            toast.error('No Moonster data available. Redirecting to MoonDex...');
            setTimeout(() => router.push('/moondex'), 2000);
        }
    }, [moonster, router]);

    const handleCapture = () => {
        if (!moonster) return;
        setIsLoading(true);
        actionCapture(moonster.id, moonster.chance, moonster.name);
    };

    const handleRelease = () => {
        setIsLoading(true);
        toast.info('Moonster released! Redirecting to MoonDex...');
        setTimeout(() => router.push('/moondex'), 3000);
    };

    if (!moonster) {
        return (
             <DefaultLayout>
            <div className="h-[25] flex items-center justify-center p-4">
                <CryptoPokeSkeleton />
            </div>
            </DefaultLayout>
        );
    }

    return (
        <DefaultLayout>
            <div className="flex items-center justify-center p-4">
                <BackgroundGradient className="rounded-[22px] p-6 dark:bg-zinc-900 bg-zinc-600 border-0 max-w-md w-full">
                    <Background className="absolute inset-0 -z-10 grid grid-cols-3 gap-8 opacity-15" />

                    {isLoading && <CryptoPokeSkeleton />}

                    {!isLoading && (
                        <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-center">
                            <h2 className="text-white text-3xl font-bold mb-4">Capture {moonster.name}?</h2>
                            <p className="text-gray-300 mb-6">
                                You’ve passed the test! Would you like to capture {moonster.name} with a {(moonster.chance).toFixed(0)}% chance?
                            </p>
                            <div className="flex justify-center gap-4">
                                <button
                                    onClick={handleCapture}
                                    className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={isActionPending || isActionConfirming}
                                >
                                    Yes, capture it!
                                </button>
                                <button
                                    onClick={handleRelease}
                                    className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={isActionPending || isActionConfirming}
                                >
                                    No, let it go
                                </button>
                            </div>
                        </div>
                    )}
                </BackgroundGradient>               
            </div>
        </DefaultLayout>

    );
};

export default CaptureConfirmation;