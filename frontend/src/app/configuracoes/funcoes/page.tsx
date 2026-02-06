
'use client';

import SimpleCatalogPage from '@/components/SimpleCatalogPage';
import { configService } from '@/services/configService';

export default function FuncoesPage() {
    return (
        <SimpleCatalogPage
            title="Funções"
            description="Gerencie as funções disponíveis para os colaboradores."
            queryKey="funcoes"
            fetchMethod={configService.getFuncoes}
            createMethod={configService.createFuncao}
            deleteMethod={configService.deleteFuncao}
        />
    );
}
