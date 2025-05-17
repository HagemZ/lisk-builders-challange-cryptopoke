'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

interface CaptureMoonster {
    evolutionChain: any;
    id:number
    name: string;
    image: string;
    location: string;
    chance: number;
}

interface CaptureContextType {
    captureList: CaptureMoonster[];
    addToCapture: (pokemon: CaptureMoonster) => boolean;
    removeFromCapture: (name: string) => void;
    clearCapture: () => void;
    isMounted: boolean;
}

const CaptureContext = createContext<CaptureContextType | undefined>(undefined);

export const CaptureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [captureList, setCaptureList] = useState<CaptureMoonster[]>([]);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        // console.log('CaptureProvider mounted');
        setIsMounted(true);
        return () => {
            // console.log('CaptureProvider unmounted');
        };
    }, []);

    useEffect(() => {
        // console.log('CaptureProvider: captureList updated:', captureList);
    }, [captureList]);
    

    const addToCapture = (pokemon: CaptureMoonster) => {
        if (captureList.length >= (Number(process.env.NEXT_PUBLIC_MAX_CAPTURE_MOONSTER) || 9)) {
            console.log('Capture list is full (max 5 Pokémon).');
            return false;
        }
        if (captureList.some(p => p.name === pokemon.name)) {
            console.log('Pokémon is already in the capture list.');
            return false;
        }
        setCaptureList(prev => [...prev, pokemon]);
        return true;
    };

    const removeFromCapture = (name: string) => {
        setCaptureList(prev => prev.filter(p => p.name !== name));
    };

    const clearCapture = () => {
        setCaptureList([]);
    };

    return (
        <CaptureContext.Provider value={{ captureList, addToCapture, removeFromCapture, clearCapture, isMounted }}>
            {children}
        </CaptureContext.Provider>
    );
};

export const useCapture = () => {
    const context = useContext(CaptureContext);
    if (!context) {
        throw new Error('useCapture must be used within a CaptureProvider');
    }
    return context;
};