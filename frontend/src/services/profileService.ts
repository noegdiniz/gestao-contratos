import api from '@/lib/api';

export interface Profile {
    id: number;
    name: string;
    description: string;
    [key: string]: any;
}

export const profileService = {
    getAll: async () => {
        const response = await api.get<Profile[]>('/profiles');
        return response.data;
    },
    create: async (data: any) => {
        const response = await api.post<Profile>('/profiles', data);
        return response.data;
    },
    update: async (id: number, data: any) => {
        const response = await api.put<Profile>(`/profiles/${id}`, data);
        return response.data;
    },
    delete: async (id: number) => {
        const response = await api.delete(`/profiles/${id}`);
        return response.data;
    }
};
