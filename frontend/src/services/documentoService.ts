import api from '@/lib/api';

export interface Documento {
    id: number;
    titulo: string;
    data: string;
    contratoId: number;
    contratoNome: string;
    empresaId: number;
    empresaNome: string;
    categoriaId: number;
    categoriaNome: string;
    status: string;
    uploaded: boolean;
    versao: string;
    email: string;
    competencia: string;
    funcionarioId?: number;
    funcionarioNome?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}

export const documentoService = {
    getAll: async (page: number = 1, limit: number = 10) => {
        const response = await api.get<PaginatedResponse<Documento>>(`/documentos?page=${page}&limit=${limit}`);
        return response.data;
    },
    updateStatus: async (id: number, status: string, obs?: string) => {
        const response = await api.patch<Documento>(`/documentos/${id}/status`, { status, obs });
        return response.data;
    },
    justificar: async (id: number, obs: string) => {
        const response = await api.patch<Documento>(`/documentos/${id}/justificar`, { obs });
        return response.data;
    },
    delete: async (id: number) => {
        const response = await api.delete(`/documentos/${id}`);
        return response.data;
    },
};
