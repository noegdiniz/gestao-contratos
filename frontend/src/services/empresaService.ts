import api from '@/lib/api';

export interface Empresa {
    id: number;
    nome: string;
    loginName: string;
    cnpj: string;
    departamento: string;
    chave: string;
    status: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}

export const empresaService = {
    getAll: async (page: number = 1, limit: number = 10) => {
        const response = await api.get<PaginatedResponse<Empresa>>(`/empresas?page=${page}&limit=${limit}`);
        return response.data;
    },
    create: async (data: Omit<Empresa, 'id'>) => {
        const response = await api.post<Empresa>('/empresas', data);
        return response.data;
    },
    update: async (id: number, data: Partial<Empresa>) => {
        const response = await api.put<Empresa>(`/empresas/${id}`, data);
        return response.data;
    },
    delete: async (id: number) => {
        const response = await api.delete(`/empresas/${id}`);
        return response.data;
    },
};
