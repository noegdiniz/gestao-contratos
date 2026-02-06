import api from '@/lib/api';

export interface Funcionario {
    id: number;
    nome: string;
    empresaId?: number;
    contratoId?: number;
    statusIntegracao?: string;
    dataIntegracao?: string;
    integracaoAprovadaManualmente?: boolean;
    contratoNome?: string;
    empresaNome?: string;
    createdAt: string;

    // Novos campos
    statusContratual?: 'ATIVO' | 'VENCIDO' | 'ENCERRADO';
    statusIntegracaoCalculado?: 'VALIDO' | 'A_VENCER' | 'VENCIDO' | 'NAO_INTEGRADO';
    dataValidadeIntegracao?: string;
    funcaoNome?: string;
    cargoNome?: string;
    setorNome?: string;
    unidadeIntegracaoNome?: string;
    dataValidadeASO?: string;
    dataAso?: string;
    statusDocumentacao?: string;
}

export interface DocumentoExigidoFuncionario {
    id: number;
    nome: string;
}

export interface AnexoFuncionario {
    id: number;
    filename: string;
    funcionarioId: number;
    tipo: string;
    status: string;
    observacao?: string;
    uploadDate: string;
}

export const funcionarioService = {
    // Modificado para suportar paginação
    getAll: async (page = 1, limit = 10, empresaId?: number, contratoId?: number) => {
        const response = await api.get<{ data: Funcionario[], total: number, page: number, pages: number }>('/funcionarios', {
            params: { page, limit, empresa_id: empresaId, contrato_id: contratoId }
        });
        return response.data;
    },
    create: async (data: any) => {
        const response = await api.post<Funcionario>('/funcionarios', data);
        return response.data;
    },
    update: async (id: number, data: any) => {
        const response = await api.put<Funcionario>(`/funcionarios/${id}`, data);
        return response.data;
    },
    delete: async (id: number) => {
        const response = await api.delete(`/funcionarios/${id}`);
        return response.data;
    },
    // Documentos Exigidos
    getExigidos: async (contratoId?: number) => {
        const response = await api.get<DocumentoExigidoFuncionario[]>('/documentos-exigidos-funcionario', {
            params: { contratoId }
        });
        return response.data;
    },
    createExigido: async (nome: string, contratoId?: number) => {
        const response = await api.post<DocumentoExigidoFuncionario>('/documentos-exigidos-funcionario', null, {
            params: { nome, contratoId }
        });
        return response.data;
    },
    deleteExigido: async (id: number) => {
        const response = await api.delete(`/documentos-exigidos-funcionario/${id}`);
        return response.data;
    },
    // Anexos do Funcionário
    getAllAnexos: async (page = 1, limit = 10) => {
        const response = await api.get<{ data: AnexoFuncionario[], total: number, page: number, pages: number }>('/funcionarios/documentos-todos', {
            params: { page, limit }
        });
        return response.data;
    },
    getAnexos: async (func_id: number) => {
        const response = await api.get<AnexoFuncionario[]>(`/funcionarios/${func_id}/documentos`);
        return response.data;
    },
    uploadAnexo: async (funcId: number, tipo: string, file: File, obs?: string) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tipo', tipo);
        if (obs) formData.append('obs', obs);
        const response = await api.post<AnexoFuncionario>(`/funcionarios/${funcId}/documentos`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
    justificarAnexo: async (anexoId: number, obs: string) => {
        const response = await api.patch<AnexoFuncionario>(`/funcionarios/documentos/${anexoId}/justificar`, { obs });
        return response.data;
    },
    updateAnexoStatus: async (anexoId: number, status: string, observacao?: string) => {
        const response = await api.patch<AnexoFuncionario>(`/funcionarios/documentos/${anexoId}/status`, { status, observacao });
        return response.data;
    },
    getStatusDocumental: async (funcId: number) => {
        const response = await api.get<{ is_ready: boolean, pendentes: string[], reprovados: string[] }>(`/funcionarios/${funcId}/status-documental`);
        return response.data;
    },
    agendarIntegracao: async (params: {
        funcionarioIds: number[],
        data: string,
        contratoId: number,
        funcaoId: number,
        funcaoNome: string,
        cargoId: number,
        cargoNome: string,
        setorId: number,
        setorNome: string,
        unidadeIntegracaoId: number,
        unidadeIntegracao: string,
        unidadeAtividadeId: number,
        unidadeAtividade: string,
        dataAso?: string,
        prazoAsoDias?: number,
        prazoIntegracaoDias?: number,
        justificativaAgendamento?: string
    }) => {
        const response = await api.post('/funcionarios/agendar-integracao', params);
        return response.data;
    },
    aprovar: async (funcId: number) => {
        const response = await api.post<Funcionario>(`/funcionarios/${funcId}/aprovar`);
        return response.data;
    },
    confirmarPresenca: async (funcId: number, params?: {
        dataAso?: string;
        prazoAsoDias?: number;
        prazoIntegracaoDias?: number;
    }) => {
        const response = await api.post(`/funcionarios/${funcId}/confirmar-presenca`, params);
        return response.data;
    },
    getHistoricoIntegracao: async (funcId: number) => {
        const response = await api.get(`/funcionarios/${funcId}/historico-integracao`);
        return response.data;
    },
    async getAnexoAprovacoes(anexoId: number) {
        const response = await api.get<any[]>(`/funcionarios/documentos/${anexoId}/aprovacoes`);
        return response.data;
    },
    getHistoricoPdf: async (funcId: number) => {
        const response = await api.get(`/funcionarios/${funcId}/historico-pdf`, {
            responseType: 'blob'
        });
        return response.data;
    }
};
