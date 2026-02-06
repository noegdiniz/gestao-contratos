
'use client';

import { useQuery } from '@tanstack/react-query';
import { funcionarioService } from '@/services/funcionarioService';
import {
    Users,
    FileWarning,
    CalendarCheck,
    TrendingUp,
    CheckCircle2,
    Clock,
    AlertTriangle,
    LayoutGrid,
    XCircle,
    FileText,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { documentoService } from '@/services/documentoService';
import Link from 'next/link';
import api from '@/lib/api';
import { useState } from 'react';

export default function PortalPrestadoraPage() {
    const { data: employeesData } = useQuery({
        queryKey: ['funcionarios-portal'],
        queryFn: () => funcionarioService.getAll(1, 9999),
    });

    const { data: documentsData } = useQuery({
        queryKey: ['documentos-portal'],
        queryFn: () => documentoService.getAll(1, 9999),
    });

    const { data: workerDocsData } = useQuery({
        queryKey: ['anexos-todos-portal'],
        queryFn: () => funcionarioService.getAllAnexos(1, 9999),
    });

    const { data: userData } = useQuery({
        queryKey: ['me'],
        queryFn: async () => (await api.get('/me')).data,
    });

    // Extract arrays from paginated responses
    const employees = employeesData?.data || [];
    const documents = documentsData?.data || [];
    const workerDocs = workerDocsData?.data || [];

    const stats = [
        {
            name: 'Total Colaboradores',
            value: employees?.length || 0,
            icon: Users,
            color: 'text-blue-600',
            bg: 'bg-blue-50'
        },
        {
            name: 'Atenção Necessária',
            value: employees?.filter((e: any) => ['PENDENTE', 'FALTOU', 'VENCIDO', 'AGUARDANDO_APROVACAO'].includes(e.statusIntegracao)).length || 0,
            icon: Clock,
            color: 'text-amber-600',
            bg: 'bg-amber-50'
        },
        {
            name: 'Documentos Rejeitados',
            value: (documents?.filter((d: any) => d.status === 'NAO_APROVADO' || d.status === 'REPROVADO').length || 0) +
                (workerDocs?.filter((d: any) => d.status === 'REPROVADO' || d.status === 'NAO_APROVADO').length || 0),
            icon: XCircle,
            color: 'text-red-600',
            bg: 'bg-red-50'
        },
        {
            name: 'Aguardando Validação',
            value: (documents?.filter((d: any) => d.status === 'AGUARDANDO').length || 0) +
                (workerDocs?.filter((d: any) => d.status === 'AGUARDANDO').length || 0),
            icon: FileText,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50'
        },
    ];

    const pendingWorkers = employees?.filter((e: any) => ['PENDENTE', 'FALTOU', 'VENCIDO'].includes(e.statusIntegracao)) || [];
    const rejectedDocs = documents?.filter((d: any) => d.status === 'NAO_APROVADO' || d.status === 'REPROVADO') || [];
    const rejectedWorkerDocs = workerDocs?.filter((d: any) => d.status === 'REPROVADO' || d.status === 'NAO_APROVADO') || [];

    const attentionItems = [
        ...pendingWorkers.map((w: any) => ({
            id: `worker-${w.id}`,
            title: w.nome,
            subtitle: w.statusIntegracao === 'FALTOU' ? 'Não Compareceu / Faltou' :
                w.statusIntegracao === 'VENCIDO' ? 'Integração Vencida / Renovar' :
                    'Integração Pendente / Cadastro Incompleto',
            icon: Users,
            iconColor: w.statusIntegracao === 'FALTOU' ? 'text-gray-600' :
                w.statusIntegracao === 'VENCIDO' ? 'text-red-600' : 'text-indigo-600',
            iconBg: w.statusIntegracao === 'FALTOU' ? 'bg-gray-100' :
                w.statusIntegracao === 'VENCIDO' ? 'bg-red-50' : 'bg-indigo-50',
            href: '/funcionarios',
            actionText: w.statusIntegracao === 'VENCIDO' ? 'Renovar' : 'Corrigir'
        })),
        ...rejectedDocs.map((d: any) => ({
            id: `doc-${d.id}`,
            title: d.titulo,
            subtitle: `Documento Rejeitado: ${d.funcionarioNome || d.contratoNome}`,
            icon: FileText,
            iconColor: 'text-red-600',
            iconBg: 'bg-red-50',
            href: d.funcionarioId ? `/documentos?funcionarioId=${d.funcionarioId}&funcionarioNome=${d.funcionarioNome}` : '/documentos?openAcessoria=true',
            actionText: 'Corrigir'
        })),
        ...rejectedWorkerDocs.map((d: any) => ({
            id: `wdoc-${d.id}`,
            title: d.tipo,
            subtitle: `Documento Reprovado: ${d.funcionarioNome}`,
            icon: FileText,
            iconColor: 'text-red-600',
            iconBg: 'bg-red-50',
            href: `/funcionarios?openDocs=${d.funcionarioId}`,
            actionText: 'Corrigir'
        }))
    ];

    // Pagination for attention items
    const [attentionPage, setAttentionPage] = useState(1);
    const attentionLimit = 5;
    const attentionTotalPages = Math.ceil(attentionItems.length / attentionLimit);
    const paginatedAttentionItems = attentionItems.slice((attentionPage - 1) * attentionLimit, attentionPage * attentionLimit);

    return (
        <div className="space-y-10">
            <header>
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight border-none">
                    Portal da Prestadora {userData?.data?.nome ? `- ${userData.data.nome}` : ''}
                </h1>
                <p className="text-gray-500 mt-2 text-lg">Gerencie documentos e integrações de seus colaboradores.</p>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <div key={stat.name} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`${stat.bg} ${stat.color} p-3 rounded-2xl`}>
                                <stat.icon size={24} />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-gray-900 mb-1">{stat.value}</div>
                        <div className="text-sm font-medium text-gray-400 uppercase tracking-wider">{stat.name}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Attention Needed */}
                <div className="space-y-6 text-left">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <AlertTriangle className="mr-2 text-amber-500" size={20} />
                        Atenção Necessária
                    </h2>
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="divide-y divide-gray-50">
                            {paginatedAttentionItems.map((item) => (
                                <div key={item.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center space-x-4">
                                        <div className={`w-10 h-10 ${item.iconBg} ${item.iconColor} rounded-xl flex items-center justify-center font-bold`}>
                                            <item.icon size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 leading-tight">{item.title}</p>
                                            <p className="text-xs text-gray-400 uppercase font-black tracking-widest mt-0.5">{item.subtitle}</p>
                                        </div>
                                    </div>
                                    <Link
                                        href={item.href}
                                        className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-sm"
                                    >
                                        {item.actionText}
                                    </Link>
                                </div>
                            ))}
                            {attentionItems.length === 0 && (
                                <div className="p-10 text-center text-gray-400">
                                    <CheckCircle2 className="mx-auto mb-2 text-emerald-500" size={32} />
                                    <p className="font-medium">Tudo em dia por aqui!</p>
                                </div>
                            )}
                        </div>
                        {attentionTotalPages > 1 && (
                            <div className="flex items-center justify-between px-5 py-3 bg-gray-50/50 border-t border-gray-100">
                                <span className="text-xs text-gray-500">
                                    {(attentionPage - 1) * attentionLimit + 1}-{Math.min(attentionPage * attentionLimit, attentionItems.length)} de {attentionItems.length}
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setAttentionPage(p => Math.max(1, p - 1))}
                                        disabled={attentionPage === 1}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="text-xs font-bold text-gray-600 px-2">
                                        {attentionPage} / {attentionTotalPages}
                                    </span>
                                    <button
                                        onClick={() => setAttentionPage(p => Math.min(attentionTotalPages, p + 1))}
                                        disabled={attentionPage === attentionTotalPages}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Shortcuts */}
                <div className="space-y-6 text-left">
                    <h2 className="text-xl font-bold text-gray-800">Ações Rápidas</h2>
                    <div className="grid grid-cols-1 gap-4">
                        <Link href="/funcionarios" className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all flex items-center space-x-6 group">
                            <div className="bg-indigo-50 text-indigo-600 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                                <Users size={32} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Cadastrar Colaboradores</h3>
                                <p className="text-sm text-gray-400">Adicione novos funcionários para integração.</p>
                            </div>
                        </Link>

                        <Link href="/documentos?openAcessoria=true" className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all flex items-center space-x-6 group">
                            <div className="bg-amber-50 text-amber-600 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                                <LayoutGrid size={32} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Documentação Acessória</h3>
                                <p className="text-sm text-gray-400">Envie documentos da empresa e do contrato.</p>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
