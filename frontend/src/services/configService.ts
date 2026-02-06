import api from '@/lib/api';

export const configService = {
    // Process Types
    getTiposProcesso: async () => {
        const response = await api.get<any[]>('/tipos-processo');
        return response.data;
    },
    createTipoProcesso: async (data: any) => {
        const response = await api.post('/tipos-processo', data);
        return response.data;
    },
    deleteTipoProcesso: async (id: number) => {
        const response = await api.delete(`/tipos-processo/${id}`);
        return response.data;
    },

    // Categories
    getCategorias: async () => {
        const response = await api.get<any[]>('/categorias');
        return response.data;
    },
    createCategoria: async (data: any) => {
        const response = await api.post('/categorias', data);
        return response.data;
    },
    updateCategoria: async (id: number, data: any) => {
        const response = await api.put(`/categorias/${id}`, data);
        return response.data;
    },
    deleteCategoria: async (id: number) => {
        const response = await api.delete(`/categorias/${id}`);
        return response.data;
    },

    // Cubos
    getCubos: async () => {
        const response = await api.get<any[]>('/cubos');
        return response.data;
    },
    createCubo: async (data: any) => {
        const response = await api.post('/cubos', data);
        return response.data;
    },
    updateCubo: async (id: number, data: any) => {
        const response = await api.put(`/cubos/${id}`, data);
        return response.data;
    },
    deleteCubo: async (id: number) => {
        const response = await api.delete(`/cubos/${id}`);
        return response.data;
    },

    // Funcoes
    getFuncoes: async () => {
        const response = await api.get<any[]>('/funcoes');
        return response.data;
    },
    createFuncao: async (data: any) => {
        const response = await api.post('/funcoes', data);
        return response.data;
    },
    deleteFuncao: async (id: number) => {
        const response = await api.delete(`/funcoes/${id}`);
        return response.data;
    },

    // Cargos
    getCargos: async () => {
        const response = await api.get<any[]>('/cargos');
        return response.data;
    },
    createCargo: async (data: any) => {
        const response = await api.post('/cargos', data);
        return response.data;
    },
    deleteCargo: async (id: number) => {
        const response = await api.delete(`/cargos/${id}`);
        return response.data;
    },

    // Setores
    getSetores: async () => {
        const response = await api.get<any[]>('/setores');
        return response.data;
    },
    createSetor: async (data: any) => {
        const response = await api.post('/setores', data);
        return response.data;
    },
    deleteSetor: async (id: number) => {
        const response = await api.delete(`/setores/${id}`);
        return response.data;
    },

    // Unidades Integracao
    getUnidadesIntegracao: async () => {
        const response = await api.get<any[]>('/unidades-integracao');
        return response.data;
    },
    createUnidadeIntegracao: async (data: any) => {
        const response = await api.post('/unidades-integracao', data);
        return response.data;
    },
    deleteUnidadeIntegracao: async (id: number) => {
        const response = await api.delete(`/unidades-integracao/${id}`);
        return response.data;
    },

    // Documentos Exigidos Funcionario
    getDocumentosExigidosFuncionario: async () => {
        const response = await api.get<any[]>('/documentos-exigidos-funcionario');
        return response.data;
    },
    createDocumentoExigidoFuncionario: async (data: any) => {
        const response = await api.post('/documentos-exigidos-funcionario', data);
        return response.data;
    },
    deleteDocumentoExigidoFuncionario: async (id: number) => {
        const response = await api.delete(`/documentos-exigidos-funcionario/${id}`);
        return response.data;
    }
};
