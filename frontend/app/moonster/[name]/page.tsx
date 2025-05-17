import { notFound } from 'next/navigation';
import { getMoonsterByName } from '@/actions/getMoonsterData'; 
import { Metadata } from 'next';
import MoonstersDetailsClient from '@/components/MoonsterDetails';

// Define props interface for both page and metadata
interface MoonsterPageProps {
  params: Promise<{ name: string }>;
}

// Generate dynamic metadata
export async function generateMetadata({ params }: MoonsterPageProps): Promise<Metadata> {
  const { name } = await params; // Resolve params to get the Moonster name
  const moonsterName = name as string;
  const moonster = await getMoonsterByName(moonsterName);

  const title = moonster
    ? `Moonster - ${moonster.name.charAt(0).toUpperCase() + moonster.name.slice(1)}`
    : 'Moonster - Not Found';

  return {
    title,
    description: 'Project Submitted for LISK Builders Challenge',
  };
}

export default async function MoonsterPage({ params }: MoonsterPageProps) {
  // Access params.name with type assertion to satisfy Next.js
  const { name } = await params; // Resolve params to get the Moonster name
  const moonsterName = name as string;
  const moonster = await getMoonsterByName(moonsterName);

  if (!moonster) {
    notFound();
  }

  return <MoonstersDetailsClient moonster={moonster} />;
}