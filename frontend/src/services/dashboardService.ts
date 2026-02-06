import api from '@/lib/api';

export interface DashboardStats {
    empresasAtivas: number;
    docsPendentes: number;
    totalFuncionarios: number;
    aprovadosMes: number;
    vencidos: number;
}

export interface Activity {
    id: number;
    menu: string;
    userName: string;
    userPerfil: string;
    action: string;
    info: string;
    date: string;
}

export const dashboardService = {
    getStats: async () => {
        const response = await api.get<DashboardStats>('/dashboard/stats');
        return response.data;
    },
    getActivities: async () => {
        const response = await api.get<Activity[]>('/dashboard/activities');
        return response.data;
    }
};
