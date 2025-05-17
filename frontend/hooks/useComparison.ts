'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export function useComparison() {
  const [comparisonList, setComparisonList] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Only run on the client side
    setIsMounted(true);
    const stored = localStorage.getItem('comparisonList');
    //console.log('useComparison: Loading from localStorage:', stored);
    if (stored) {
      const parsed = JSON.parse(stored);
      setComparisonList(parsed);
      //console.log('useComparison: Set comparisonList:', parsed);
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      //console.log('useComparison: Saving to localStorage:', comparisonList);
      localStorage.setItem('comparisonList', JSON.stringify(comparisonList));
    }
  }, [comparisonList, isMounted]);

  const addToComparison = (name: string) => {
    if (comparisonList.length >= 2) {
    //   alert('You can only compare up to 2 Pokémon at a time.');
      toast.warning("You can only compare up to 2 Pokémon at a time.")
      return;
    }
    if (comparisonList.includes(name)) {
    //   alert('This Pokémon is already in the comparison list.');
      
      toast.warning("This Pokémon is already in the comparison list.")
      return;
    }
    setComparisonList([...comparisonList, name]);
    toast.success(`${name} added to compare`)
    //console.log('useComparison: Added to comparisonList:', name, 'New list:', [...comparisonList, name]);
  };

  const removeFromComparison = (name: string) => {
    setComparisonList(comparisonList.filter((item) => item !== name));
    toast.success(`${name} remove from compare`)
    //console.log('useComparison: Removed from comparisonList:', name);
  };

  const clearComparison = () => {
    setComparisonList([]);
    //console.log('useComparison: Cleared comparisonList');
  };

  return { comparisonList, addToComparison, removeFromComparison, clearComparison, isMounted };
}