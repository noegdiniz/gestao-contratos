'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { History, User, Globe, FileEdit, LogIn, ChevronRight } from 'lucide-react';

const iconMap = {
    'LOGIN': LogIn,
    'UPDATE': FileEdit,
    'CREATE': Globe,
    'VIEW': History
};

export default function LogsPage() {
    const { data: logs, isLoading } = useQuery({
        queryKey: ['logs'],
        queryFn: async () => {
            const response = await api.get('/logs');
            return response.data;
        },
    });

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-gray-900 border-none">Logs de Atividade</h1>
                <p className="text-gray-500 mt-1">Auditoria completa de todas as ações realizadas no sistema.</p>
            </header>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-50">
                    {isLoading ? (
                        Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="p-6 animate-pulse flex space-x-4">
                                <div className="w-10 h-10 bg-gray-50 rounded-xl"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-50 rounded w-3/4"></div>
                                    <div className="h-3 bg-gray-50 rounded w-1/4"></div>
                                </div>
                            </div>
                        ))
                    ) : logs?.map((log: any) => {
                        const Icon = (iconMap as any)[log.action] || History;
                        return (
                            <div key={log.id} className="p-6 flex items-start space-x-4 hover:bg-gray-50/50 transition-colors">
                                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                                    <Icon size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">{log.menu}</span>
                                        <span className="text-xs text-gray-400 font-medium">{new Date(log.date).toLocaleString()}</span>
                                    </div>
                                    <p className="text-gray-900 font-medium">
                                        <span className="font-black">{log.userName}</span> {log.info}
                                    </p>
                                    <div className="mt-2 flex items-center text-[10px] text-gray-400 space-x-2">
                                        <div className="flex items-center">
                                            <User size={10} className="mr-1" />
                                            {log.userPerfil}
                                        </div>
                                        <span>•</span>
                                        <div className="flex items-center uppercase font-bold tracking-tighter">
                                            Action ID: {log.id}
                                        </div>
                                    </div>
                                </div>
                                <button className="p-2 text-gray-300 hover:text-indigo-600 transition-colors">
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        );
                    })}

                    {logs?.length === 0 && (
                        <div className="py-20 text-center">
                            <History size={48} className="mx-auto text-gray-100 mb-4" />
                            <p className="text-gray-400 font-medium">Nenhum log registrado ainda.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
