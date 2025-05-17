import PokeBoard from "@/components/MoonBoard";
import DefaultLayout from "@/components/ui/Layout/DefaultLayout";
import { Metadata } from "next";


export const metadata: Metadata = {
    title: "Moonster Board",
    description: "Project Submitted for LISK Builders Challange",
};

const PokeBoardPage = () => {
    return (

        <DefaultLayout>
           <PokeBoard />
        </DefaultLayout>

    )
}

export default PokeBoardPage;
