
'use client';

import SimpleCatalogPage from '@/components/SimpleCatalogPage';
import { configService } from '@/services/configService';

export default function CargosPage() {
    return (
        <SimpleCatalogPage
            title="Cargos"
            description="Gerencie os cargos disponíveis para os colaboradores."
            queryKey="cargos"
            fetchMethod={configService.getCargos}
            createMethod={configService.createCargo}
            deleteMethod={configService.deleteCargo}
        />
    );
}
