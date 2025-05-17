'use client';

export default function EvolutionSkeleton() {
  return (
    <div
      className="h-5 w-16 rounded-md bg-gray-600/50 animate-pulse"
      aria-label="Loading evolution position"
    />
  );
}