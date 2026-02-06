'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileService, Profile } from '@/services/profileService';
import { ShieldCheck, Plus, Check, X, ShieldAlert, Trash2, Edit2 } from 'lucide-react';
import { useState } from 'react';
import { useNotify } from '@/components/ui/Notification';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { PermissionGuard } from '@/components/ui/PermissionGuard';

const PERMISSION_GROUPS = [
    { label: 'Documentação', keys: ['canViewDocs', 'canApproveDocs', 'canDeleteDocs'] },
    { label: 'Empresas', keys: ['canViewEmpresas', 'canCreateEmpresas', 'canEditEmpresas', 'canDeleteEmpresas'] },
    { label: 'Contratos', keys: ['canViewContratos', 'canCreateContratos', 'canEditContratos', 'canDeleteContratos'] },
    { label: 'Funcionários', keys: ['canViewFuncionarios', 'canCreateFuncionarios', 'canEditFuncionarios', 'canDeleteFuncionarios'] },
    { label: 'Categorias', keys: ['canViewCategorias', 'canCreateCategorias', 'canEditCategorias', 'canDeleteCategorias'] },
    { label: 'Tipo Processo', keys: ['canViewTipoProcesso', 'canCreateTipoProcesso', 'canEditTipoProcesso', 'canDeleteTipoProcesso'] },
    { label: 'Usuários', keys: ['canViewUsers', 'canCreateUsers', 'canEditUsers', 'canDeleteUsers'] },
    { label: 'Perfis', keys: ['canViewPerfis', 'canCreatePerfis', 'canEditPerfis', 'canDeletePerfis'] },
    { label: 'Relatórios (Cubo)', keys: ['canViewCubos', 'canCreateCubos', 'canEditCubos', 'canDeleteCubos'] },
    { label: 'Relatórios (PDF)', keys: ['canGeneratePdfReports'] },
    { label: 'Regras de Aprovação', keys: ['canViewRegrasAprovacao', 'canCreateRegrasAprovacao', 'canEditRegrasAprovacao', 'canDeleteRegrasAprovacao'] },
    { label: 'Sistema', keys: ['canViewLogs'] },
];

const INITIAL_PERMISSIONS: any = {};
PERMISSION_GROUPS.forEach(group => group.keys.forEach(key => INITIAL_PERMISSIONS[key] = false));

