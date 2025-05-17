"use client";
import React, { useEffect, useState } from "react";
import { useAccount, useDisconnect, useReadContract } from "wagmi";
import { Button } from "../ui/button";
import { ConnectButton } from "@xellar/kit";
import { Badge } from "../ui/badge";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { abiIDRXCP } from "@/utils/abiIDRXCP";
import { SC_IDRXCP_TESTNET } from "@/context/constants";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation"; // Import usePathnam
import { BackgroundGradient } from "../ui/background-gradient";
type Props = {};
type EVMAddress = `0x${string}`;

const MenuBarComp = (props: Props) => {
    const router = useRouter();
    const pathname = usePathname(); // Get the current pathname
    const { address, chainId, isConnected } = useAccount();
    const { disconnect } = useDisconnect();
    const chainNetwork = Number(chainId);
    const [isClient, setIsClient] = useState(false);
    const [networkClient, setNetworkClient] = useState<number | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        if (address) {
            setIsClient(true);
            setNetworkClient(chainNetwork);
        } else {
            setIsClient(false);
            router.push("/");
        }
    }, [address, chainId, isConnected]);

    const tokenBalance = useReadContract({
        abi: abiIDRXCP,
        address: SC_IDRXCP_TESTNET,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
    });

    const decimalsFromTokenData = 2;

    const formatNumber = (
        number: number | bigint | string | null | undefined,
        decimals: number = 18
    ): string => {
        if (!number) return "0";
        let num: bigint | number;
        try {
            if (typeof number === "string") {
                num = BigInt(number);
            } else if (typeof number === "bigint") {
                num = number;
            } else {
                num = Number(number);
                if (isNaN(num)) return "0";
            }
        } catch {
            return "0";
        }

        if (typeof num === "bigint") {
            const divisor = BigInt(10) ** BigInt(decimals);
            const formattedNum = Number(num) / Number(divisor);
            return formattedNum.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
        }

        const divisor = Math.pow(10, decimals);
        const formattedNum = num / divisor;
        return formattedNum.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    return (
        <div className="relative w-full">
            <BackgroundGradient className="rounded-[17px] p-1 sm:p-1 dark:bg-zinc-900 bg-zinc-200">

                <div className="flex items-center justify-between px-4 py-2 bg-zinc-200 shadow-sm rounded-lg">
                    <Button
                        onClick={() => router.push("/")}
                        className="bg-blue-500 text-white rounded-lg px-4 py-2"
                    >
                        Home
                    </Button>
                    <button
                        onClick={() => setMenuOpen(true)}
                        className="sm:hidden bg-gray-200 p-2 rounded-full hover:bg-gray-300 transition-all"
                    >
                        <Menu size={24} />
                    </button>
                    <div className="hidden sm:flex items-center gap-4">
                        {pathname !== "/moondex" && (
                            <Button
                                onClick={() => router.push("/moondex")}
                                className="bg-green-500 text-white rounded-lg px-4 py-2"
                            >
                                MoonDex
                            </Button>
                        )}
                        {pathname !== "/moontrain" && (
                            <Button
                                onClick={() => router.push("/moontrain")}
                                className="bg-orange-500 text-white rounded-lg px-4 py-2"
                            >
                                MoonTrain
                            </Button>
                        )}
                        {pathname !== "/moonboard" && (
                            <Button
                                onClick={() => router.push("/moonboard")}
                                className="bg-purple-500 text-white rounded-lg px-4 py-2"
                            >
                                MoonBoard
                            </Button>
                        )}

                        {isClient ? (
                            <>
                                {networkClient === 4202 ? (
                                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                        <ConnectButton />
                                        <Badge className="bg-gray-200 text-sm text-black flex items-center px-4 py-2">
                                            {formatNumber(tokenBalance?.data, decimalsFromTokenData)}
                                            <Image
                                                src="/tokens/26732.png"
                                                alt="IDRX"
                                                height={20}
                                                width={20}
                                                className="ml-2"
                                            />
                                        </Badge>
                                        <Button
                                            className="bg-red-600 text-white rounded-lg px-4 py-2"
                                            onClick={() => disconnect()}
                                        >
                                            Disconnect
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center">
                                        <Badge className="py-2 px-4 bg-red-900 text-white">
                                            Change to Lisk Sepolia Testnet
                                        </Badge>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex items-center justify-center">
                                <ConnectButton.Custom>
                                    {({ account, openConnectModal, isConnected, disconnect }) => {
                                        return (
                                            <div>
                                                {!isConnected || !account ? (
                                                    <Button onClick={openConnectModal}>Connect Wallet</Button>
                                                ) : null}
                                            </div>
                                        );
                                    }}
                                </ConnectButton.Custom>
                            </div>
                        )}

                    </div>
                </div>
            </BackgroundGradient>
            {/* Slide-out Menu */}
            {menuOpen && (
                <div className="fixed inset-0 z-50 flex">
                    <div
                        className="absolute inset-0 bg-black opacity-50"
                        onClick={() => setMenuOpen(false)}
                    ></div>
                    <div className="relative bg-white w-64 h-full shadow-lg z-50">
                        <div className="flex items-center justify-between p-4">
                            <h2 className="text-lg font-bold">Menu</h2>
                            <button
                                onClick={() => setMenuOpen(false)}
                                className="p-2 rounded-full hover:bg-gray-200 transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex flex-col gap-4 p-4">
                            {pathname !== "/moondex" && (
                                <Button
                                    onClick={() => {
                                        setMenuOpen(false);
                                        router.push("/moondex");
                                    }}
                                    className="bg-green-500 text-white rounded-lg px-4 py-2"
                                >
                                    MoonDex
                                </Button>
                            )}
                            {pathname !== "/moontrain" && (
                                <Button
                                    onClick={() => {
                                        setMenuOpen(false);
                                        router.push("/moontrain");
                                    }}
                                    className="bg-orange-500 text-white rounded-lg px-4 py-2"
                                >
                                    MoonTrain
                                </Button>
                            )}
                            {pathname !== "/moonboard" && (
                                <Button
                                    onClick={() => {
                                        setMenuOpen(false);
                                        router.push("/moonboard");
                                    }}
                                    className="bg-purple-500 text-white rounded-lg px-4 py-2"
                                >
                                    MoonBoard
                                </Button>
                            )}
                            {/* <ConnectButton />
                            <Badge className="bg-gray-200 text-sm text-black flex items-center px-4 py-2">
                                {formatNumber(tokenBalance?.data, decimalsFromTokenData)}
                                <Image
                                    src="/tokens/26732.png"
                                    alt="IDRX"
                                    height={20}
                                    width={20}
                                    className="ml-2"
                                />
                            </Badge>
                            <Button
                                className="bg-red-600 text-white rounded-lg px-4 py-2"
                                onClick={() => disconnect()}
                            >
                                Disconnect
                            </Button> */}
                            {isClient ? (
                                <>
                                    {networkClient === 4202 ? (
                                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                            <ConnectButton />
                                            <Badge className="bg-gray-200 text-sm text-black flex items-center px-4 py-2">
                                                {formatNumber(tokenBalance?.data, decimalsFromTokenData)}
                                                <Image
                                                    src="/tokens/26732.png"
                                                    alt="IDRX"
                                                    height={20}
                                                    width={20}
                                                    className="ml-2"
                                                />
                                            </Badge>
                                            <Button
                                                className="bg-red-600 text-white rounded-lg px-4 py-2"
                                                onClick={() => disconnect()}
                                            >
                                                Disconnect
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center">
                                            <Badge className="py-2 px-4 bg-red-900 text-white">
                                                Change to Lisk Sepolia Testnet
                                            </Badge>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex items-center justify-center">
                                    <ConnectButton.Custom>
                                        {({ account, openConnectModal, isConnected, disconnect }) => {
                                            return (
                                                <div>
                                                    {!isConnected || !account ? (
                                                        <Button onClick={openConnectModal}>Connect Wallet</Button>
                                                    ) : null}
                                                </div>
                                            );
                                        }}
                                    </ConnectButton.Custom>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MenuBarComp;
