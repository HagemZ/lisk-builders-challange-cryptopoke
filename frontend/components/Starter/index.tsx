"use client";

import React, { Suspense, useState, useEffect } from "react";
import { BackgroundGradient } from "@/components/ui/background-gradient";
import { CryptoPokeSkeleton } from "@/components/Loader";
import MenuBarComp from "../Menubar";
import CryptoPokeGameGuide from "./guide";
import { motion } from "framer-motion";

function HomePageStarterComInner() {
  const [loading, setLoading] = useState(true);

  // Simulate loading (e.g., fetching data or initializing)
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000); // Adjust the delay as needed (e.g., 2 seconds for demo)

    return () => clearTimeout(timer); // Cleanup on unmount
  }, []);

  if (loading) {
    return <CryptoPokeSkeleton />;
  }

  return (
    <div>
      <div className="flex items-center justify-center mt-4 w-full">
        <MenuBarComp />
      </div>
      <div className="flex items-center justify-center mt-4 w-full">
        <CryptoPokeGameGuide />
      </div>
      
      <motion.div
        className="flex items-center justify-center mt-4 w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <BackgroundGradient className="rounded-[22px] p-4 sm:p-10 dark:bg-zinc-900 bg-white">
          <div className="flex items-center justify-center">
            <img
              src={`/logos.png`}
              alt="cryptopoke"
              height="250"
              width="250"
              className="object-contain"
            />
          </div>

          <p className="text-base sm:text-lg text-black mt-4 mb-2 dark:text-neutral-200 text-center items-center">
            Project Submitted for LISK Builders Challenge
          </p>

          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Moonsters is an exciting GameFi project that bridges the nostalgia of cherished childhood memories with the thrill of blockchain innovation.
          </p>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center items-center">
            Develop by <a href="//https://x.com/HagemzDev">Hagemz</a> & Documentation by <a href="https://x.com/ahawi_channel">Abid Hanan</a>
          </p>
        </BackgroundGradient>
      </motion.div>
    </div>
  );
}

export default function HomePageStarterCom() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground">Loading...</div>}>
      <HomePageStarterComInner />
    </Suspense>
  );
}