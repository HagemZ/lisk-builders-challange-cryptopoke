import { Metadata } from "next";
import DefaultLayout from '@/components/ui/Layout/DefaultLayout';
import HomePageStarterCom from "@/components/Starter"


export const metadata: Metadata = {
  title: "Moonsters -  GameFi @LISK Builders Challange",
  description: "Moonsters is an exciting GameFi project @LISK Builders Challange that bridges the nostalgia of cherished childhood memories with the thrill of blockchain innovation. Join the journey and be part of a game that’s not just entertaining but rewarding too!",
};


const Page = () => {
  return (
    <DefaultLayout>
      <HomePageStarterCom />
  
    </DefaultLayout>
  );
};

export default Page;
