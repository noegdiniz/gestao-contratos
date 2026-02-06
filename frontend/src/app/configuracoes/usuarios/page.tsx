'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService, User } from '@/services/userService';
import { profileService } from '@/services/profileService';
import { Users, Plus, Search, Mail, Shield, Trash2, X, Edit2 } from 'lucide-react';
import { useState } from 'react';
import { useNotify } from '@/components/ui/Notification';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { PermissionGuard } from '@/components/ui/PermissionGuard';

export default function UsuariosPage() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({ name: '', email: '', role: 'user' });
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

    const { data: users, isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: () => userService.getAll(),
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => userService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            handleCloseModal();
            notify('success', 'Usuário Criado', 'O novo usuário foi cadastrado com sucesso.');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => userService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            handleCloseModal();
            notify('success', 'Usuário Atualizado', 'Os dados do usuário foram atualizados.');
        },
    });

    const toggleApproverMutation = useMutation({
        mutationFn: (id: number) => userService.toggleApprover(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            notify('success', 'Permissão Alterada', 'O status de aprovador foi atualizado.');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => userService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            notify('success', 'Usuário Excluído', 'O usuário foi removido do sistema.');
        },
    });

    const handleOpenModal = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setFormData({ name: user.name, email: user.email, role: user.role });
        } else {
            setEditingUser(null);
            setFormData({ name: '', email: '', role: 'user' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const title = editingUser ? 'Atualizar Usuário' : 'Criar Usuário';
        const message = editingUser
            ? `Deseja salvar as alterações no usuário "${formData.name}"?`
            : `Confirmar a criação do usuário "${formData.name}"?`;

        requestConfirm(title, message, () => {
            if (editingUser) {
                updateMutation.mutate({ id: editingUser.id, data: formData });
            } else {
                createMutation.mutate(formData);
            }
        }, editingUser ? 'warning' : 'info');
    };

    const handleDelete = (id: number, name: string) => {
        requestConfirm(
            'Excluir Usuário',
            `Deseja realmente remover o usuário "${name}"? Esta ação não pode ser desfeita e ele perderá todo acesso ao sistema.`,
            () => deleteMutation.mutate(id),
            'danger'
        );
    };

    const handleToggleApprover = (id: number, name: string, isCurrentlyApprover: boolean) => {
        const action = isCurrentlyApprover ? 'Remover' : 'Tornar';
        requestConfirm(
            'Alterar Status de Aprovador',
            `Deseja ${action.toLowerCase()} "${name}" como um aprovador de integração?`,
            () => toggleApproverMutation.mutate(id),
            'warning'
        );
    };

    const filteredUsers = users?.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 text-left">
            <header className="flex justify-between items-center text-left">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 border-none">Gerenciamento de Usuários</h1>
                    <p className="text-gray-500 mt-1">Controle quem tem acesso ao sistema e quais são seus perfis.</p>
                </div>
                <PermissionGuard permission="canEditUsers">
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                        <Plus size={20} />
                        <span>Novo Usuário</span>
                    </button>
                </PermissionGuard>
            </header>

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                />
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden text-left">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50">
                        <tr className="border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider text-left">
                            <th className="py-5 px-6 font-semibold">Usuário</th>
                            <th className="py-5 px-6 font-semibold">Permissão (Role)</th>
                            <th className="py-5 px-6 font-semibold">Aprovador de Integração</th>
                            <th className="py-5 px-6 font-semibold">Email</th>
                            <th className="py-5 px-6 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {isLoading ? (
                            <tr><td colSpan={5} className="py-8 text-center animate-pulse">Carregando usuários...</td></tr>
                        ) : filteredUsers?.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="py-5 px-6 text-left">
                                    <div className="flex items-center space-x-3 text-left">
                                        <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                                            {user.name?.[0] || 'U'}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900">{user.name}</div>
                                            <div className="text-xs text-gray-400">ID: #{user.id}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-5 px-6 text-left">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                                        }`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="py-5 px-6 text-left">
                                    <button
                                        onClick={() => handleToggleApprover(user.id, user.name, !!user.isIntegrationApprover)}
                                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${user.isIntegrationApprover
                                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                            : 'bg-gray-50 text-gray-300 hover:bg-gray-100'
                                            }`}
                                    >
                                        {user.isIntegrationApprover ? 'Aprovador Ativo' : 'Tornar Aprovador'}
                                    </button>
                                </td>
                                <td className="py-5 px-6 text-left">
                                    <div className="flex items-center text-gray-600 text-sm">
                                        <Mail size={14} className="mr-2 text-gray-400" />
                                        {user.email}
                                    </div>
                                </td>
                                <td className="py-5 px-6 text-left">
                                    <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity space-x-2">
                                        <PermissionGuard permission="canEditUsers">
                                            <button
                                                onClick={() => handleOpenModal(user)}
                                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                title="Editar Usuário"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                        </PermissionGuard>
                                        <PermissionGuard permission="canDeleteUsers">
                                            <button
                                                onClick={() => handleDelete(user.id, user.name)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="Excluir Usuário"
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
                            <h2 className="text-xl font-bold text-gray-900">{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo</label>
                                <input
                                    type="text" required value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Ex: João da Silva"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">E-mail</label>
                                <input
                                    type="email" required value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="joao@empresa.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Papel (Role)</label>
                                <select
                                    required value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                                >
                                    <option value="user">Usuário Comum (User)</option>
                                    <option value="admin">Administrador (Admin)</option>
                                </select>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-50">
                                <button type="button" onClick={handleCloseModal} className="px-6 py-2.5 font-bold text-gray-400 hover:text-gray-600 transition-all">Cancelar</button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
                                >
                                    {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
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
