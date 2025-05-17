import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCircle, FaInfoCircle } from 'react-icons/fa';
import { IoMdGitCompare } from 'react-icons/io';

const CryptoPokeFeesGuide: React.FC = () => {
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
          onClick={() => toggleSection('fees')}
        >
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-1.5">
              <Search className="h-5 w-5" />
              Step 3: Moondex (Search, Compare, Hunt)
            </div>
            {openSection === 'fees' ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </CardTitle>
        </CardHeader>
        <AnimatePresence>
          {openSection === 'fees' && (
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
                    <strong>Search</strong>: Find your Moonsters here.
                  </li>
                  <li className="transition-colors hover:bg-gray-100 p-1 rounded">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1">
                        <FaCircle className="text-[#f00962] h-6 w-6 border-2 border-[#FFFFFF] rounded-full p-1 bg-black/50" />
                        Capture Button
                      </span>
                      <span className="flex items-center gap-1">
                        <IoMdGitCompare className="h-6 w-6 border-2 border-[#083ac2] rounded-full p-1 bg-black/50 text-[#0caa68] hover:text-pink-700" />
                        Compare Button
                      </span>
                      <span className="flex items-center gap-1">
                        <FaInfoCircle className="text-[#fff7ca] h-6 w-6 hover:text-pink-700 border-2 border-[#ccd1cc] rounded-full p-1 bg-black/50" />
                        Info Button
                      </span>
                    </div>
                  </li>
                 
                  <li className="transition-colors hover:bg-gray-100 p-1 rounded">
                    <strong>Compare</strong>: Easily check advantages between Moonsters.
                  </li>
                  <li className="transition-colors hover:bg-gray-100 p-1 rounded">
                    <strong>Hunt Grid</strong>: List of target.
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

export default CryptoPokeFeesGuide;