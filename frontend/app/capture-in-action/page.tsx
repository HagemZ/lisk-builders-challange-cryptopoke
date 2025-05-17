import DefaultLayout from '@/components/ui/Layout/DefaultLayout';
import ClientCaptureGame from './ClientCaptureGame'; // Import the client component

export const metadata = {
  title: "Moonsters - GameFi @LISK Builders Challenge",
  description: "Moonsters is an exciting GameFi project @LISK Builders Challenge that bridges the nostalgia of cherished childhood memories with the thrill of blockchain innovation. Join the journey and be part of a game that’s not just entertaining but rewarding too!",
};

// This is a Server Component
const Page = () => {
  return (
    <DefaultLayout>
      <div className="container mx-auto p-4">
        <ClientCaptureGame />
      </div>     
    </DefaultLayout>
  );
};

export default Page;