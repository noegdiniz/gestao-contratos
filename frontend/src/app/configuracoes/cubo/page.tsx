'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configService } from '@/services/configService';
import { profileService } from '@/services/profileService';
import api from '@/lib/api';
import { FolderTree, Plus, Info, Trash2, ExternalLink, X, Check, Edit2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { useNotify } from '@/components/ui/Notification';

export default function CuboPage() {
    const queryClient = useQueryClient();
    const { notify } = useNotify();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCubo, setEditingCubo] = useState<any>(null);
    const [formData, setFormData] = useState({
        categoriaIds: [] as number[],
        categoriaNomes: [] as string[],
        perfilIds: [] as number[],
        perfilNomes: [] as string[],
        pastaDriver: ''
    });

    // Pega dados do usuário e permissões
    const { data: userData } = useQuery({
        queryKey: ['me'],
        queryFn: async () => (await api.get('/me')).data
    });

    const perms = userData?.permissions || {};
    const isAdmin = userData?.data?.role === 'admin';

    const canView = isAdmin || perms.canViewRegrasAprovacao;
    const canCreate = isAdmin || perms.canCreateRegrasAprovacao;
    const canEdit = isAdmin || perms.canEditRegrasAprovacao;
    const canDelete = isAdmin || perms.canDeleteRegrasAprovacao;

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'danger' as 'danger' | 'warning' | 'info'
    });

    const { data: cubos, isLoading } = useQuery({
        queryKey: ['cubos'],
        queryFn: () => configService.getCubos(),
        enabled: !!canView
    });

    const { data: categorias } = useQuery({
        queryKey: ['categorias'],
        queryFn: () => configService.getCategorias(),
        enabled: !!canView
    });

    const { data: perfis } = useQuery({
        queryKey: ['profiles'],
        queryFn: () => profileService.getAll(),
        enabled: !!canView
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => configService.createCubo({
            ...data,
            categoriaNomes: data.categoriaNomes.join(', '),
            perfilNomes: data.perfilNomes.join(', ')
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cubos'] });
            notify('success', 'Sucesso', 'Configuração criada com sucesso!');
            handleCloseModal();
        },
        onError: () => {
            notify('error', 'Erro na Criação', 'Não foi possível salvar a nova configuração.');
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number, data: any }) => configService.updateCubo(id, {
            ...data,
            categoriaNomes: data.categoriaNomes.join(', '),
            perfilNomes: data.perfilNomes.join(', ')
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cubos'] });
            notify('success', 'Sucesso', 'Configuração atualizada com sucesso!');
            handleCloseModal();
        },
        onError: () => {
            notify('error', 'Erro na Edição', 'Não foi possível atualizar as alterações.');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => configService.deleteCubo(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cubos'] });
            notify('success', 'Sucesso', 'Configuração excluída com sucesso!');
        },
        onError: () => {
            notify('error', 'Erro na Exclusão', 'Não foi possível remover a configuração.');
        }
    });

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCubo(null);
        setFormData({
            categoriaIds: [],
            categoriaNomes: [],
            perfilIds: [],
            perfilNomes: [],
            pastaDriver: ''
        });
    };

    const handleEdit = (cubo: any) => {
        if (!canEdit) return;
        setEditingCubo(cubo);

        let cIds: number[] = [];
        let pIds: number[] = [];
        try {
            cIds = typeof cubo.categoriaIds === 'string' ? JSON.parse(cubo.categoriaIds) : cubo.categoriaIds;
            pIds = typeof cubo.perfilIds === 'string' ? JSON.parse(cubo.perfilIds) : cubo.perfilIds;
        } catch (e) {
            console.error("Error parsing IDs", e);
        }

        setFormData({
            categoriaIds: cIds || [],
            categoriaNomes: cubo.categoriaNomes?.split(',').map((s: string) => s.trim()) || [],
            perfilIds: pIds || [],
            perfilNomes: cubo.perfilNomes?.split(',').map((s: string) => s.trim()) || [],
            pastaDriver: cubo.pastaDriver
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id: number) => {
        if (!canDelete) return;
        setConfirmModal({
            isOpen: true,
            title: 'Excluir Configuração',
            message: 'Tem certeza que deseja excluir esta regra de aprovação? Esta ação não pode ser desfeita.',
            type: 'danger',
            onConfirm: () => deleteMutation.mutate(id)
        });
    };

    const toggleSelection = (type: 'categoria' | 'perfil', id: number, name: string) => {
        const idKey = `${type}Ids` as 'categoriaIds' | 'perfilIds';
        const nameKey = `${type}Nomes` as 'categoriaNomes' | 'perfilNomes';

        setFormData(prev => {
            const currentIds = prev[idKey];
            const currentNames = prev[nameKey];

            const nextIds = currentIds.includes(id)
                ? currentIds.filter(i => i !== id)
                : [...currentIds, id];

            const nextNames = currentNames.includes(name)
                ? currentNames.filter(n => n !== name)
                : [...currentNames, name];

            return { ...prev, [idKey]: nextIds, [nameKey]: nextNames };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCubo) {
            updateMutation.mutate({ id: editingCubo.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    if (userData && !canView) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center">
                    <X size={40} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Acesso Negado</h2>
                    <p className="text-gray-500 mt-2">Você não tem permissão para visualizar as regras de aprovação.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 text-left">
            <header className="flex justify-between items-center text-left">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 border-none">Configuração de Aprovação</h1>
                    <p className="text-gray-500 mt-1">Conecte Categorias, Perfis de Aprovação e Pastas do Drive.</p>
                </div>
                {canCreate && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                        <Plus size={20} />
                        <span>Nova Configuração</span>
                    </button>
                )}
            </header>

            <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl flex items-start space-x-4 text-left">
                <div className="bg-blue-500 text-white p-2 rounded-xl">
                    <Info size={24} />
                </div>
                <div>
                    <h4 className="font-bold text-blue-900">O que faz essa configuração?</h4>
                    <p className="text-sm text-blue-800/80 mt-1 leading-relaxed">
                        Esta configuração define qual perfil de usuário é responsável por aprovar
                        determinada categoria de documento e em qual pasta do Google Drive o arquivo final deve ser armazenado.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 text-left">
                {isLoading ? (
                    <div className="h-48 bg-white rounded-3xl animate-pulse border border-gray-100"></div>
                ) : cubos?.map((cubo: any) => (
                    <div key={cubo.id} className="bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all group relative">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-50 text-left">
                                <div className="flex items-center space-x-3 text-left">
                                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                                        <FolderTree size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Regra #{cubo.id}</h3>
                                        <p className="text-sm text-gray-400">Criado em {new Date(cubo.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-all">
                                    {canEdit && (
                                        <button
                                            onClick={() => handleEdit(cubo)}
                                            className="text-gray-400 hover:text-indigo-600 p-2 rounded-xl hover:bg-indigo-50 transition-all"
                                            title="Editar Regra"
                                        >
                                            <Edit2 size={24} />
                                        </button>
                                    )}
                                    {canDelete && (
                                        <button
                                            onClick={() => handleDelete(cubo.id)}
                                            className="text-gray-400 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 transition-all"
                                            title="Excluir Regra"
                                        >
                                            <Trash2 size={24} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 text-left">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Categorias Vinculadas</label>
                                    <div className="flex flex-wrap gap-2 text-left">
                                        {cubo.categoriaNomes?.split(',').map((name: string) => (
                                            <span key={name} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200">
                                                {name.trim()}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3 text-left">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Aprovadores (Perfis)</label>
                                    <div className="flex flex-wrap gap-2 text-left">
                                        {cubo.perfilNomes?.split(',').map((name: string) => (
                                            <span key={name} className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-indigo-100">
                                                {name.trim()}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3 text-left">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Destino (Google Drive)</label>
                                    <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-4 py-3 rounded-2xl border border-emerald-100 text-left">
                                        <span className="text-sm font-bold truncate flex-1">{cubo.pastaDriver}</span>
                                        <ExternalLink size={16} className="shrink-0" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 text-left">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">{editingCubo ? 'Editar Regra de Aprovação' : 'Nova Regra de Cubo'}</h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 outline-none"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
                            <div className="space-y-4">
                                <label className="block text-sm font-bold text-gray-700">Categorias Vinculadas</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-left">
                                    {categorias?.map((cat: any) => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => toggleSelection('categoria', cat.id, cat.nome)}
                                            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all border ${formData.categoriaIds.includes(cat.id)
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200'
                                                : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'
                                                }`}
                                        >
                                            <span className="truncate mr-2">{cat.nome}</span>
                                            {formData.categoriaIds.includes(cat.id) && <Check size={14} />}
                                        </button>
                                    ))}
                                    {categorias?.length === 0 && <p className="col-span-full text-center text-xs text-gray-400 py-4 italic">Nenhuma categoria cadastrada.</p>}
                                </div>
                            </div>

                            <div className="space-y-4 text-left">
                                <label className="block text-sm font-bold text-gray-700">Perfis Aprovadores</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-left">
                                    {perfis?.map((perfil: any) => (
                                        <button
                                            key={perfil.id}
                                            type="button"
                                            onClick={() => toggleSelection('perfil', perfil.id, perfil.name)}
                                            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all border ${formData.perfilIds.includes(perfil.id)
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200'
                                                : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'
                                                }`}
                                        >
                                            <span className="truncate mr-2">{perfil.name}</span>
                                            {formData.perfilIds.includes(perfil.id) && <Check size={14} />}
                                        </button>
                                    ))}
                                    {perfis?.length === 0 && <p className="col-span-full text-center text-xs text-gray-400 py-4 italic">Nenhum perfil cadastrado.</p>}
                                </div>
                            </div>

                            <div className="text-left">
                                <label className="block text-sm font-bold text-gray-700 mb-2">ID da Pasta no Google Drive</label>
                                <input
                                    type="text" required value={formData.pastaDriver}
                                    onChange={e => setFormData({ ...formData, pastaDriver: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm"
                                    placeholder="Ex: 1AxY2B... (Copie do link da pasta)"
                                />
                            </div>
                        </form>

                        <div className="p-6 border-t border-gray-100 flex justify-end space-x-3 bg-white">
                            <button type="button" onClick={handleCloseModal} className="px-6 py-2.5 font-bold text-gray-400 hover:text-gray-600 transition-all">Cancelar</button>
                            <button
                                onClick={handleSubmit}
                                disabled={formData.categoriaIds.length === 0 || formData.perfilIds.length === 0 || !formData.pastaDriver || createMutation.isPending || updateMutation.isPending}
                                className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {editingCubo ? 'Salvar Alterações' : 'Criar Regra'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal
                {...confirmModal}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
            />
        </div>
    );
}
