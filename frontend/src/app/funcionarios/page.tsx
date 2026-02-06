'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { funcionarioService, Funcionario } from '@/services/funcionarioService';
import { configService } from '@/services/configService';
import { configuracaoService } from '@/services/configuracaoService';
import { contratoService } from '@/services/contratoService';
import { Search, UserCircle, ShieldCheck, FileCheck, Building2, Edit2, Trash2, Plus, X, CalendarCheck, Clock, History, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import { PermissionGuard } from '@/components/ui/PermissionGuard';
import DocumentosModal from './DocumentosModal';
import { useNotify } from '@/components/ui/Notification';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Pagination } from '@/components/ui/Pagination';

export default function FuncionariosPage() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
    const [selectedFuncionario, setSelectedFuncionario] = useState<Funcionario | null>(null);
    const [editingFuncionario, setEditingFuncionario] = useState<Funcionario | null>(null);
    const [formData, setFormData] = useState({ nome: '', contratoId: '' as number | '' });
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [companyFilter, setCompanyFilter] = useState<string>('');
    const [contractFilter, setContractFilter] = useState<string>('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleDetails, setScheduleDetails] = useState({
        contratoId: '' as number | '',
        funcaoId: '' as number | '',
        cargoId: '' as number | '',
        setorId: '' as number | '',
        unidadeIntegracaoId: '' as number | '',
        unidadeAtividadeId: '' as number | '',
        dataAso: '',
        prazoAsoDias: 365,
        prazoIntegracaoDias: 365
    });
    const [justification, setJustification] = useState('');
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyData, setHistoryData] = useState<any[]>([]);
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

    const { data: employeesData, isLoading } = useQuery({
        queryKey: ['funcionarios', page, limit],
        queryFn: () => funcionarioService.getAll(page, limit),
        keepPreviousData: true
    });

    const employees = employeesData?.data || [];
    const totalPages = employeesData?.pages || 1;

    const { data: userData } = useQuery({
        queryKey: ['me'],
        queryFn: async () => {
            const response = await api.get('/me');
            return response.data;
        },
    });

    const { data: contratos } = useQuery({
        queryKey: ['contratos'],
        queryFn: () => contratoService.getAll(),
    });

    // Catalogs
    const { data: funcoes = [] } = useQuery({ queryKey: ['funcoes'], queryFn: configService.getFuncoes });
    const { data: cargos = [] } = useQuery({ queryKey: ['cargos'], queryFn: configService.getCargos });
    const { data: setores = [] } = useQuery({ queryKey: ['setores'], queryFn: configService.getSetores });
    const { data: unidadesIntegracao = [] } = useQuery({ queryKey: ['unidadesIntegracao'], queryFn: configService.getUnidadesIntegracao });

    const isCompany = userData?.type === 'empresa';

    const createMutation = useMutation({
        mutationFn: (data: any) => funcionarioService.create(data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
            handleCloseModal();
            notify('success', 'Colaborador Criado', `${data.nome} foi cadastrado com sucesso.`);
        },
        onError: () => notify('error', 'Erro ao Criar', 'Não foi possível cadastrar o colaborador.')
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => funcionarioService.update(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
            handleCloseModal();
            notify('success', 'Cadastro Atualizado', `Os dados de ${data.nome} foram atualizados.`);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => funcionarioService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
            notify('success', 'Colaborador Removido', 'O cadastro foi excluído permanentemente.');
        },
        onError: () => notify('error', 'Erro ao Remover', 'Não foi possível excluir o cadastro.')
    });

    const handleOpenModal = (emp?: Funcionario) => {
        if (emp) {
            setEditingFuncionario(emp);
            setFormData({ nome: emp.nome, contratoId: emp.contratoId || '' });
        } else {
            setEditingFuncionario(null);
            setFormData({ nome: '', contratoId: '' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingFuncionario(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingFuncionario) {
            updateMutation.mutate({ id: editingFuncionario.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id: number) => {
        requestConfirm(
            'Excluir Colaborador',
            'Esta ação é irreversível. Todas as vinculações e históricos deste colaborador serão perdidos. Deseja continuar?',
            () => deleteMutation.mutate(id),
            'danger'
        );
    };

    const { data: config } = useQuery({
        queryKey: ['configuracao'],
        queryFn: configuracaoService.get,
    });

    const scheduleMutation = useMutation({
        mutationFn: (params: {
            ids: number[],
            data: string,
            contratoId: number,
            funcaoId: number,
            funcaoNome: string,
            cargoId: number,
            cargoNome: string,
            setorId: number,
            setorNome: string,
            unidadeIntegracaoId: number,
            unidadeIntegracao: string,
            unidadeAtividadeId: number,
            unidadeAtividade: string,
            dataAso?: string,
            prazoAsoDias?: number,
            prazoIntegracaoDias?: number
        }) => {
            const { ids, ...rest } = params;
            return funcionarioService.agendarIntegracao({ ...rest, funcionarioIds: ids, justificativaAgendamento: justification });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
            setIsScheduleModalOpen(false);
            setSelectedIds([]);
            notify('success', 'Agendamento Realizado', 'A integração em massa foi programada com sucesso.');
        },
        onError: (error: any) => {
            const detail = error.response?.data?.detail || 'Não foi possível realizar o agendamento.';
            notify('error', 'Erro no Agendamento', detail);
        }
    });

    const manualApproveMutation = useMutation({
        mutationFn: (id: number) => funcionarioService.aprovar(id),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
            notify('success', 'Integração Aprovada', `A integração de ${data.nome} foi aprovada. O status atual é: ${data.statusIntegracao}`);
        }
    });

    const confirmPresenceMutation = useMutation({
        mutationFn: (id: number) => funcionarioService.confirmarPresenca(id),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
            notify('success', 'Presença Confirmada', `Presença confirmada para ${data.nome || 'o colaborador'}. Status: REALIZADA.`);
        },
        onError: (error: any) => {
            const detail = error.response?.data?.detail || 'Não foi possível confirmar a presença.';
            notify('error', 'Erro na Confirmação', detail);
        }
    });



    const toggleSelect = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleBulkSchedule = (e: React.FormEvent) => {
        e.preventDefault();

        // Validar dia da semana
        if (config?.diasSemanaAgenda && scheduleDate) {
            const date = new Date(scheduleDate);
            const diasMap: Record<number, string> = {
                0: 'DOM', 1: 'SEG', 2: 'TER', 3: 'QUA', 4: 'QUI', 5: 'SEX', 6: 'SAB'
            };
            const diaDaSemana = diasMap[date.getDay()];
            const diasPermitidos = config.diasSemanaAgenda.split(',');

            if (!diasPermitidos.includes(diaDaSemana) && !justification) {
                notify('error', 'Data Inválida', `Os agendamentos são permitidos apenas nos seguintes dias: ${diasPermitidos.join(', ')}. Para outras datas, preencha a justificativa.`);
                return;
            }
        }

        // Get names from IDs for storage
        const unidadeInt = unidadesIntegracao?.find((u: any) => u.id === Number(scheduleDetails.unidadeIntegracaoId));
        const unidadeAtiv = unidadesIntegracao?.find((u: any) => u.id === Number(scheduleDetails.unidadeAtividadeId));
        const funcaoSel = funcoes?.find((f: any) => f.id === Number(scheduleDetails.funcaoId));
        const cargoSel = cargos?.find((c: any) => c.id === Number(scheduleDetails.cargoId));
        const setorSel = setores?.find((s: any) => s.id === Number(scheduleDetails.setorId));

        scheduleMutation.mutate({
            ids: selectedIds,
            data: scheduleDate,
            dataAso: scheduleDetails.dataAso,
            prazoAsoDias: config?.prazoAsoGeral || 365,
            prazoIntegracaoDias: config?.prazoIntegracaoGeral || 365,
            contratoId: scheduleDetails.contratoId as number,
            funcaoId: Number(scheduleDetails.funcaoId),
            funcaoNome: funcaoSel?.nome || '',
            cargoId: Number(scheduleDetails.cargoId),
            cargoNome: cargoSel?.nome || '',
            setorId: Number(scheduleDetails.setorId),
            setorNome: setorSel?.nome || '',
            unidadeIntegracaoId: Number(scheduleDetails.unidadeIntegracaoId),
            unidadeIntegracao: unidadeInt?.nome || '',
            unidadeAtividadeId: Number(scheduleDetails.unidadeAtividadeId),
            unidadeAtividade: unidadeAtiv?.nome || '',
        });
    };

    const handleViewHistory = async (emp: Funcionario) => {
        const hist = await funcionarioService.getHistoricoIntegracao(emp.id);
        setHistoryData(hist);
        setSelectedFuncionario(emp);
        setIsHistoryOpen(true);
    };

    const filteredEmployees = employees?.filter(emp => {
        const matchesSearch = emp.nome.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCompany = companyFilter === '' || emp.empresaId?.toString() === companyFilter;
        const matchesContract = contractFilter === '' || emp.contratoId?.toString() === contractFilter;
        return matchesSearch && matchesCompany && matchesContract;
    });

    const uniqueCompanies = Array.from(new Set(employees?.map(e => ({ id: e.empresaId, nome: e.empresaNome })).filter(e => e.id)))
        .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

    const relevantContracts = Array.from(new Set(employees?.map(e => ({ id: e.contratoId, nome: e.contratoNome })).filter(e => e.id)))
        .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

    return (
        <div className="space-y-8 text-left">
            <header className="flex justify-between items-center text-left">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 border-none">Funcionários da Prestadora</h1>
                    <p className="text-gray-500 mt-1">Gestão de integração e conformidade de terceiros.</p>
                </div>
                <div className="flex space-x-3">
                    <PermissionGuard permission="canEditFuncionarios">
                        {selectedIds.length > 0 && selectedIds.every(id => {
                            const emp = employees?.find(e => e.id === id);
                            const allowed = ["APROVADO", "DOC. PENDENTE", "FALTOU", "APROVADO (COM DOC. PENDENTE)", "VENCIDO", "PENDENTE"];
                            return emp && allowed.includes(emp.statusIntegracao || '');
                        }) && (
                                <button
                                    onClick={() => setIsScheduleModalOpen(true)}
                                    className="flex items-center space-x-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-all font-bold"
                                >
                                    <CalendarCheck size={20} />
                                    <span>Agendar ({selectedIds.length})</span>
                                </button>
                            )}
                    </PermissionGuard>

                    <PermissionGuard permission="canCreateFuncionarios">
                        <button
                            onClick={() => handleOpenModal()}
                            className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 font-bold"
                        >
                            <Plus size={20} />
                            <span>Cadastrar Funcionário</span>
                        </button>
                    </PermissionGuard>
                </div>
            </header>

            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar funcionário por nome..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                    />
                </div>

                {!isCompany && (
                    <>
                        <select
                            value={companyFilter}
                            onChange={(e) => setCompanyFilter(e.target.value)}
                            className="px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm text-sm font-bold min-w-[200px]"
                        >
                            <option value="">Todas as Empresas</option>
                            {uniqueCompanies.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.nome}</option>
                            ))}
                        </select>

                        <select
                            value={contractFilter}
                            onChange={(e) => setContractFilter(e.target.value)}
                            className="px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm text-sm font-bold min-w-[200px]"
                        >
                            <option value="">Todos os Contratos</option>
                            {relevantContracts.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.nome}</option>
                            ))}
                        </select>
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-3xl p-6 h-40 animate-pulse border border-gray-100"></div>
                    ))
                ) : filteredEmployees?.map((emp) => (
                    <div key={emp.id} className="bg-white rounded-3xl p-5 border border-gray-100 flex items-start space-x-5 hover:shadow-xl transition-all group relative text-left overflow-hidden">
                        <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <PermissionGuard permission="canEditFuncionarios">
                                <button
                                    onClick={() => handleOpenModal(emp)}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                    title="Editar"
                                >
                                    <Edit2 size={16} />
                                </button>
                            </PermissionGuard>
                            <PermissionGuard permission="canDeleteFuncionarios">
                                <button
                                    onClick={() => handleDelete(emp.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    title="Excluir"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </PermissionGuard>
                        </div>

                        <div className="w-16 h-16 bg-indigo-50 text-indigo-200 flex items-center justify-center rounded-2xl group-hover:bg-indigo-600 group-hover:text-indigo-50 transition-all shrink-0 mt-1">
                            <UserCircle size={40} />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-3 min-w-0 flex-1">
                                    <PermissionGuard permission="canEditFuncionarios">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded-lg border-gray-200 text-indigo-600 focus:ring-indigo-500 shrink-0"
                                            checked={selectedIds.includes(emp.id)}
                                            onChange={() => toggleSelect(emp.id)}
                                        />
                                    </PermissionGuard>
                                    <h3 className="text-xl font-bold text-gray-900 truncate">{emp.nome}</h3>
                                </div>
                            </div>
                            <div className="flex items-center flex-wrap gap-1 mb-2">
                                <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider truncate max-w-[120px] ${emp.statusContratual === 'ATIVO' ? 'bg-green-100 text-green-700' :
                                    emp.statusContratual === 'VENCIDO' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    {emp.contratoNome || 'N/A'}
                                </span>
                                <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider ${emp.statusDocumentacao === 'APROVADO' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {emp.statusDocumentacao === 'APROVADO' ? 'DOC. APROVADA' : 'DOC. PENDENTE'}
                                </span>
                                <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider ${emp.statusIntegracaoCalculado === 'VALIDO' ? 'bg-emerald-100 text-emerald-700' :
                                    emp.statusIntegracaoCalculado === 'VENCIDO' ? 'bg-red-100 text-red-700' :
                                        emp.statusIntegracao === 'REALIZADA' ? 'bg-emerald-100 text-emerald-700' :
                                            emp.statusIntegracao === 'AGENDADA' ? 'bg-blue-100 text-blue-700' :
                                                emp.statusIntegracao === 'APROVADO' ? 'bg-emerald-50 text-emerald-600' :
                                                    emp.statusIntegracao === 'FALTOU' ? 'bg-rose-100 text-rose-700' :
                                                        'bg-gray-100 text-gray-500'
                                    }`}>
                                    {emp.statusIntegracaoCalculado === 'VALIDO' ? 'INTEGRADO' :
                                        emp.statusIntegracaoCalculado === 'VENCIDO' ? 'INTEGR. VENCIDA' :
                                            emp.statusIntegracao || 'PENDENTE'}
                                </span>
                            </div>

                            {(!isCompany || !emp.contratoNome) && (
                                <div className="flex items-center space-x-2 mt-2">
                                    <Building2 size={12} className="text-gray-400" />
                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-tight truncate">
                                        {emp.empresaNome || 'Empresa não vinculada'}
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 mt-3">
                                {emp.dataIntegracao && (
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Integração</p>
                                        <p className="flex items-center text-xs text-gray-600 font-medium">
                                            <Clock size={12} className="mr-1 text-indigo-400" />
                                            {new Date(emp.dataIntegracao).toLocaleDateString('pt-BR')}
                                        </p>
                                        {emp.dataValidadeIntegracao && (
                                            <p className={`flex items-center text-[10px] font-bold ${emp.statusIntegracaoCalculado === 'VALIDO' ? 'text-emerald-600' : 'text-red-500'}`}>
                                                <CalendarCheck size={12} className="mr-1" />
                                                Vence: {new Date(emp.dataValidadeIntegracao).toLocaleDateString('pt-BR')}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {emp.dataValidadeASO && (
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">ASO / Saúde</p>
                                        <p className="flex items-center text-xs text-gray-600 font-medium">
                                            <Building2 size={12} className="mr-1 text-teal-400" />
                                            Válido até: {new Date(emp.dataValidadeASO).toLocaleDateString('pt-BR')}
                                        </p>
                                        {new Date(emp.dataValidadeASO) < new Date() && (
                                            <p className="flex items-center text-[10px] font-bold text-red-500">
                                                <AlertCircle size={10} className="mr-1" />
                                                ASO Vencido
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {(emp.funcaoNome || emp.unidadeIntegracaoNome) && (
                                <div className="mt-4 pt-4 border-t border-gray-50 flex flex-wrap gap-2">
                                    {emp.funcaoNome && (
                                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-[10px] font-bold uppercase">{emp.funcaoNome}</span>
                                    )}
                                    {emp.unidadeIntegracaoNome && (
                                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-[10px] font-bold uppercase">UI: {emp.unidadeIntegracaoNome}</span>
                                    )}
                                </div>
                            )}

                            <div className="flex space-x-3 mt-4">
                                <button
                                    onClick={() => {
                                        setSelectedFuncionario(emp);
                                        setIsDocsModalOpen(true);
                                    }}
                                    className="flex-1 flex items-center justify-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 py-2 rounded-xl text-xs font-bold transition-colors"
                                >
                                    <FileCheck size={14} />
                                    <span>Documentos</span>
                                </button>

                                <PermissionGuard permission="canApproveIntegration">
                                    {!isCompany &&
                                        ['PENDENTE', 'DOC. PENDENTE', 'DOCUMENTAÇÃO PENDENTE', 'REPROVADO', 'AGUARDANDO APROVAÇÃO'].some(s => emp.statusIntegracao?.toUpperCase().includes(s) || emp.statusIntegracao === 'PENDENTE') &&
                                        emp.statusIntegracao !== 'APROVADO (COM DOCUMENTAÇÃO PENDENTE)' && (
                                            <button
                                                onClick={() => requestConfirm(
                                                    'Aprovar Integração',
                                                    'Esta ação valida o colaborador para agendamento. Se houver documentos pendentes, o status indicará conformidade parcial. Deseja continuar?',
                                                    () => manualApproveMutation.mutate(emp.id),
                                                    'warning'
                                                )}
                                                className="flex-1 flex items-center justify-center space-x-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 py-2 rounded-xl text-xs font-bold transition-colors"
                                            >
                                                <ShieldCheck size={14} />
                                                <span>Aprovar</span>
                                            </button>
                                        )}
                                </PermissionGuard>
                                <button
                                    onClick={() => handleViewHistory(emp)}
                                    className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-400 rounded-xl transition-colors"
                                    title="Histórico"
                                >
                                    <History size={14} />
                                </button>

                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination Controls */}
            <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={employeesData?.total}
                itemsPerPage={limit}
                onPageChange={setPage}
                onItemsPerPageChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
            />

            {isDocsModalOpen && selectedFuncionario && (
                <DocumentosModal
                    funcionario={selectedFuncionario}
                    isCompany={isCompany}
                    onClose={() => {
                        setIsDocsModalOpen(false);
                        setSelectedFuncionario(null);
                    }}
                />
            )}

            {isScheduleModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Agendar Integração</h2>
                                <p className="text-sm text-gray-500">Agendando para {selectedIds.length} colaboradores.</p>
                            </div>
                            <button onClick={() => setIsScheduleModalOpen(false)} className="text-gray-400 hover:text-gray-600 outline-none"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleBulkSchedule} className="p-6 space-y-4 text-left overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Data e Hora</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={scheduleDate}
                                        onChange={e => setScheduleDate(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1 font-bold uppercase">Dias: {config?.diasSemanaAgenda || 'Todos'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Contrato</label>
                                    <select
                                        required
                                        value={scheduleDetails.contratoId}
                                        onChange={e => setScheduleDetails({ ...scheduleDetails, contratoId: Number(e.target.value) })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm"
                                    >
                                        <option value="">Selecione...</option>
                                        {contratos?.map(c => (
                                            <option key={c.id} value={c.id}>{c.nome}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Justificativa <span className="text-gray-400 font-normal">(Se agendar fora do padrão)</span></label>
                                <textarea
                                    value={justification}
                                    onChange={e => setJustification(e.target.value)}
                                    placeholder="Explique o motivo do agendamento extraordinário..."
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm min-h-[60px]"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-50">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Função</label>
                                    <select
                                        required
                                        value={scheduleDetails.funcaoId}
                                        onChange={e => setScheduleDetails({ ...scheduleDetails, funcaoId: Number(e.target.value) })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-bold"
                                    >
                                        <option value="">Selecione...</option>
                                        {funcoes?.map((f: any) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cargo</label>
                                    <select
                                        required
                                        value={scheduleDetails.cargoId}
                                        onChange={e => setScheduleDetails({ ...scheduleDetails, cargoId: Number(e.target.value) })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-bold"
                                    >
                                        <option value="">Selecione...</option>
                                        {cargos?.map((f: any) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Setor</label>
                                    <select
                                        required
                                        value={scheduleDetails.setorId}
                                        onChange={e => setScheduleDetails({ ...scheduleDetails, setorId: Number(e.target.value) })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-bold"
                                    >
                                        <option value="">Selecione...</option>
                                        {setores?.map((f: any) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Unidade Int.</label>
                                    <select
                                        required
                                        value={scheduleDetails.unidadeIntegracaoId}
                                        onChange={e => setScheduleDetails({ ...scheduleDetails, unidadeIntegracaoId: Number(e.target.value) })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-bold"
                                    >
                                        <option value="">Selecione...</option>
                                        {unidadesIntegracao?.map((f: any) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Unidade Ativ.</label>
                                    <select
                                        required
                                        value={scheduleDetails.unidadeAtividadeId}
                                        onChange={e => setScheduleDetails({ ...scheduleDetails, unidadeAtividadeId: Number(e.target.value) })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-bold"
                                    >
                                        <option value="">Selecione...</option>
                                        {unidadesIntegracao?.map((f: any) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data do ASO</label>
                                    <input
                                        type="date"
                                        required
                                        value={scheduleDetails.dataAso}
                                        onChange={e => setScheduleDetails({ ...scheduleDetails, dataAso: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm"
                                    />
                                </div>
                            </div>
                        </form>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-end space-x-3">
                            <button type="button" onClick={() => setIsScheduleModalOpen(false)} className="px-6 py-2.5 font-bold text-gray-400 hover:text-gray-600 transition-all">Cancelar</button>
                            <button onClick={handleBulkSchedule} className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">
                                Confirmar Agendamento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isHistoryOpen && selectedFuncionario && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Histórico de Integração</h2>
                                <p className="text-sm text-gray-500">{selectedFuncionario.nome}</p>
                            </div>
                            <button onClick={() => setIsHistoryOpen(false)} className="text-gray-400 hover:text-gray-600 outline-none"><X size={24} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4">
                            {historyData.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">Nenhum registro encontrado.</div>
                            ) : (
                                historyData.map((h, i) => (
                                    <div key={i} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center space-x-2">
                                                <div className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                                                    {h.tipo || 'Evento'}
                                                </div>
                                                <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${h.statusIntegracao?.includes('APROVADO') ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                    h.statusIntegracao === 'AGENDADA' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                                        h.statusIntegracao === 'REALIZADA' ? 'bg-emerald-100 text-emerald-700' :
                                                            h.statusIntegracao === 'FALTOU' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                                'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {h.statusIntegracao}
                                                </div>
                                            </div>
                                            <span className="text-xs text-gray-400">{new Date(h.data).toLocaleString('pt-BR')}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-gray-400 text-[10px] font-bold uppercase">Contrato / Unidade Int.</p>
                                                <p className="font-medium text-gray-800">{h.contratoNome || '-'} / {h.unidadeIntegracao || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 text-[10px] font-bold uppercase">Unidade Atividade</p>
                                                <p className="font-medium text-gray-800">{h.unidadeAtividade || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 text-[10px] font-bold uppercase">Função / Cargo</p>
                                                <p className="font-medium text-gray-800">{h.funcao || '-'} / {h.cargo || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 text-[10px] font-bold uppercase">Data de Integração</p>
                                                <p className="font-medium text-gray-800">
                                                    {h.dataIntegracao ? new Date(h.dataIntegracao).toLocaleDateString() : '-'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 text-[10px] font-bold uppercase">Validade Integração</p>
                                                <p className="font-medium text-emerald-600">
                                                    {h.dataValidadeIntegracao ? new Date(h.dataValidadeIntegracao).toLocaleDateString() : '-'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 text-[10px] font-bold uppercase">ASO / Validade</p>
                                                <p className="font-medium text-gray-800">
                                                    {h.dataAso ? new Date(h.dataAso).toLocaleDateString() : '-'}
                                                    {h.dataValidadeAso && <span className="text-emerald-600 text-xs ml-1">({new Date(h.dataValidadeAso).toLocaleDateString()})</span>}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">{editingFuncionario ? 'Editar Funcionário' : 'Novo Funcionário'}</h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 outline-none"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.nome}
                                    onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Contrato</label>
                                <select
                                    required
                                    value={formData.contratoId}
                                    onChange={e => setFormData({ ...formData, contratoId: e.target.value ? Number(e.target.value) : '' })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                                >
                                    <option value="">Selecione o contrato...</option>
                                    {contratos?.map(c => (
                                        <option key={c.id} value={c.id}>{c.nome} ({c.empresaNome})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button type="button" onClick={handleCloseModal} className="px-6 py-2.5 font-bold text-gray-400 hover:text-gray-600 transition-all">Cancelar</button>
                                <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                                    {editingFuncionario ? 'Salvar Alterações' : 'Cadastrar'}
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
