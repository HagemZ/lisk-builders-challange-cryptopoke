'use client';

import { useState, useEffect } from 'react';

interface CaptureMoonster {
    name: string;
    image: string;
    location: string;
    chance: number;
}

export const useCapture = () => {
    const [captureList, setCaptureList] = useState<CaptureMoonster[]>([]);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const addToCapture = (moonster: CaptureMoonster) => {
        if (captureList.length >= 5) {
            console.log('Capture list is full (max 5 Pokémon).');
            return false;
        }
        if (captureList.some(p => p.name === moonster.name)) {
            console.log('Pokémon is already in the capture list.');
            return false;
        }
        setCaptureList(prev => [...prev, moonster]);
        return true;
    };

    const removeFromCapture = (name: string) => {
        setCaptureList(prev => prev.filter(p => p.name !== name));
    };

    const clearCapture = () => {
        setCaptureList([]);
    };

    return { captureList, addToCapture, removeFromCapture, clearCapture, isMounted };
};