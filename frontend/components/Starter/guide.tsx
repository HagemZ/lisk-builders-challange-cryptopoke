import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConnectButton } from "@xellar/kit";
import { useAccount, useSwitchChain } from "wagmi";
import { Wallet, Search, Swords, Trophy, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'sonner';

interface ApiResponse {
  success: boolean;
  message: string;
  txHash?: string;
}

const CryptoPokeGameGuide: React.FC = () => {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const { address, chainId, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const correctChainId = 4202; // Lisk Sepolia Testnet chainId
  const [sending, setSending] = useState<boolean>(false);


  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const handleSwitchNetwork = async () => {
    try {
      switchChain({ chainId: correctChainId });
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  };

  const claimIDRXCP = async () => {
    if (!address) {
      toast.error('Please enter a valid Ethereum address.');
      return;
    }
    const receiver = address;
    setSending(true);
    toast.info('Submitting your request...',{duration:3000});

    try {
      const response = await axios.post<ApiResponse>('https://ace.blockdev.my.id/api/claimIDRX', { receiver });
      if (response.data.txHash) {
        toast.success("Check your wallet for IDRX ( CP Moonster Testnet )",{duration:3000});
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('An error occurred. Please try again.', {duration:3000});
      }
    } finally {
      setSending(false);      
    }
  };



  return (
    <div className="container mx-auto p-4">
      <h2 className="text-xl font-bold mb-6 text-center">Moonsters Game Guide</h2>

      {/* Step 1: Setting Up */}
      <Card className="mb-4 transition-colors hover:bg-gray-50">
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection('setup')}
        >
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-6 w-6" />
              Step 1: Setting Up
            </div>
            {openSection === 'setup' ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </CardTitle>
        </CardHeader>
        <AnimatePresence>
          {openSection === 'setup' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <CardContent>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    Connect your wallet.
                    <div className="mt-2 md:hidden">
                      <ConnectButton />
                    </div>

                    {!isConnected && (
                      <p className="text-red-500 mt-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Please connect your wallet to continue.
                      </p>
                    )}
                    {isConnected && chainId !== correctChainId && (
                      <div className="mt-2">
                        <p className="text-red-500 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          You are connected to the wrong network. Please switch to Lisk Sepolia Testnet.
                        </p>
                        <button
                          onClick={handleSwitchNetwork}
                          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                        >
                          Switch to Lisk Sepolia Testnet
                        </button>
                      </div>
                    )}
                    {isConnected && chainId === correctChainId && (
                      <div>
                        <p className="text-green-500 mt-2">
                          Connected to Lisk Sepolia Testnet!
                        </p>
                        <button
                          onClick={claimIDRXCP}
                          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                          disabled={sending}>
                          {sending ? 'Sending Request ..' : 'Need IDRX ( Moonsters Testnet )'}
                        </button>

                      </div>

                    )}
                  </li>
                  <li>Link your wallet to the game to start playing.</li>
                </ul>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Step 2: Gameplay and Rules */}
      <Card className='transition-colors hover:bg-gray-50'>
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection('gameplay')}
        >
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Swords className="h-6 w-6" />
              Step 2: Gameplay and Rules
            </div>
            {openSection === 'gameplay' ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </CardTitle>
        </CardHeader>
        <AnimatePresence>
          {openSection === 'gameplay' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <CardContent>
                <div className="space-y-6">
                  {/* MoonDex */}
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Search className="h-5 w-5" />
                      MoonDex
                    </h3>
                    <p className="mt-2">
                      Select any elemental monster you desire in the MoonDex.
                    </p>
                  </div>

                  {/* MoonTrain */}
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Swords className="h-5 w-5" />
                      MoonTrain
                    </h3>
                    <p className="mt-2">
                      Evolve your Moonsters and join battles (when available) in MoonTrain.
                    </p>
                  </div>

                  {/* MoonBoard */}
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      MoonBoard
                    </h3>
                    <p className="mt-2">
                      Check the current battle round on the MoonBoard. Available information includes:
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      <li>Current Season</li>
                      <li>Current Round</li>
                      <li>Participants per Round</li>
                      <li>Matches per Round</li>
                      <li>Leaderboard for the Current Season</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
};

export default CryptoPokeGameGuide;