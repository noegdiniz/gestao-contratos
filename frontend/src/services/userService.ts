import api from '@/lib/api';

export interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    isIntegrationApprover?: boolean;
}

export const userService = {
    getAll: async () => {
        const response = await api.get<User[]>('/users');
        return response.data;
    },
    create: async (data: any) => {
        const response = await api.post('/users', data);
        return response.data;
    },
    update: async (id: number, data: any) => {
        const response = await api.put(`/users/${id}`, data);
        return response.data;
    },
    delete: async (id: number) => {
        const response = await api.delete(`/users/${id}`);
        return response.data;
    },
    toggleApprover: async (id: number) => {
        const response = await api.patch(`/users/${id}/toggle-approver`);
        return response.data;
    }
};
