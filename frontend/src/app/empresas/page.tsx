'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { empresaService, Empresa } from '@/services/empresaService';
import { Plus, Search, Building2, Edit2, Trash2, Key, X } from 'lucide-react';
import { useState } from 'react';
import { PermissionGuard } from '@/components/ui/PermissionGuard';
import { Pagination } from '@/components/ui/Pagination';

export default function EmpresasPage() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
    const [formData, setFormData] = useState({ nome: '', loginName: '', cnpj: '', departamento: '', chave: '', status: 'ATIVA' });

    const { data: companiesData, isLoading } = useQuery({
        queryKey: ['empresas', page, limit],
        queryFn: () => empresaService.getAll(page, limit),
        keepPreviousData: true
    });

    const companies = companiesData?.data || [];
    const totalPages = companiesData?.pages || 1;

    const createMutation = useMutation({
        mutationFn: (data: any) => empresaService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['empresas'] });
            handleCloseModal();
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => empresaService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['empresas'] });
            handleCloseModal();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => empresaService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['empresas'] });
        },
    });

    const handleOpenModal = (empresa?: Empresa) => {
        if (empresa) {
            setEditingEmpresa(empresa);
            setFormData({
                nome: empresa.nome,
                loginName: empresa.loginName || '',
                cnpj: empresa.cnpj,
                departamento: empresa.departamento,
                chave: empresa.chave,
                status: empresa.status
            });
        } else {
            setEditingEmpresa(null);
            setFormData({ nome: '', loginName: '', cnpj: '', departamento: '', chave: '', status: 'ATIVA' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingEmpresa(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingEmpresa) {
            updateMutation.mutate({ id: editingEmpresa.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Tem certeza que deseja excluir esta empresa?')) {
            deleteMutation.mutate(id);
        }
    };

    const filteredCompanies = companies?.filter(c =>
        c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cnpj.includes(searchTerm)
    );

    return (
        <div className="space-y-8 text-left">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 border-none">Empresas</h1>
                    <p className="text-gray-500 mt-1">Gerencie todas as prestadoras cadastradas no sistema.</p>
                </div>
                <PermissionGuard permission="canCreateEmpresas">
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                        <Plus size={20} />
                        <span>Nova Empresa</span>
                    </button>
                </PermissionGuard>
            </header>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou CNPJ..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                    />
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50">
                        <tr className="border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                            <th className="py-5 px-6 font-semibold">Empresa</th>
                            <th className="py-5 px-6 font-semibold">Login Name</th>
                            <th className="py-5 px-6 font-semibold">CNPJ</th>
                            <th className="py-5 px-6 font-semibold">Departamento</th>
                            <th className="py-5 px-6 font-semibold">Status</th>
                            <th className="py-5 px-6 font-semibold text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={5} className="py-8 px-6"><div className="h-4 bg-gray-100 rounded w-full"></div></td>
                                </tr>
                            ))
                        ) : filteredCompanies?.map((company) => (
                            <tr key={company.id} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="py-5 px-6">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                            <Building2 size={20} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900">{company.nome}</div>
                                            <div className="text-xs text-gray-400">ID: #{company.id}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-5 px-6 text-gray-600 font-medium">
                                    <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{company.loginName}</span>
                                </td>
                                <td className="py-5 px-6 text-gray-600 font-medium">{company.cnpj}</td>
                                <td className="py-5 px-6 text-gray-600">{company.departamento}</td>
                                <td className="py-5 px-6">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${company.status === 'ATIVA' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {company.status}
                                    </span>
                                </td>
                                <td className="py-5 px-6">
                                    <div className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <PermissionGuard permission="canEditEmpresas">
                                            <button
                                                onClick={() => handleOpenModal(company)}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                title="Editar"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                        </PermissionGuard>
                                        <PermissionGuard permission="canDeleteEmpresas">
                                            <button
                                                onClick={() => handleDelete(company.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="Excluir"
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

            <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={companiesData?.total}
                itemsPerPage={limit}
                onPageChange={setPage}
                onItemsPerPageChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
            />

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">{editingEmpresa ? 'Editar Empresa' : 'Nova Empresa'}</h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 outline-none"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nome da Empresa</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.nome}
                                    onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Login Name (Apenas minúsculas e underscore)</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.loginName}
                                    onChange={e => {
                                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                                        setFormData({ ...formData, loginName: val });
                                    }}
                                    placeholder="ex: empresa_xyz"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">CNPJ</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.cnpj}
                                        onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Departamento</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.departamento}
                                        onChange={e => setFormData({ ...formData, departamento: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Chave de Acesso (Segurança)</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.chave}
                                    onChange={e => setFormData({ ...formData, chave: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                                />
                            </div>

                            {editingEmpresa && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    >
                                        <option value="ATIVA">ATIVA</option>
                                        <option value="INATIVO">INATIVO</option>
                                    </select>
                                    {formData.status === 'INATIVO' && (
                                        <p className="text-xs text-red-500 mt-1 font-medium bg-red-50 p-2 rounded-lg border border-red-100">
                                            Atenção: Inativar a empresa também inativará todos os contratos atuais dos seus funcionários.
                                        </p>
                                    )}
                                </div>
                            )}
                            <div className="flex justify-end space-x-3 pt-4">
                                <button type="button" onClick={handleCloseModal} className="px-6 py-2.5 font-bold text-gray-400 hover:text-gray-600 transition-all">Cancelar</button>
                                <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                                    {editingEmpresa ? 'Salvar Alterações' : 'Cadastrar Empresa'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
