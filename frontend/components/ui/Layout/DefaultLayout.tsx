"use client";
import React from "react";
import { BackgroundGradient } from "../background-gradient";




export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex items-center justify-center p-2 max-w-[1340px] mx-auto">
        <div className="w-full 2xl:h-[98vh] h-auto glass-1 overflow-y-scroll">
          {/* <!-- ===== Main Content Start ===== --> */}
          <main>
            <div className="mx-auto max-w-screen-2xl p-2 md:p-4 2xl:p-6">
               <BackgroundGradient className="rounded-[22px] p-1 sm:p-4 dark:bg-zinc-900 bg-white">
               {children}
               </BackgroundGradient>
            </div>
          </main>
          {/* <!-- ===== Main Content End ===== --> */}
        </div>
        {/* <!-- ===== Content Area End ===== --> */}
      </div>
      {/* <!-- ===== Page Wrapper End ===== --> */}
    </>
  );
}
