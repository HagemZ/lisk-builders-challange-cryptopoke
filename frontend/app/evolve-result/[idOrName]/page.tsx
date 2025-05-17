import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getMoonsterByName } from '@/actions/getMoonsterData'; // Updated import
import Background from '@/components/Background';
import MenuBarComp from '@/components/Menubar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import DefaultLayout from '@/components/ui/Layout/DefaultLayout';

type Props = {
  params: Promise<{ idOrName: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_IMAGE_BASE;

export async function generateMetadata({ params }: Props) {
  const resolvedParams = await Promise.resolve(params);
  const idOrName = resolvedParams.idOrName;
  const moonsterName = decodeURIComponent(idOrName);
  return {
    title: `Moonster - ${moonsterName.charAt(0).toUpperCase() + moonsterName.slice(1)} Evolved`,
    description: `Evolution result for ${moonsterName} in Moonster.`,
  };
}

export default async function EvolveResultPage({ params, searchParams }: Props) {
  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const idOrName = resolvedParams.idOrName;
  const moonsterName = decodeURIComponent(idOrName);
  const hashing = resolvedSearchParams.hash;
  const hash = Array.isArray(hashing) ? hashing[0] : hashing;
  const transactionHash = hash ? String(hash) : 'N/A';
  const explorerUrl = process.env.NEXT_PUBLIC_LISK_SEPOLIA_SCAN || 'https://sepolia-blockscout.lisk.com/tx/';

  let moonster;
  try {
    moonster = await getMoonsterByName(moonsterName);
  } catch (error) {
    console.error(`Error fetching Moonster ${moonsterName}:`, error);
    notFound();
  }

  if (!moonster) {
    notFound();
  }

  return (
    <DefaultLayout>
      <div className="relative min-h-screen">
        <div className="relative w-full mx-auto p-4">
          <Background className="absolute inset-0 -z-10 grid grid-cols-3 gap-8 opacity-15" />
          <MenuBarComp />
          <div className="relative p-4 mt-4">
            <div className="bg-gray-800 rounded-md shadow-xl p-6 border border-neutral-800 text-center">
              <h1 className="text-2xl font-bold text-gray-50 mb-4">Evolution Successful!</h1>
              <p className="text-gray-300 mb-4">
                Congratulations! Your Moonster has evolved into{' '}
                <span className="font-semibold capitalize">{moonster.name}</span>.
              </p>
              <div className="flex justify-center mb-4">
                <Image
                  src={`${IMAGE_BASE_URL}${moonster.image}`}
                  alt={`${moonster.name} artwork`}
                  width={200}
                  height={200}
                  className="object-contain"
                  placeholder="blur"
                  blurDataURL="/no_image.png"
                />
              </div>
              <p className="text-gray-300 mb-2">
                Transaction Hash:{' '}
                {transactionHash === 'N/A' ? (
                  <span className="font-mono text-sm break-all">{transactionHash}</span>
                ) : (
                  <Link
                    href={`${explorerUrl}${transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm text-blue-400 hover:underline break-all"
                  >
                    {transactionHash}
                  </Link>
                )}
              </p>
              <Link href="/moontrain"> {/* Updated path */}
                <Button className="bg-orange-500 text-white rounded-lg px-4 py-2">
                  Back to MoonTrain
                </Button>
              </Link>
              <div className="mt-6"></div>
            </div>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
}