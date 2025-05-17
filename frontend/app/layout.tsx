'use client'

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner"

import { Config, WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { liskSepolia, sepolia } from "viem/chains";
import { defaultConfig, XellarKitProvider } from "@xellar/kit";
import { CaptureProvider } from "@/context/CaptureContext";
import { ComparisonProvider } from "@/context/ComparisonContext";
import { ActionProvider } from "@/context/ActionContext";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLET_REOWN_PROJECT_ID as string;
const xellarAppId = process.env.NEXT_PUBLIC_WALLET_XELLAR_ID as string;

const config = defaultConfig({
  appName: "BlockDev",
  walletConnectProjectId,
  xellarAppId,
  xellarEnv: "sandbox",
  chains: [liskSepolia],
}) as Config;

const queryClient = new QueryClient();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            {/* <XellarKitProvider theme={darkTheme}> */}
            <XellarKitProvider>
            <CaptureProvider>
            <ComparisonProvider>
              <ActionProvider>               
                 {children}
              </ActionProvider>            
              </ComparisonProvider>
              </CaptureProvider>
              <Toaster />
            </XellarKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
