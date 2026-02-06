'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { documentoService, Documento } from '@/services/documentoService';
import { contratoService } from '@/services/contratoService';
import { Search, FileText, CheckCircle, XCircle, Clock, Filter, Download, Trash2, Check, X, Users, LayoutGrid, Plus, Upload, Loader2, AlertCircle } from 'lucide-react';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PermissionGuard } from '@/components/ui/PermissionGuard';
import { useNotify } from '@/components/ui/Notification';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Pagination } from '@/components/ui/Pagination';

const statusMap = {
    'AGUARDANDO': { label: 'Aguardando', icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-100' },
    'APROVADO': { label: 'Aprovado', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    'NAO_APROVADO': { label: 'Reprovado', icon: XCircle, color: 'text-red-600 bg-red-50 border-red-100' },
    'CORRIGIDO': { label: 'Corrigido', icon: CheckCircle, color: 'text-blue-600 bg-blue-50 border-blue-100' },
    'PENDENTE': { label: 'Pendente', icon: Clock, color: 'text-purple-600 bg-purple-50 border-purple-100' },
};

interface Aprovacao {
    id: number;
    perfilId: number;
    perfilNome: string;
    documentoId: number;
    obs: string;
    data: string;
    status: string;
}

interface HistoryModalProps {
    docId: number;
    titulo: string;
    onClose: () => void;
}

function HistoryModal({ docId, titulo, onClose }: HistoryModalProps) {
    const { data: aprovacoes, isLoading } = useQuery<Aprovacao[]>({
        queryKey: ['aprovacoes', docId],
        queryFn: async () => {
            const res = await api.get(`/documentos/${docId}/aprovacoes`);
            return res.data;
        }
    });

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 text-left">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                        <Clock className="text-indigo-600" size={24} />
                        <span>Histórico: {titulo}</span>
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                <div className="p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="animate-spin text-indigo-600" size={32} />
                        </div>
                    ) : aprovacoes && aprovacoes.length > 0 ? (
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            {aprovacoes.map((ap) => {
                                const apStatusInfo = statusMap[ap.status as keyof typeof statusMap] || statusMap['AGUARDANDO'];
                                return (
                                    <div key={ap.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 relative overflow-hidden group text-left">
                                        <div className="flex justify-between items-start relative z-10">
                                            <div className="text-left">
                                                <div className="font-bold text-gray-800 text-sm">{ap.perfilNome}</div>
                                                <div className="text-xs text-gray-400 mt-0.5">{ap.data}</div>
                                            </div>
                                            <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${apStatusInfo.color}`}>
                                                <apStatusInfo.icon size={10} />
                                                <span>{apStatusInfo.label}</span>
                                            </span>
                                        </div>
                                        {ap.obs && (
                                            <div className="mt-3 text-sm text-gray-600 bg-white/80 p-3 rounded-xl border border-gray-100/50 italic text-left">
                                                "{ap.obs}"
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center text-gray-400 py-12">
                            <AlertCircle size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="font-medium">Nenhuma movimentação registrada.</p>
                        </div>
                    )}
                    <button
                        onClick={onClose}
                        className="w-full mt-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all"
                    >
                        Fechar Histórico
                    </button>
                </div>
            </div>
        </div>
    );
}

function DocumentModal({ doc, isEmpresa, obs, setObs, onClose, onStatusUpdate, onJustificar, onCorrigir }: DocumentModalProps) {
    const statusInfo = statusMap[doc.status as keyof typeof statusMap] || statusMap['AGUARDANDO'];

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 text-left">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">
                        {isEmpresa ? 'Corrigir/Justificar' : 'Validar Documento'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>
                <div className="p-6 space-y-4 text-left">
                    <div className="bg-gray-50 p-4 rounded-2xl">
                        <div className="text-xs text-gray-400 font-bold uppercase mb-1">Documento</div>
                        <div className="font-bold text-gray-900">{doc.titulo}</div>
                        <div className="text-sm text-gray-500">{doc.empresaNome}</div>
                        <div className="mt-2">
                            <span className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${statusInfo.color}`}>
                                <statusInfo.icon size={14} />
                                <span>{statusInfo.label}</span>
                            </span>
                        </div>
                    </div>

                    {isEmpresa ? (
                        ['NAO_APROVADO', 'PENDENTE'].includes(doc.status) && (
                            <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 space-y-3">
                                <div className="flex items-center space-x-2 text-amber-800 font-bold text-sm">
                                    <AlertCircle size={18} />
                                    <span>Ação Necessária: Corrigir Documento</span>
                                </div>
                                <p className="text-xs text-amber-700 text-left">Você pode apenas justificar o motivo da reprovação ou reenviar o arquivo com uma observação.</p>

                                <textarea
                                    value={obs}
                                    onChange={e => setObs(e.target.value)}
                                    placeholder="Sua justificativa ou observação sobre a correção..."
                                    className="w-full px-3 py-2 text-sm bg-white border border-amber-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition-all min-h-[80px]"
                                />

                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => onJustificar()}
                                        disabled={!obs.trim()}
                                        className="px-4 py-2 bg-amber-100 text-amber-700 font-bold rounded-xl hover:bg-amber-200 transition-all text-xs disabled:opacity-50"
                                    >
                                        Somente Justificar
                                    </button>
                                    <label className="flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all text-xs cursor-pointer">
                                        <Upload size={14} />
                                        <span>Subir e Corrigir</span>
                                        <input type="file" className="hidden" onChange={(e) => onCorrigir(e.target.files?.[0])} />
                                    </label>
                                </div>
                            </div>
                        )
                    ) : (
                        // Validation Form for Internal Users
                        ['AGUARDANDO', 'CORRIGIDO', 'PENDENTE'].includes(doc.status) ? (
                            <>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        Observações / Justificativa {!obs.trim() ? <span className="text-red-500">(Obrigatória para reprovar)</span> : '(Opcional)'}
                                    </label>
                                    <textarea
                                        value={obs}
                                        onChange={e => setObs(e.target.value)}
                                        placeholder="Descreva o motivo da reprovação ou observações importantes..."
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all min-h-[100px]"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3 pt-4">
                                    <PermissionGuard permission="canApproveDocs">
                                        <button
                                            onClick={() => onStatusUpdate('NAO_APROVADO')}
                                            className="flex items-center justify-center space-x-2 px-6 py-4 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-all w-full"
                                        >
                                            <X size={20} />
                                            <span>Reprovar</span>
                                        </button>
                                    </PermissionGuard>
                                    <PermissionGuard permission="canApproveDocs">
                                        <button
                                            onClick={() => onStatusUpdate('APROVADO')}
                                            className="flex items-center justify-center space-x-2 px-6 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 w-full"
                                        >
                                            <Check size={20} />
                                            <span>Aprovar</span>
                                        </button>
                                    </PermissionGuard>
                                </div>
                            </>
                        ) : (
                            <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl flex flex-col items-center text-center space-y-3">
                                <AlertCircle size={40} className="text-blue-500 opacity-50" />
                                <div>
                                    <div className="font-bold text-blue-900">Documento em Processamento</div>
                                    <p className="text-sm text-blue-700">Este documento já possui o status <strong>{statusMap[doc.status as keyof typeof statusMap]?.label || doc.status}</strong>. Nenhuma ação é permitida até que a prestadora realize um novo envio.</p>
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}

function DocumentosList() {
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const funcionarioIdFilter = searchParams.get('funcionarioId');
    const funcionarioNomeFilter = searchParams.get('funcionarioNome');

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<Documento | null>(null);
    const [obs, setObs] = useState('');
    const [isAcessoriaModalOpen, setIsAcessoriaModalOpen] = useState(false);
    const [selectedAcessoriaContrato, setSelectedAcessoriaContrato] = useState<number | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [docToDelete, setDocToDelete] = useState<number | null>(null);

    const { notify } = useNotify();

    useEffect(() => {
        if (searchParams.get('openAcessoria') === 'true') {
            setIsAcessoriaModalOpen(true);
        }
    }, [searchParams]);

    const { data: userData } = useQuery({
        queryKey: ['me'],
        queryFn: async () => {
            const response = await api.get('/me');
            return response.data;
        }
    });

    const isEmpresa = userData?.type === 'empresa';

    const { data: documentsData, isLoading } = useQuery({
        queryKey: ['documentos', page, limit],
        queryFn: () => documentoService.getAll(page, limit),
        keepPreviousData: true
    });

    const documents = documentsData?.data || [];
    const totalPages = documentsData?.pages || 1;

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status, obs }: { id: number; status: string; obs: string }) =>
            documentoService.updateStatus(id, status, obs),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documentos'] });
            handleCloseModal();
            notify('success', 'Status Atualizado', 'O status do documento foi alterado com sucesso.');
        },
        onError: () => {
            notify('error', 'Erro na Atualização', 'Não foi possível atualizar o status do documento.');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => documentoService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documentos'] });
            notify('success', 'Documento Excluído', 'O registro foi removido do sistema.');
        },
        onError: () => {
            notify('error', 'Erro na Exclusão', 'Não foi possível excluir o documento.');
        }
    });

    const handleOpenModal = (doc: Documento) => {
        setSelectedDoc(doc);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedDoc(null);
        setObs('');
    };

    const handleStatusUpdate = (status: string) => {
        if (selectedDoc) {
            if (status === 'NAO_APROVADO' && !obs.trim()) {
                notify('warning', 'Justificativa Obrigatória', 'Por favor, informe o motivo da reprovação.');
                return;
            }
            updateStatusMutation.mutate({ id: selectedDoc.id, status, obs });
        }
    };

    const handleJustificar = () => {
        if (selectedDoc && obs.trim()) {
            documentoService.justificar(selectedDoc.id, obs).then(() => {
                queryClient.invalidateQueries({ queryKey: ['documentos'] });
                handleCloseModal();
            });
        }
    };

    const handleCorrigir = async (file?: File) => {
        if (selectedDoc && file) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('titulo', selectedDoc.titulo);
            formData.append('contratoId', selectedDoc.contratoId.toString());
            formData.append('empresaId', selectedDoc.empresaId.toString());
            formData.append('empresaNome', selectedDoc.empresaNome);
            formData.append('contratoNome', selectedDoc.contratoNome);
            formData.append('email', selectedDoc.email);
            formData.append('competencia', selectedDoc.competencia);
            if (obs) formData.append('obs', obs);

            await api.post('/documentos', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            queryClient.invalidateQueries({ queryKey: ['documentos'] });
            handleCloseModal();
        }
    };

    const handleDelete = (id: number) => {
        setDocToDelete(id);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (docToDelete) {
            deleteMutation.mutate(docToDelete);
            setDocToDelete(null);
        }
    };

    const filteredDocs = documents?.filter(doc => {
        const matchesSearch = doc.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.empresaNome.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || doc.status === statusFilter;
        const matchesFuncionario = !funcionarioIdFilter || doc.funcionarioId?.toString() === funcionarioIdFilter;
        return matchesSearch && matchesStatus && matchesFuncionario;
    });

    return (
        <div className="space-y-8 text-left">
            <header className="flex justify-between items-end text-left">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 border-none">Documentação</h1>
                    <p className="text-gray-500 mt-1">Monitore, valide e aprove documentos enviados pelas prestadoras.</p>
                </div>
                {isEmpresa && (
                    <button
                        onClick={() => setIsAcessoriaModalOpen(true)}
                        className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                        <LayoutGrid size={20} />
                        <span>Documentação Acessória</span>
                    </button>
                )}
            </header>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por título, empresa ou contrato..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm font-medium text-gray-700"
                >
                    <option value="ALL">Todos os Status</option>
                    <option value="AGUARDANDO">Aguardando Aprovação</option>
                    <option value="APROVADO">Aprovados</option>
                    <option value="NAO_APROVADO">Reprovados</option>
                    <option value="PENDENTE">Pendentes</option>
                </select>
            </div>

            {funcionarioNomeFilter && (
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center space-x-3 text-indigo-700">
                        <Users size={20} />
                        <span className="font-bold text-sm">Mostrando documentos de: <span className="underline">{funcionarioNomeFilter}</span></span>
                    </div>
                    <Link href="/documentos" className="text-xs font-black text-indigo-400 hover:text-indigo-600 uppercase tracking-widest">
                        Limpar Filtro
                    </Link>
                </div>
            )}

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 text-[10px] uppercase font-bold tracking-widest">
                            <th className="py-5 px-6">Documento</th>
                            <th className="py-5 px-6">Prestadora / Contrato</th>
                            <th className="py-5 px-6">Competência</th>
                            <th className="py-5 px-6 text-center">Status</th>
                            <th className="py-5 px-6 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={5} className="py-8 px-6"><div className="h-4 bg-gray-100 rounded w-full"></div></td>
                                </tr>
                            ))
                        ) : filteredDocs?.map((doc) => {
                            const statusInfo = statusMap[doc.status as keyof typeof statusMap] || statusMap['AGUARDANDO'];
                            return (
                                <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="py-5 px-6">
                                        <div className="flex items-center space-x-3 text-left">
                                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                                <FileText size={20} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900 leading-tight">{doc.titulo}</div>
                                                <div className="text-xs text-gray-400 mt-0.5">{doc.categoriaNome}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-5 px-6 text-left">
                                        <div className="font-semibold text-gray-800 text-sm">{doc.empresaNome}</div>
                                        <div className="text-xs text-gray-400">{doc.contratoNome}</div>
                                    </td>
                                    <td className="py-5 px-6 text-left">
                                        <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                                            {doc.competencia}
                                        </span>
                                    </td>
                                    <td className="py-5 px-6">
                                        <div className={`flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-full border text-xs font-bold leading-none ${statusInfo.color}`}>
                                            <statusInfo.icon size={14} />
                                            <span>{statusInfo.label}</span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-6">
                                        <div className="flex justify-end space-x-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedDoc(doc);
                                                    setIsHistoryModalOpen(true);
                                                }}
                                                className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                                title="Histórico de Aprovações"
                                            >
                                                <Clock size={18} />
                                            </button>
                                            <PermissionGuard permission={isEmpresa ? undefined : "canApproveDocs"}>
                                                <button
                                                    onClick={() => handleOpenModal(doc)}
                                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                    title={isEmpresa ? "Corrigir/Justificar" : "Validar"}
                                                >
                                                    {isEmpresa ? <Upload size={18} /> : <Check size={18} />}
                                                </button>
                                            </PermissionGuard>
                                            {!isEmpresa && (
                                                <PermissionGuard permission="canDeleteDocs">
                                                    <button
                                                        onClick={() => handleDelete(doc.id)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </PermissionGuard>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={documentsData?.total}
                itemsPerPage={limit}
                onPageChange={setPage}
                onItemsPerPageChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
            />

            {isModalOpen && selectedDoc && (
                <DocumentModal
                    doc={selectedDoc}
                    isEmpresa={isEmpresa}
                    obs={obs}
                    setObs={setObs}
                    onClose={handleCloseModal}
                    onStatusUpdate={handleStatusUpdate}
                    onJustificar={handleJustificar}
                    onCorrigir={handleCorrigir}
                />
            )}

            {isHistoryModalOpen && selectedDoc && (
                <HistoryModal
                    docId={selectedDoc.id}
                    titulo={selectedDoc.titulo}
                    onClose={() => {
                        setIsHistoryModalOpen(false);
                        setSelectedDoc(null);
                    }}
                />
            )}

            {isAcessoriaModalOpen && (
                <AcessoriaModal
                    onClose={() => setIsAcessoriaModalOpen(false)}
                    empresaId={userData?.data?.id}
                />
            )}

            <ConfirmationModal
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={confirmDelete}
                title="Excluir Documento"
                message="Esta ação é irreversível. O registro do documento e seu histórico serão removidos permanentemente."
                confirmLabel="Excluir Permanentemente"
                cancelLabel="Manter Registro"
                type="danger"
            />
        </div>
    );
}

function AcessoriaModal({ onClose, empresaId }: { onClose: () => void, empresaId: number }) {
    const [selectedContratoId, setSelectedContratoId] = useState<number | null>(null);
    const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const { data: contracts } = useQuery({
        queryKey: ['contratos', 'empresa', empresaId],
        queryFn: async () => {
            const resp = await contratoService.getAll(1, 1000); // Pegar todos os contratos para o select
            return resp.data.filter((c: any) => c.empresaId === empresaId);
        },
        enabled: !!empresaId
    });

    const { data: exigidos, isLoading: isLoadingExigidos } = useQuery({
        queryKey: ['contratos', selectedContratoId, 'exigidos'],
        queryFn: () => contratoService.getDocumentosExigidos(selectedContratoId!),
        enabled: !!selectedContratoId
    });

    const { data: allDocsResponse } = useQuery({
        queryKey: ['documentos'],
        queryFn: () => documentoService.getAll(1, 1000)
    });
    const allDocs = allDocsResponse?.data || [];

    const uploadMutation = useMutation({
        mutationFn: async ({ titulo, file, contratoId }: { titulo: string, file: File, contratoId: number }) => {
            const formData = new FormData();
            formData.append('titulo', titulo);
            formData.append('file', file);
            formData.append('contratoId', contratoId.toString());
            // Pegar dados extras do contrato
            const contrato = contracts?.find((c: any) => c.id === contratoId);
            formData.append('empresaId', empresaId.toString());
            formData.append('empresaNome', contrato?.empresaNome || '');
            formData.append('contratoNome', contrato?.nome || '');
            formData.append('categoriaId', contrato?.categoriaId?.toString() || '');
            formData.append('categoriaNome', contrato?.categoriaNome || '');
            formData.append('competencia', competencia);
            formData.append('email', 'portal@sistema.com');

            return api.post('/documentos', formData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documentos'] });
            setUploadingDoc(null);
        }
    });

    const handleFileUpload = (titulo: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && selectedContratoId) {
            setUploadingDoc(titulo);
            uploadMutation.mutate({ titulo, file, contratoId: selectedContratoId });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 leading-tight flex items-center">
                            <LayoutGrid className="mr-3 text-indigo-600" size={24} />
                            Documentação Acessória
                        </h2>
                        <p className="text-sm text-gray-500">Envie documentos conforme categoria do contrato e competência.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-all">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">1. Selecione o Contrato</label>
                            <select
                                value={selectedContratoId || ''}
                                onChange={e => setSelectedContratoId(Number(e.target.value))}
                                className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-700"
                            >
                                <option value="">Selecione um contrato...</option>
                                {contracts?.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.nome} - {c.categoriaNome || 'Sem Categoria'}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">2. Competência</label>
                            <input
                                type="month"
                                value={competencia}
                                onChange={e => setCompetencia(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-700"
                            />
                        </div>
                    </div>

                    {!selectedContratoId ? (
                        <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <LayoutGrid size={48} className="mx-auto mb-4 text-gray-200" />
                            <p className="text-gray-400 font-medium">Selecione um contrato para visualizar os documentos necessários.</p>
                        </div>
                    ) : isLoadingExigidos ? (
                        <div className="flex flex-col items-center py-20 space-y-4">
                            <Loader2 className="animate-spin text-indigo-600" size={40} />
                            <p className="text-gray-500 font-medium">Carregando exigências da categoria...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                            {exigidos?.length === 0 ? (
                                <div className="col-span-full text-center py-10">
                                    <AlertCircle className="mx-auto mb-2 text-amber-500" size={32} />
                                    <p className="text-gray-500">Este contrato não possui documentos exigidos para sua categoria.</p>
                                </div>
                            ) : exigidos?.map((docTitle: string) => {
                                const existDoc = (allDocs as any[]).find((d: any) =>
                                    d.titulo === docTitle &&
                                    d.contratoId === selectedContratoId
                                );
                                const isUploading = uploadingDoc === docTitle;

                                return (
                                    <div key={docTitle} className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-indigo-100 transition-all group flex flex-col justify-between relative overflow-hidden">
                                        {existDoc?.status === 'APROVADO' && (
                                            <div className="absolute -top-1 -right-1 p-1.5 bg-emerald-500 text-white rounded-bl-xl">
                                                <CheckCircle size={12} />
                                            </div>
                                        )}

                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 ${existDoc?.status === 'APROVADO' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>
                                                    <FileText size={20} />
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-bold text-gray-900 leading-tight">{docTitle}</div>
                                                    <div className="text-[10px] uppercase font-black tracking-widest text-gray-400 mt-0.5">Exigência Mensal</div>
                                                </div>
                                            </div>
                                            {existDoc && (
                                                <div className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${existDoc.status === 'APROVADO' ? 'bg-emerald-100 text-emerald-700' :
                                                    existDoc.status === 'NAO_APROVADO' || existDoc.status === 'REPROVADO' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {existDoc.status}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <label className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${isUploading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                                                existDoc?.status === 'APROVADO' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'
                                                }`}>
                                                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                                <span>{isUploading ? 'Enviando...' : existDoc ? 'Substituir' : 'Enviar'}</span>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    disabled={isUploading}
                                                    onChange={e => handleFileUpload(docTitle, e)}
                                                />
                                            </label>

                                            {existDoc?.uploaded && (
                                                <button
                                                    onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/documentos/${existDoc.id}/download`, '_blank')}
                                                    className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:text-indigo-600 hover:bg-indigo-100 transition-all border border-gray-100"
                                                    title="Baixar arquivo atual"
                                                >
                                                    <Download size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-between items-center">
                    <div className="flex items-center space-x-2 text-gray-500">
                        <AlertCircle size={16} className="text-amber-500" />
                        <span className="text-xs font-medium">Selecione o ano/mês correto antes de realizar o upload.</span>
                    </div>
                    <button onClick={onClose} className="px-8 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-2xl hover:bg-gray-100 transition-all shadow-sm">
                        Fechar Painel
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function DocumentosPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center animate-pulse text-gray-400 font-bold uppercase tracking-widest">Carregando Módulo de Documentação...</div>}>
            <DocumentosList />
        </Suspense>
    );
}
