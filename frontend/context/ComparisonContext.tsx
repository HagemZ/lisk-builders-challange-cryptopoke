'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

interface ComparisonItem {
  name: string;
  id: number;
}

interface ComparisonContextType {
  comparisonList: ComparisonItem[];
  addToComparison: (name: string, id: number) => boolean;
  removeFromComparison: (name: string) => void;
  clearComparison: () => void;
  isMounted: boolean;
}

// Initialize with a default value to avoid undefined context
const defaultContextValue: ComparisonContextType = {
  comparisonList: [],
  addToComparison: () => false,
  removeFromComparison: () => {},
  clearComparison: () => {},
  isMounted: false,
};

const ComparisonContext = createContext<ComparisonContextType>(defaultContextValue);

export const ComparisonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [comparisonList, setComparisonList] = useState<ComparisonItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const addToComparison = (name: string, id: number) => {
    if (comparisonList.length >= 2) {
      toast.warning('Comparison list is full (max 2).');
      return false;
    }
    if (comparisonList.some((item) => item.name === name)) {
      toast.warning('Already in the comparison list.');
      return false;
    }
    setComparisonList((prev) => [...prev, { name, id }]);
    toast.success(`${name} added to compare`);
    return true;
  };

  const removeFromComparison = (name: string) => {
    setComparisonList((prev) => prev.filter((p) => p.name !== name));
  };

  const clearComparison = () => {
    setComparisonList([]);
  };

  return (
    <ComparisonContext.Provider
      value={{ comparisonList, addToComparison, removeFromComparison, clearComparison, isMounted }}
    >
      {children}
    </ComparisonContext.Provider>
  );
};

export const useComparison = () => {
  const context = useContext(ComparisonContext);
  // console.log('useComparison context:', context);
  // Check if the context is the default value
  if (context.addToComparison.toString().includes('=> false')) {
    throw new Error('useComparison must be used within a ComparisonProvider');
  }
  return context;
};