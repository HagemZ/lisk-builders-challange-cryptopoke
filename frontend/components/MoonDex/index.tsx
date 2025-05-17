"use client";
import React, { Suspense, useEffect, useState } from "react";
import { useAccount, useBalance, useDisconnect, useReadContract } from "wagmi";
import { BackgroundGradient } from "@/components/ui/background-gradient";
import { CryptoPokeSkeleton } from "@/components/Loader";
import { useCapture } from "@/context/CaptureContext"; // Import useCapture
import { useComparison } from "@/context/ComparisonContext"; // Import useCapture

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter } from "next/navigation";

import Background from "../Background";
import SearchMondex from "../Search";
import CompareMondex from "../Compare";
import CaptureMoonster from "../Capture";

import MenuBarComp from "../Menubar";
import CryptoPokeFeesGuide from "./guide";



function PokeBoardInner() {
  const router = useRouter();
  const { address, chainId, isConnected } = useAccount();
  const { captureList } = useCapture(); // Get capture
  const { comparisonList } = useComparison(); // Get capture

  const chainNetwork = Number(chainId);
  const [isClient, setIsClient] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [networkClient, setNetworkClient] = useState<number | null>(null);
  const [tabValue, setTabValue] = useState('search'); // Control the active tab


  useEffect(() => {
    const fetchData = async () => {
      if (address && isConnected) {
        setIsClient(true);
        setNetworkClient(chainNetwork);
       
      } else {
        setIsClient(false);
        router.push("/")
      }

      // Simulate loading delay
      setTimeout(() => setLoading(false), 2000);
    };

    fetchData();
  }, [address, chainId, isConnected]);

// Redirect if not connected or on wrong network
useEffect(() => {
  // if (!isConnected || netWorkId !== 4202) {
  if (networkClient === null) {
    return
  } 

  if (!isConnected || networkClient !== 4202) {
    setTimeout(() => setLoading(false), 2000);
    router.push('/');
  }
}, [isConnected, networkClient, router]);


  if (loading) {
    return <CryptoPokeSkeleton />;
  }

  return (
    <div className="relative min-h-screen">
    
      {/* Wrapper to constrain BackgroundGradient height */}
      <div className="relative w-full mx-auto p-4">

        <BackgroundGradient className="rounded-[22px] p-2 dark:bg-zinc-900 bg-zinc-600 border-0">
          {/* Background Component */}
          <Background
            className="absolute inset-0 -z-10 grid grid-cols-3 gap-8 opacity-15"
          />
          <MenuBarComp />
          <CryptoPokeFeesGuide />

          <div className="relative min-h-screen">
            {/* Content Div */}
            <Tabs value={tabValue} onValueChange={setTabValue} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-zinc-400 text-muted-foreground ">
                <TabsTrigger value="search">Search</TabsTrigger>
                <TabsTrigger value="compare" className="relative">
                  Compare
                  {comparisonList.length > 0 && (
                    <span className="absolute right-[-1px] top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs text-white">
                      {comparisonList.length}
                    </span>
                  )}
                  </TabsTrigger>
                <TabsTrigger value="list" className="relative">
                  Hunt Grid
                  {captureList.length > 0 && (
                    <span className="absolute right-[-1px] top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs text-white">
                      {captureList.length}
                    </span>
                  )}
                   </TabsTrigger>
               
              </TabsList>
              <TabsContent value="search" className={tabValue === 'search' ? '' : 'hidden'}>
                <SearchMondex walletState={isConnected} netWorkId={networkClient ?? 0} />
              </TabsContent>
             
              <TabsContent value="compare" className={tabValue === 'compare' ? '' : 'hidden'}>
                <CompareMondex onTabChange={setTabValue} />
              </TabsContent>
              <TabsContent value="list" className={tabValue === 'list' ? '' : 'hidden'}>
                <CaptureMoonster walletState={isConnected} netWorkId={networkClient ?? 0} />
              </TabsContent>
            </Tabs>
          </div>
        </BackgroundGradient>
      </div>
    </div>
  );
}



export default function PokeBoardCom() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground">Loading...</div>}>
      <PokeBoardInner />
    </Suspense>
  );
}