export default function ProfilesPage() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '', ...INITIAL_PERMISSIONS });
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

    const { data: profiles, isLoading } = useQuery({
        queryKey: ['profiles'],
        queryFn: () => profileService.getAll(),
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => profileService.create(data),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['profiles'] });
            handleCloseModal();
            notify('success', 'Perfil Criado', `O perfil "${data.name}" foi cadastrado.`);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => profileService.update(id, data),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['profiles'] });
            handleCloseModal();
            notify('success', 'Perfil Atualizado', `As permissões do perfil "${data.name}" foram salvas.`);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => profileService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profiles'] });
            notify('success', 'Perfil Excluído', 'O perfil foi removido com sucesso.');
        },
    });

    const handleOpenModal = (profile?: Profile) => {
        if (profile) {
            setEditingProfile(profile);
            setFormData({ ...profile });
        } else {
            setEditingProfile(null);
            setFormData({ name: '', description: '', ...INITIAL_PERMISSIONS });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProfile(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const title = editingProfile ? 'Atualizar Perfil' : 'Criar Perfil';
        const message = editingProfile
            ? `Deseja salvar as alterações nas permissões do perfil "${formData.name}"?`
            : `Confirmar a criação do perfil "${formData.name}"?`;

        requestConfirm(title, message, () => {
            if (editingProfile) {
                updateMutation.mutate({ id: editingProfile.id, data: formData });
            } else {
                createMutation.mutate(formData);
            }
        }, 'info');
    };

    const handleDelete = (id: number, name: string) => {
        requestConfirm(
            'Excluir Perfil',
            `Deseja realmente remover o perfil "${name}"? Usuários vinculados a este perfil podem perder acesso a funcionalidades críticas.`,
            () => deleteMutation.mutate(id),
            'danger'
        );
    };

    const togglePermission = (key: string) => {
        setFormData((prev: any) => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="space-y-8 text-left">
            <header className="flex justify-between items-center text-left">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 border-none">Perfis de Acesso</h1>
                    <p className="text-gray-500 mt-1">Defina o que cada grupo de usuários pode visualizar e executar.</p>
                </div>
                <PermissionGuard permission="canCreatePerfis">
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                        <Plus size={20} />
                        <span>Novo Perfil</span>
                    </button>
                </PermissionGuard>
            </header>

            <div className="grid grid-cols-1 gap-6 text-left">
                {isLoading ? (
                    <div className="animate-pulse space-y-4">
                        <div className="h-40 bg-white rounded-3xl border border-gray-100 font-bold">Carregando perfis...</div>
                    </div>
                ) : profiles?.map((profile: any) => (
                    <div key={profile.id} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                        <div className="bg-indigo-950 p-6 flex justify-between items-center text-left">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center">
                                    <ShieldCheck className="mr-2 text-indigo-400" size={24} />
                                    {profile.name}
                                </h3>
                                <p className="text-indigo-200 text-sm mt-1">{profile.description || 'Sem descrição definida.'}</p>
                            </div>
                            <div className="flex space-x-2">
                                <PermissionGuard permission="canEditPerfis">
                                    <button
                                        onClick={() => handleOpenModal(profile)}
                                        className="bg-indigo-800 text-white p-2 rounded-xl hover:bg-indigo-700 transition-colors"
                                        title="Editar Perfil"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                </PermissionGuard>
                                <PermissionGuard permission="canDeletePerfis">
                                    <button
                                        onClick={() => handleDelete(profile.id, profile.name)}
                                        className="bg-red-900/50 text-red-200 p-2 rounded-xl hover:bg-red-800 transition-colors"
                                        title="Excluir Perfil"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </PermissionGuard>
                            </div>
                        </div>

                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-8 text-left">
                            {PERMISSION_GROUPS.map((group) => (
                                <div key={group.label} className="space-y-4">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">
                                        {group.label}
                                    </h4>
                                    <ul className="space-y-3">
                                        {group.keys.map((key) => {
                                            const isAllowed = profile[key];
                                            return (
                                                <li key={key} className="flex items-center justify-between group/item">
                                                    <span className={`text-xs font-medium ${isAllowed ? 'text-gray-700' : 'text-gray-300'}`}>
                                                        {key.replace('can', '').replace(/([A-Z])/g, ' $1').trim()}
                                                    </span>
                                                    <div className={`p-1 rounded-md ${isAllowed ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-200'}`}>
                                                        {isAllowed ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {profiles?.length === 0 && (
                    <div className="bg-white rounded-3xl border-2 border-dashed border-gray-100 p-20 text-center">
                        <ShieldAlert size={48} className="mx-auto text-gray-200 mb-4" />
                        <p className="text-gray-400 font-bold">Nenhum perfil de acesso cadastrado</p>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 text-left">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">{editingProfile ? 'Editar Perfil' : 'Novo Perfil'}</h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Perfil</label>
                                    <input
                                        type="text" required value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Descrição</label>
                                    <input
                                        type="text" value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-900 flex items-center">
                                    <ShieldCheck className="mr-2 text-indigo-500" size={20} />
                                    Permissões de Acesso
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-gray-50 p-6 rounded-3xl">
                                    {PERMISSION_GROUPS.map(group => (
                                        <div key={group.label} className="space-y-3">
                                            <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest bg-white inline-block px-2 py-1 rounded-md shadow-sm mb-2">{group.label}</h4>
                                            <div className="space-y-2">
                                                {group.keys.map(key => (
                                                    <label key={key} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 cursor-pointer hover:border-indigo-200 transition-all select-none group/perm">
                                                        <span className="text-xs font-bold text-gray-600">{key.replace('can', '').replace(/([A-Z])/g, ' $1').trim()}</span>
                                                        <div
                                                            onClick={() => togglePermission(key)}
                                                            className={`w-10 h-6 rounded-full transition-all relative ${formData[key] ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                                        >
                                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData[key] ? 'left-5' : 'left-1'}`} />
                                                        </div>
                                                        <input type="checkbox" className="hidden" checked={formData[key]} onChange={() => { }} />
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </form>

                        <div className="p-6 border-t border-gray-100 flex justify-end space-x-3 bg-white">
                            <button type="button" onClick={handleCloseModal} className="px-6 py-2.5 font-bold text-gray-400">Cancelar</button>
                            <button
                                onClick={handleSubmit}
                                className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                            >
                                {editingProfile ? 'Salvar Alterações' : 'Criar Perfil'}
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
