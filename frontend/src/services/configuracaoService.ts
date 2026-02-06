import api from '@/lib/api';

export interface Configuracao {
    id: number;
    prazoAsoGeral: number;
    prazoIntegracaoGeral: number;
    diasParaConfirmarPresenca: number;
    diasSemanaAgenda: string;
    nomeEmpresa: string;
    logoImage?: string;
    dominioInterno?: string;
}

export const configuracaoService = {
    get: async () => {
        const response = await api.get<Configuracao>('/configuracao');
        return response.data;
    },
    update: async (data: Partial<Configuracao>) => {
        const response = await api.patch<Configuracao>('/configuracao', data);
        return response.data;
    }
};
