'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configService } from '@/services/configService';
import { contratoService } from '@/services/contratoService';
import { Plus, Trash2, FileText, ChevronLeft, ShieldAlert, CheckCircle2, AlertCircle, Globe } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { useNotify } from '@/components/ui/Notification';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

export default function DocumentosFuncionarioConfigPage() {
    const queryClient = useQueryClient();
    const { notify } = useNotify();
    const [selectedContratoId, setSelectedContratoId] = useState<number | ''>('');
    const [newDocName, setNewDocName] = useState('');
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'danger' as 'danger' | 'warning' | 'info'
    });

    const { data: contratos } = useQuery({
        queryKey: ['contratos'],
        queryFn: () => contratoService.getAll(),
    });

    const { data: documentos, isLoading } = useQuery({
        queryKey: ['documentos-exigidos-funcionario'],
        queryFn: () => configService.getDocumentosExigidosFuncionario(),
    });

    const createMutation = useMutation({
        mutationFn: (data: { nome: string; contratoId: number | null }) =>
            configService.createDocumentoExigidoFuncionario(data),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['documentos-exigidos-funcionario'] });
            setNewDocName('');
            notify('success', 'Documento Adicionado', ` "${data.nome}" agora é exigido.`);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => configService.deleteDocumentoExigidoFuncionario(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documentos-exigidos-funcionario'] });
            notify('success', 'Documento Removido', 'A obrigatoriedade do documento foi retirada.');
        },
    });

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDocName.trim()) return;
        createMutation.mutate({
            nome: newDocName,
            contratoId: selectedContratoId === '' ? null : selectedContratoId,
        });
    };

    const requestConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'danger') => {
        setConfirmModal({ isOpen: true, title, message, onConfirm, type });
    };

    if (isLoading) return <div className="p-10 text-center animate-pulse font-bold text-gray-400">Preparando Ambiente...</div>;

    const globalDocs = documentos?.filter((d: any) => !d.contratoId) || [];
    const contractDocs = documentos?.filter((d: any) => d.contratoId) || [];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-4">
                    <Link href="/cadastros" className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400">
                        <ChevronLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center space-x-3">
                            <ShieldAlert className="text-rose-600" size={32} />
                            <span>Documentos Exigidos (Trabalhador)</span>
                        </h1>
                        <p className="text-gray-500 mt-1 font-medium">Configure quais arquivos são obrigatórios para a integração de pessoal.</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Painel de Adição */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                        <div className="flex items-center space-x-2 text-indigo-600 font-bold mb-2">
                            <Plus size={20} />
                            <h2 className="uppercase tracking-widest text-[10px]">Novo Requisito</h2>
                        </div>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-400 mb-1 ml-1">Nome do Documento</label>
                                <input
                                    type="text"
                                    placeholder="Ex: ASO, NR-35, RG..."
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 transition-all font-medium text-sm"
                                    value={newDocName}
                                    onChange={(e) => setNewDocName(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-400 mb-1 ml-1">Abrangência</label>
                                <select
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 transition-all font-medium text-sm"
                                    value={selectedContratoId}
                                    onChange={(e) => setSelectedContratoId(e.target.value === '' ? '' : Number(e.target.value))}
                                >
                                    <option value="">Global (Todos os Trabalhadores)</option>
                                    {contratos?.map(c => (
                                        <option key={c.id} value={c.id}>Contrato: {c.nome}</option>
                                    ))}
                                </select>
                                <p className="mt-2 text-[10px] text-gray-400 italic">Documentos globais são exigidos para todos os colaboradores em qualquer contrato.</p>
                            </div>
                            <button
                                type="submit"
                                disabled={createMutation.isPending}
                                className="w-full py-4 bg-rose-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 disabled:opacity-50"
                            >
                                {createMutation.isPending ? 'Cadastrando...' : 'Adicionar Obrigatoriedade'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Listagem */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Globais */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Globe size={16} className="text-indigo-500" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-gray-600">Requisitos Globais</h3>
                            </div>
                            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full">{globalDocs.length}</span>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {globalDocs.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 text-sm italic">Nenhum documento global configurado.</div>
                            ) : globalDocs.map((doc: any) => (
                                <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-indigo-50 text-indigo-500 flex items-center justify-center rounded-xl">
                                            <FileText size={20} />
                                        </div>
                                        <span className="font-bold text-gray-700">{doc.nome}</span>
                                    </div>
                                    <button
                                        onClick={() => requestConfirm(
                                            'Remover Obrigatoriedade',
                                            `Deseja realmente remover "${doc.nome}" da lista de documentos globais? Todos os colaboradores vinculados deixarão de ser cobrados por este arquivo.`,
                                            () => deleteMutation.mutate(doc.id)
                                        )}
                                        className="p-2 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Especificos por Contrato */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden text-left">
                        <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <FileText size={16} className="text-rose-500" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-gray-600">Requisitos por Contrato</h3>
                            </div>
                            <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-full">{contractDocs.length}</span>
                        </div>
                        <div className="divide-y divide-gray-50 text-left">
                            {contractDocs.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 text-sm italic">Nenhum documento específico por contrato.</div>
                            ) : contractDocs.map((doc: any) => {
                                const contrato = contratos?.find(c => c.id === doc.contratoId);
                                return (
                                    <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
                                        <div className="flex items-center space-x-3 text-left">
                                            <div className="w-10 h-10 bg-rose-50 text-rose-500 flex items-center justify-center rounded-xl">
                                                <AlertCircle size={20} />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-gray-700">{doc.nome}</p>
                                                <p className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">Contrato: {contrato?.nome || 'Desconhecido'}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => requestConfirm(
                                                'Remover Requisito',
                                                `Deseja remover "${doc.nome}" do contrato "${contrato?.nome}"?`,
                                                () => deleteMutation.mutate(doc.id)
                                            )}
                                            className="p-2 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmationModal
                {...confirmModal}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
            />
        </div>
    );
}
