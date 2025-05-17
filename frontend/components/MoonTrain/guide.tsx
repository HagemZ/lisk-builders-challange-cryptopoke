import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, ChevronDown, ChevronUp, Swords } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCircle, FaInfoCircle } from 'react-icons/fa';
import { IoMdGitCompare } from 'react-icons/io';

const CryptoMoonTrainGuide: React.FC = () => {
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <div className="container mx-auto p-3">
      {/* Step 3: PokéDex (Search, Hunt, Compare) */}
      <Card className="transition-colors hover:bg-gray-50">
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection('train')}
        >
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-1.5">
              <Swords className="h-5 w-5" />
              Step 4: Moontrain ( Moonster, Evolve, Battle)
            </div>
            {openSection === 'train' ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </CardTitle>
        </CardHeader>
        <AnimatePresence>
          {openSection === 'train' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <CardContent className="p-4">
                <ul className="list-disc pl-4 space-y-1.5 text-sm">
                  <li className="transition-colors hover:bg-gray-100 p-1 rounded">
                    <strong>Moonster List</strong>: Select your captured Moonster to start train ( evolve )
                  </li>      
                  <li className="transition-colors hover:bg-gray-100 p-1 rounded">
                    <strong>Evolve</strong>: Each Moonster can evolve to 2 times.
                  </li>      
                  <li className="transition-colors hover:bg-gray-100 p-1 rounded">
                    <strong>Join Battle</strong>: Check regularly for each active round. Join battle will give reward and point for Moonboard
                  </li>
                </ul>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
};

export default CryptoMoonTrainGuide;