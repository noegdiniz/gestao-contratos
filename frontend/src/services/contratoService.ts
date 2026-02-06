import api from '@/lib/api';

export interface Contrato {
    id: number;
    nome: string;
    empresaId: number;
    empresaNome: string;
    dtInicio: string;
    dtFim: string;
    categoriaId?: number;
    categoriaNome?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}

export const contratoService = {
    getAll: async (page: number = 1, limit: number = 10) => {
        const response = await api.get<PaginatedResponse<Contrato>>(`/contratos?page=${page}&limit=${limit}`);
        return response.data;
    },
    create: async (data: Omit<Contrato, 'id'>) => {
        const response = await api.post<Contrato>('/contratos', data);
        return response.data;
    },
    update: async (id: number, data: Partial<Contrato>) => {
        const response = await api.put<Contrato>(`/contratos/${id}`, data);
        return response.data;
    },
    delete: async (id: number) => {
        const response = await api.delete(`/contratos/${id}`);
        return response.data;
    },
    getDocumentosExigidos: async (id: number) => {
        const response = await api.get<string[]>(`/contratos/${id}/documentos-exigidos`);
        return response.data;
    },
};
