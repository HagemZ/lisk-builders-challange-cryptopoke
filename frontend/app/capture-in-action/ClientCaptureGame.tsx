'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAction } from '@/context/ActionContext';
import AnimalCaptureGame from "@/components/CaptureInAction";
import { BackgroundGradient } from '@/components/ui/background-gradient';
import Background from '@/components/Background';
import MenuBarComp from '@/components/Menubar';

const ClientCaptureGame = () => {
    const router = useRouter();
    const { moonster } = useAction();
    const [localMoonster, setLocalMoonster] = useState<{ id: number; chance: number; name: string } | null>(null);

    console.log(moonster)
    useEffect(() => {
        if (!localMoonster && moonster) {

            setLocalMoonster(moonster);
        } else if (!localMoonster && !moonster) {
            router.push('/moondex');
        }
    }, [moonster, localMoonster, router]);

    if (!localMoonster) {
        return <div>Loading...</div>;
    }

    return (
        <div className="relative min-h-screen">

            {/* Wrapper to constrain BackgroundGradient height */}
            <div className="flex items-center justify-center p-4">

                <BackgroundGradient className="rounded-[22px] p-2 dark:bg-zinc-900 bg-zinc-600 border-0">
                    {/* Background Component */}
                    <Background
                        className="absolute inset-0 -z-10 grid grid-cols-3 gap-8 opacity-15"
                    />
                    <MenuBarComp />
                    <AnimalCaptureGame
                        moonster={localMoonster}
                        onCaptureComplete={() => {
                            router.push('/capture-confirmation');
                        }}
                    />

                </BackgroundGradient>
            </div>
        </div>

    );
};

export default ClientCaptureGame;