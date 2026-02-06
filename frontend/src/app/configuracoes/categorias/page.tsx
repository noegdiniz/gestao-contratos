'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configService } from '@/services/configService';
import { Tags, Plus, Search, FileJson, Trash2, X, Edit2 } from 'lucide-react';
import { useState, KeyboardEvent } from 'react';
import { useNotify } from '@/components/ui/Notification';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { PermissionGuard } from '@/components/ui/PermissionGuard';

export default function CategoriasPage() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [formData, setFormData] = useState({ nome: '', tipoProcessoId: null as number | null, tipoProcessoNome: '', documentosPedidos: '' });
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'danger' as 'danger' | 'warning' | 'info'
    });

    const { notify } = useNotify();

    const requestConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'danger') => {
        setConfirmModal({ isOpen: true, title, message, onConfirm, type });
    };

    const { data: categories, isLoading } = useQuery({
        queryKey: ['categorias'],
        queryFn: () => configService.getCategorias(),
    });

    const { data: processos } = useQuery({
        queryKey: ['processos'],
        queryFn: () => configService.getTiposProcesso(),
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => configService.createCategoria(data),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['categorias'] });
            handleCloseModal();
            notify('success', 'Categoria Criada', `A categoria "${data.nome}" foi cadastrada.`);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => configService.updateCategoria(id, data),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['categorias'] });
            handleCloseModal();
            notify('success', 'Categoria Atualizada', `A categoria "${data.nome}" foi atualizada.`);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => configService.deleteCategoria(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categorias'] });
            notify('success', 'Categoria Excluída', 'A categoria foi removida com sucesso.');
        },
    });

    const handleOpenEdit = (cat: any) => {
        setEditingCategory(cat);
        setFormData({
            nome: cat.nome,
            tipoProcessoId: cat.tipoProcessoId,
            tipoProcessoNome: cat.tipoProcessoNome,
            documentosPedidos: cat.documentosPedidos
        });
        const currentTags = (cat.documentosPedidos?.includes('|') ? cat.documentosPedidos.split('|') : cat.documentosPedidos?.split(',') || []);
        setTags(currentTags.filter((t: string) => t.trim() !== ''));
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
        setFormData({ nome: '', tipoProcessoId: null, tipoProcessoNome: '', documentosPedidos: '' });
        setTags([]);
        setTagInput('');
    };

    const handleAddTag = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const value = tagInput.trim();
            if (value && !tags.includes(value)) {
                const newTags = [...tags, value];
                setTags(newTags);
                setFormData({ ...formData, documentosPedidos: newTags.join('|') });
                setTagInput('');
            }
        }
    };

    const removeTag = (tagToRemove: string) => {
        const newTags = tags.filter(tag => tag !== tagToRemove);
        setTags(newTags);
        setFormData({ ...formData, documentosPedidos: newTags.join('|') });
    };

    const handleDelete = (id: number) => {
        requestConfirm(
            'Excluir Categoria',
            'Ao excluir esta categoria, novos contratos não poderão ser vinculados a ela. Documentos exigidos vinculados a esta categoria também serão afetados. Deseja continuar?',
            () => deleteMutation.mutate(id),
            'danger'
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const action = editingCategory ? 'atualizar' : 'criar';
        const title = editingCategory ? 'Atualizar Categoria' : 'Criar Categoria';
        const message = editingCategory
            ? `Deseja salvar as alterações na categoria "${formData.nome}"?`
            : `Confirmar a criação da nova categoria "${formData.nome}"?`;

        requestConfirm(
            title,
            message,
            () => {
                if (editingCategory) {
                    updateMutation.mutate({ id: editingCategory.id, data: formData });
                } else {
                    createMutation.mutate(formData);
                }
            },
            'info'
        );
    };

    return (
        <div className="space-y-8 text-left">
            <header className="flex justify-between items-center text-left">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 border-none">Categorias de Documentos</h1>
                    <p className="text-gray-500 mt-1">Defina os tipos de documentos necessários para cada categoria.</p>
                </div>
                <PermissionGuard permission="canCreateCategorias">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                        <Plus size={20} />
                        <span>Nova Categoria</span>
                    </button>
                </PermissionGuard>
            </header>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden text-left">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase font-bold text-gray-400">
                        <tr className="text-left">
                            <th className="px-6 py-4">Nome da Categoria</th>
                            <th className="px-6 py-4">Tipo de Processo</th>
                            <th className="px-6 py-4">Documentos Exigidos</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {isLoading ? (
                            <tr><td colSpan={4} className="p-10 text-center animate-pulse">Carregando...</td></tr>
                        ) : categories?.map((cat: any) => (
                            <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-3 text-left">
                                        <Tags size={18} className="text-indigo-500" />
                                        <span className="font-bold text-gray-900">{cat.nome}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-left">
                                    <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-1 rounded-md">
                                        {cat.tipoProcessoNome}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-left">
                                    <div className="flex items-center space-x-2 overflow-x-auto max-w-md no-scrollbar">
                                        {(cat.documentosPedidos?.includes('|') ? cat.documentosPedidos.split('|') : cat.documentosPedidos?.split(',') || []).map((doc: string, idx: number) => (
                                            doc.trim() && (
                                                <span key={idx} className="whitespace-nowrap bg-gray-100 text-gray-600 text-[10px] px-2 py-1 rounded-md border border-gray-200">
                                                    {doc.trim()}
                                                </span>
                                            )
                                        ))}
                                        {(!cat.documentosPedidos) && (
                                            <span className="text-xs text-gray-400">Nenhum documento</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity space-x-2">
                                        <PermissionGuard permission="canEditCategorias">
                                            <button
                                                onClick={() => handleOpenEdit(cat)}
                                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                        </PermissionGuard>
                                        <PermissionGuard permission="canDeleteCategorias">
                                            <button
                                                onClick={() => handleDelete(cat.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </PermissionGuard>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nome da Categoria</label>
                                <input
                                    type="text" required value={formData.nome}
                                    onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="Ex: Auditoria Mensal"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Processo</label>
                                <select
                                    required value={formData.tipoProcessoNome}
                                    onChange={e => {
                                        const proc = processos?.find((p: any) => p.nome === e.target.value);
                                        setFormData({
                                            ...formData,
                                            tipoProcessoNome: e.target.value,
                                            tipoProcessoId: proc?.id
                                        });
                                    }}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">Selecione um processo...</option>
                                    {processos?.map((proc: any) => (
                                        <option key={proc.id} value={proc.nome}>{proc.nome}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Documento</label>
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={handleAddTag}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        placeholder="Digite o nome e aperte Enter"
                                    />

                                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 min-h-[120px] max-h-[200px] overflow-y-auto space-y-2 flex flex-wrap gap-2 content-start">
                                        {tags.length === 0 && (
                                            <p className="text-gray-400 text-sm italic w-full text-center mt-8">Nenhum documento adicionado...</p>
                                        )}
                                        {tags.map((tag, index) => (
                                            <div key={index} className="flex items-center space-x-1 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm animate-in fade-in zoom-in duration-200">
                                                <span>{tag}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeTag(tag)}
                                                    className="hover:text-indigo-200 transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-50">
                                <button type="button" onClick={handleCloseModal} className="px-6 py-2.5 font-bold text-gray-400 hover:text-gray-600 transition-all">Cancelar</button>
                                <button
                                    type="submit"
                                    disabled={tags.length === 0 || !formData.nome || !formData.tipoProcessoNome}
                                    className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {editingCategory ? 'Salvar Alterações' : 'Criar Categoria'}
                                </button>
                            </div>
                        </form>
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
