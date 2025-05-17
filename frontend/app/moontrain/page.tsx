import CapturedPokemon from '@/components/MoonTrain';
import DefaultLayout from '@/components/ui/Layout/DefaultLayout';

import { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Moonster Trainer",
    description: "Project Submitted for LISK Builders Challange",
};
const CapturedPage = () => {

    return (
        <DefaultLayout>           
            <CapturedPokemon />
        </DefaultLayout>
    );
};

export default CapturedPage;