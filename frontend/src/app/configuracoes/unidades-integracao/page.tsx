
'use client';

import SimpleCatalogPage from '@/components/SimpleCatalogPage';
import { configService } from '@/services/configService';

export default function UnidadesIntegracaoPage() {
    return (
        <SimpleCatalogPage
            title="Unidades de Integração"
            description="Gerencie as unidades onde ocorrem as integrações."
            queryKey="unidades-integracao"
            fetchMethod={configService.getUnidadesIntegracao}
            createMethod={configService.createUnidadeIntegracao}
            deleteMethod={configService.deleteUnidadeIntegracao}
        />
    );
}
