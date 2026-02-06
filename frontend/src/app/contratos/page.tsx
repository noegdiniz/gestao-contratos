'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contratoService, Contrato } from '@/services/contratoService';
import { empresaService } from '@/services/empresaService';
import { configService } from '@/services/configService';
import { Plus, Search, FileText, Calendar, Building2, Edit2, Trash2, X, Tags } from 'lucide-react';
import { useState } from 'react';
import { PermissionGuard } from '@/components/ui/PermissionGuard';
import { Pagination } from '@/components/ui/Pagination';

export default function ContratosPage() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContrato, setEditingContrato] = useState<Contrato | null>(null);
    const [formData, setFormData] = useState({
        nome: '',
        empresaId: 0,
        empresaNome: '',
        dtInicio: new Date().toISOString().split('T')[0],
        dtFim: new Date().toISOString().split('T')[0],
        categoriaId: undefined as number | undefined,
        categoriaNome: '',
        status: 'ATIVO'
    });

    const { data: contractsData, isLoading } = useQuery({
        queryKey: ['contratos', page, limit],
        queryFn: () => contratoService.getAll(page, limit),
        keepPreviousData: true
    });

    const contracts = contractsData?.data || [];
    const totalPages = contractsData?.pages || 1;

    const { data: companiesData } = useQuery({
        queryKey: ['empresas-for-select'],
        queryFn: () => empresaService.getAll(1, 1000),
    });

    const companies = companiesData?.data || [];

    const { data: categories } = useQuery({
        queryKey: ['categorias'],
        queryFn: () => configService.getCategorias(),
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => contratoService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contratos'] });
            handleCloseModal();
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => contratoService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contratos'] });
            handleCloseModal();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => contratoService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contratos'] });
        },
    });

    const handleOpenModal = (contrato?: Contrato) => {
        if (contrato) {
            setEditingContrato(contrato);
            setFormData({
                nome: contrato.nome,
                empresaId: contrato.empresaId,
                empresaNome: contrato.empresaNome,
                dtInicio: new Date(contrato.dtInicio).toISOString().split('T')[0],
                dtFim: new Date(contrato.dtFim).toISOString().split('T')[0],
                categoriaId: contrato.categoriaId,
                categoriaNome: contrato.categoriaNome || '',
                status: contrato.status || 'ATIVO'
            });
        } else {
            setEditingContrato(null);
            setFormData({
                nome: '',
                empresaId: companies?.[0]?.id || 0,
                empresaNome: companies?.[0]?.nome || '',
                dtInicio: new Date().toISOString().split('T')[0],
                dtFim: new Date().toISOString().split('T')[0],
                categoriaId: undefined,
                categoriaNome: '',
                status: 'ATIVO'
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingContrato(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingContrato) {
            updateMutation.mutate({ id: editingContrato.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Deseja excluir este contrato?')) {
            deleteMutation.mutate(id);
        }
    };

    const filteredContracts = contracts?.filter(c =>
        c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.empresaNome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 text-left">
            <header className="flex justify-between items-center text-left">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 border-none">Contratos</h1>
                    <p className="text-gray-500 mt-1">Gerencie os contratos vinculados às prestadoras.</p>
                </div>
                <PermissionGuard permission="canCreateContratos">
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 font-bold"
                    >
                        <Plus size={20} />
                        <span>Novo Contrato</span>
                    </button>
                </PermissionGuard>
            </header>

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Buscar contrato ou empresa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-3xl p-6 h-48 animate-pulse border border-gray-100"></div>
                    ))
                ) : filteredContracts?.map((contract) => (
                    <div key={contract.id} className="bg-white rounded-3xl p-6 border border-gray-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group overflow-hidden relative text-left">
                        <div className="absolute top-0 right-0 p-4 flex space-x-2">
                            <PermissionGuard permission="canEditContratos">
                                <button onClick={() => handleOpenModal(contract)} className="p-2 bg-gray-50 text-gray-400 hover:text-blue-600 rounded-lg transition-all opacity-0 group-hover:opacity-100" title="Editar">
                                    <Edit2 size={16} />
                                </button>
                            </PermissionGuard>
                            <PermissionGuard permission="canDeleteContratos">
                                <button onClick={() => handleDelete(contract.id)} className="p-2 bg-gray-50 text-gray-400 hover:text-red-600 rounded-lg transition-all opacity-0 group-hover:opacity-100" title="Excluir">
                                    <Trash2 size={16} />
                                </button>
                            </PermissionGuard>
                            <div className="bg-indigo-50 text-indigo-600 p-2 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                <FileText size={20} />
                            </div>
                        </div>

                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                                {contract.nome}
                            </h3>
                            <div className="flex items-center text-gray-500 text-sm">
                                <Building2 size={14} className="mr-1.5" />
                                {contract.empresaNome}
                            </div>
                            {contract.categoriaNome && (
                                <div className="flex items-center text-indigo-500 text-xs font-bold mt-1 uppercase tracking-wider">
                                    <Tags size={12} className="mr-1" />
                                    {contract.categoriaNome}
                                </div>
                            )}
                            <div className={`mt-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${contract.status === 'INATIVO' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {contract.status || 'ATIVO'}
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                            <div className="space-y-1">
                                <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Vigência</div>
                                <div className="flex items-center text-xs text-gray-600 font-medium">
                                    <Calendar size={12} className="mr-1" />
                                    {new Date(contract.dtInicio).toLocaleDateString()} - {new Date(contract.dtFim).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={contractsData?.total}
                itemsPerPage={limit}
                onPageChange={setPage}
                onItemsPerPageChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
            />

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">{editingContrato ? 'Editar Contrato' : 'Novo Contrato'}</h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 outline-none"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nome/Número do Contrato</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.nome}
                                    onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all uppercase"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Empresa Prestadora</label>
                                <select
                                    required
                                    value={formData.empresaId}
                                    onChange={e => {
                                        const emp = companies?.find(c => c.id === parseInt(e.target.value));
                                        setFormData({ ...formData, empresaId: parseInt(e.target.value), empresaNome: emp?.nome || '' });
                                    }}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">Selecione uma empresa</option>
                                    {companies?.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.nome}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Categoria do Contrato</label>
                                <select
                                    required
                                    value={formData.categoriaId || ''}
                                    onChange={e => {
                                        const cat = categories?.find(c => c.id === parseInt(e.target.value));
                                        setFormData({ ...formData, categoriaId: parseInt(e.target.value), categoriaNome: cat?.nome || '' });
                                    }}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">Selecione uma categoria</option>
                                    {categories?.map((cat: any) => (
                                        <option key={cat.id} value={cat.id}>{cat.nome}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Data Início</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.dtInicio}
                                        onChange={e => setFormData({ ...formData, dtInicio: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Data Fim</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.dtFim}
                                        onChange={e => setFormData({ ...formData, dtFim: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    />
                                </div>
                            </div>

                            {editingContrato && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    >
                                        <option value="ATIVO">ATIVO</option>
                                        <option value="INATIVO">INATIVO</option>
                                    </select>
                                    {formData.status === 'INATIVO' && (
                                        <p className="text-xs text-red-500 mt-1 font-medium bg-red-50 p-2 rounded-lg border border-red-100">
                                            Atenção: Inativar o contrato inativará todos os funcionários vinculados.
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end space-x-3 pt-4">
                                <button type="button" onClick={handleCloseModal} className="px-6 py-2.5 font-bold text-gray-400 hover:text-gray-600 transition-all">Cancelar</button>
                                <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                                    {editingContrato ? 'Salvar Alterações' : 'Criar Contrato'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
