
'use client';

import SimpleCatalogPage from '@/components/SimpleCatalogPage';
import { configService } from '@/services/configService';

export default function SetoresPage() {
    return (
        <SimpleCatalogPage
            title="Setores"
            description="Gerencie os setores (departamentos) da organização."
            queryKey="setores"
            fetchMethod={configService.getSetores}
            createMethod={configService.createSetor}
            deleteMethod={configService.deleteSetor}
        />
    );
}
