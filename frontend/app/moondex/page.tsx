import PokeBoardCom from "@/components/MoonDex";
import DefaultLayout from "@/components/ui/Layout/DefaultLayout";
import { Metadata } from "next";


export const metadata: Metadata = {
    title: "Moonsters Index",
    description: "Project Submitted for LISK Builders Challange",
};

const TamagotchiPage = () => {
    return (

        <DefaultLayout>
           <PokeBoardCom />
        </DefaultLayout>

    )
}

export default TamagotchiPage;
