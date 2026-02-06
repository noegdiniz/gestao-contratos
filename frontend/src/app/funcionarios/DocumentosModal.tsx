'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { funcionarioService, AnexoFuncionario, DocumentoExigidoFuncionario } from '@/services/funcionarioService';
import { configuracaoService } from '@/services/configuracaoService';
import api from '@/lib/api';
import { X, FileText, CheckCircle, XCircle, Clock, Download, Upload, Check, AlertCircle, ShieldCheck, Calendar, UserCheck, Timer, Printer } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNotify } from '@/components/ui/Notification';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

interface Props {
    funcionario: {
        id: number;
        nome: string;
        contratoId?: number;
        contratoNome?: string;
        integracaoAprovadaManualmente?: boolean;
        statusIntegracao?: string;
        dataIntegracao?: string;
        dataAso?: string;
        dataValidadeAso?: string;
    };
    onClose: () => void;
    isCompany: boolean;
}

const statusMap = {
    'AGUARDANDO': { label: 'Aguardando', icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-100' },
    'PENDENTE': { label: 'Pendente', icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-100' },
    'CORRIGIDO': { label: 'Corrigido', icon: Clock, color: 'text-blue-600 bg-blue-50 border-blue-100' },
    'APROVADO': { label: 'Aprovado', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    'REPROVADO': { label: 'Reprovado', icon: XCircle, color: 'text-red-600 bg-red-50 border-red-100' },
    'AGUARDANDO_APROVACAO': { label: 'Aguardando Aprovação', icon: Clock, color: 'text-amber-500 bg-amber-50 border-amber-100' },
    'AGENDADA': { label: 'Agendada', icon: Calendar, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    'REALIZADA': { label: 'Realizada', icon: UserCheck, color: 'text-emerald-700 bg-emerald-100 border-emerald-200' },
    'FALTOU': { label: 'Faltou', icon: XCircle, color: 'text-gray-600 bg-gray-100 border-gray-200' },
};

interface HistoryModalProps {
    tipo: string;
    anexoId: number;
    onClose: () => void;
}

function HistoryModal({ tipo, anexoId, onClose }: HistoryModalProps) {
    const { data: history, isLoading } = useQuery({
        queryKey: ['anexo-history', anexoId],
        queryFn: async () => {
            const response = await api.get(`/funcionarios/documentos/${anexoId}/aprovacoes`);
            return response.data;
        }
    });

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4 text-left">
            <div className="bg-white rounded-[2rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="flex justify-between items-center p-8 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 flex items-center space-x-3">
                            <Clock className="text-indigo-600" size={24} />
                            <span className="uppercase tracking-tight">Histórico Detalhado</span>
                        </h2>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{tipo}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 max-h-[60vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-50 rounded-2xl animate-pulse"></div>)}
                        </div>
                    ) : history && history.length > 0 ? (
                        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-indigo-100 before:via-indigo-50 before:to-transparent">
                            {history.map((item: any, idx: number) => {
                                const statusInfo = statusMap[item.status as keyof typeof statusMap] || statusMap['AGUARDANDO'];
                                return (
                                    <div key={item.id} className="relative flex items-start space-x-6 group animate-in slide-in-from-left duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
                                        <div className={`mt-1.5 w-10 h-10 rounded-xl border-4 border-white shadow-sm flex items-center justify-center shrink-0 z-10 ${statusInfo.color}`}>
                                            <statusInfo.icon size={16} />
                                        </div>
                                        <div className="flex-1 bg-gray-50/50 p-5 rounded-2xl border border-gray-100 group-hover:border-indigo-100 group-hover:bg-white transition-all">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{item.perfilNome}</span>
                                                    <h4 className="text-sm font-black text-gray-900 mt-0.5">{statusInfo.label}</h4>
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-400 tabular-nums">
                                                    {new Date(item.createdAt).toLocaleString('pt-BR')}
                                                </span>
                                            </div>
                                            {item.obs && (
                                                <div className="mt-2 p-3 bg-white rounded-xl border border-gray-100 text-xs text-gray-600 font-medium italic relative">
                                                    <span className="absolute -left-1 top-2 w-0.5 h-4 bg-indigo-200"></span>
                                                    "{item.obs}"
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center text-gray-400 py-12">
                            <AlertCircle size={48} className="mx-auto mb-4 opacity-10" />
                            <p className="font-bold uppercase tracking-widest text-sm">Sem histórico detalhado.</p>
                            <p className="text-xs mt-1">Este documento ainda não possui logs de validação.</p>
                        </div>
                    )}
                </div>

                <div className="p-8 bg-gray-50/50 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-white text-gray-900 font-black uppercase tracking-widest text-xs border border-gray-200 rounded-2xl hover:bg-gray-100 hover:border-gray-300 transition-all shadow-sm"
                    >
                        Fechar Visualização
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function DocumentosModal({ funcionario, onClose, isCompany }: Props) {
    const queryClient = useQueryClient();
    const [selectedAnexo, setSelectedAnexo] = useState<AnexoFuncionario | null>(null);
    const [historyAnexo, setHistoryAnexo] = useState<AnexoFuncionario | null>(null);
    const [obs, setObs] = useState('');

    // Approval Card States
    const [dataAso, setDataAso] = useState('');
    const [prazoAso, setPrazoAso] = useState(365);
    const [prazoIntegracao, setPrazoIntegracao] = useState(365);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'danger' as 'danger' | 'warning' | 'info'
    });

    const { notify } = useNotify();

    const { data: userData } = useQuery({
        queryKey: ['me'],
        queryFn: async () => {
            const response = await api.get('/me');
            return response.data;
        },
    });

    const { data: config } = useQuery({
        queryKey: ['configuracao'],
        queryFn: configuracaoService.get,
    });

    useEffect(() => {
        if (config) {
            setPrazoAso(config.prazoAsoGeral);
            setPrazoIntegracao(config.prazoIntegracaoGeral);
        }
    }, [config]);

    const { data: exigidos, isLoading: loadingExigidos } = useQuery({
        queryKey: ['documentos-exigidos-funcionario', funcionario.contratoId],
        queryFn: () => funcionarioService.getExigidos(funcionario.contratoId),
    });

    const { data: anexos, isLoading: loadingAnexos } = useQuery({
        queryKey: ['funcionarios', funcionario.id, 'documentos'],
        queryFn: () => funcionarioService.getAnexos(funcionario.id),
    });

    const uploadMutation = useMutation({
        mutationFn: ({ tipo, file }: { tipo: string; file: File }) =>
            funcionarioService.uploadAnexo(funcionario.id, tipo, file),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['funcionarios', funcionario.id, 'documentos'] });
            notify('success', 'Documento Enviado', `O documento ${data.tipo} foi enviado com sucesso para análise.`);
        },
        onError: () => {
            notify('error', 'Erro no Envio', 'Não foi possível enviar o documento. Tente novamente.');
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status, observacao }: { id: number; status: string; observacao: string }) =>
            funcionarioService.updateAnexoStatus(id, status, observacao),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['funcionarios', funcionario.id, 'documentos'] });
            setSelectedAnexo(null);
            setObs('');
            const isApproved = data.status === 'APROVADO';
            notify(isApproved ? 'success' : 'warning', `Documento ${isApproved ? 'Aprovado' : 'Reprovado'}`, `A validação do documento ${data.tipo} foi processada.`);
        },
    });

    const approvalMutation = useMutation({
        mutationFn: () => funcionarioService.aprovarIntegracaoManual(funcionario.id, {
            dataAso,
            prazoAsoDias: prazoAso,
            prazoIntegracaoDias: prazoIntegracao
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
            queryClient.invalidateQueries({ queryKey: ['funcionarios', funcionario.id, 'documentos'] });
            notify('success', 'Integração Agendada', `A integração de ${funcionario.nome} foi agendada e os prazos definidos.`);
        }
    });

    const confirmPresenceMutation = useMutation({
        mutationFn: () => funcionarioService.confirmarPresenca(funcionario.id, {
            dataAso,
            prazoAsoDias: prazoAso,
            prazoIntegracaoDias: prazoIntegracao
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
            queryClient.invalidateQueries({ queryKey: ['funcionarios', funcionario.id, 'documentos'] });
            notify('success', 'Presença Confirmada', 'A presença do colaborador foi registrada com sucesso.');
        }
    });

    const requestConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'danger') => {
        setConfirmModal({ isOpen: true, title, message, onConfirm, type });
    };

    const handleFileUpload = (tipo: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadMutation.mutate({ tipo, file });
        }
    };

    const handleDownload = (anexoId: number) => {
        window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/funcionarios/documentos/${anexoId}/download`, '_blank');
    };

    const handleExportPdf = async () => {
        try {
            const blob = await funcionarioService.getHistoricoPdf(funcionario.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `historico_${funcionario.nome.replace(/\s+/g, '_')}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
            notify('success', 'Download Iniciado', 'O relatório histórico foi gerado.');
        } catch (error) {
            notify('error', 'Erro no Download', 'Não foi possível gerar o relatório.');
        }
    };

    const isAllSent = exigidos?.every(req => anexos?.some(a => a.tipo === req.nome));

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-medium">
            <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Fluxo de Integração</h2>
                        <div className="flex items-center space-x-2 mt-1">
                            <span className="text-gray-500 text-sm">{funcionario.nome}</span>
                            <span className="text-gray-300">•</span>
                            <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${statusMap[funcionario.statusIntegracao as keyof typeof statusMap]?.color || 'bg-gray-50'}`}>
                                <span>{statusMap[funcionario.statusIntegracao as keyof typeof statusMap]?.label || funcionario.statusIntegracao}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handleExportPdf}
                            className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800 p-2 rounded-xl transition-all mr-2"
                            title="Exportar Histórico PDF"
                        >
                            <Printer size={20} />
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-all">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Status Global and Actions */}
                    {!isCompany && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Card de Aprovação (Para o Gestor aprovar o agendamento da prestadora) */}
                            {funcionario.statusIntegracao === 'AGUARDANDO_APROVACAO' && (
                                <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl space-y-4 shadow-sm">
                                    <h3 className="text-indigo-900 font-bold flex items-center space-x-2">
                                        <ShieldCheck size={20} />
                                        <span>Aprovar Integração</span>
                                    </h3>
                                    <p className="text-xs text-indigo-700 font-medium">A prestadora solicitou integração para {funcionario.dataIntegracao ? new Date(funcionario.dataIntegracao).toLocaleDateString() : 'data não especificada'}. Defina os dados do ASO para confirmar.</p>

                                    <div className="bg-white/50 p-4 rounded-2xl space-y-2 border border-indigo-50">
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-indigo-600 font-bold uppercase tracking-wider">Data do ASO</span>
                                            <span className="font-bold text-indigo-900">{funcionario.dataAso ? new Date(funcionario.dataAso).toLocaleDateString() : 'Não informada'}</span>
                                        </div>
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-indigo-600 font-bold uppercase tracking-wider">Agendado para</span>
                                            <span className="font-bold text-indigo-900">{funcionario.dataIntegracao ? new Date(funcionario.dataIntegracao).toLocaleDateString() : '-'}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => requestConfirm(
                                            'Aprovar Integração',
                                            `Deseja confirmar o agendamento de integração para ${funcionario.nome}?`,
                                            () => approvalMutation.mutate(),
                                            'info'
                                        )}
                                        className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-emerald-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100"
                                    >
                                        <ShieldCheck size={18} />
                                        <span>Confirmar Agendamento</span>
                                    </button>
                                </div>
                            )}

                            {/* Card de Presença (Para o Aprovador de Integração confirmar que o aluno apareceu) */}
                            {funcionario.statusIntegracao === 'AGENDADA' && userData?.data?.isIntegrationApprover && (
                                <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl space-y-4 shadow-sm">
                                    <h3 className="text-emerald-900 font-bold flex items-center space-x-2">
                                        <UserCheck size={20} />
                                        <span>Confirmar Presença</span>
                                    </h3>
                                    <p className="text-xs text-emerald-700 font-medium">A integração está agendada. Confirme que o funcionário compareceu para validá-la.</p>

                                    <div className="bg-white/50 p-4 rounded-2xl space-y-2 border border-emerald-50">
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-emerald-600 font-bold uppercase tracking-wider">Data do ASO</span>
                                            <span className="font-bold text-emerald-900">{funcionario.dataAso ? new Date(funcionario.dataAso).toLocaleDateString() : 'Não informada'}</span>
                                        </div>
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-emerald-600 font-bold uppercase tracking-wider">Data Integração</span>
                                            <span className="font-bold text-emerald-900">{funcionario.dataIntegracao ? new Date(funcionario.dataIntegracao).toLocaleDateString() : '-'}</span>
                                        </div>
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-emerald-600 font-bold uppercase tracking-wider">Confirmação Expira em</span>
                                            <span className="font-bold text-emerald-900">{config?.diasParaConfirmarPresenca || 0} dias</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => requestConfirm(
                                            'Confirmar Presença',
                                            `Confirma que ${funcionario.nome} compareceu à integração?`,
                                            () => confirmPresenceMutation.mutate(),
                                            'info'
                                        )}
                                        className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all text-sm disabled:opacity-50"
                                    >
                                        {confirmPresenceMutation.isPending ? 'Confirmando...' : 'Confirmar Presença'}
                                    </button>
                                </div>
                            )}

                            {/* Informativo Faltou */}
                            {funcionario.statusIntegracao === 'FALTOU' && (
                                <div className="bg-red-50 border border-red-100 p-6 rounded-3xl space-y-4 shadow-sm md:col-span-2">
                                    <div className="flex items-center space-x-3 text-red-700">
                                        <AlertCircle size={24} />
                                        <div>
                                            <h3 className="font-bold tracking-tight">Integração Expirada (FALTOU)</h3>
                                            <p className="text-xs font-medium mt-1">O prazo para confirmação de presença expirou. A prestadora deve realizar um novo agendamento.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Document List */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center space-x-2">
                            <FileText size={16} />
                            <span>Documentação Exigida</span>
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                            {loadingExigidos || loadingAnexos ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="h-20 bg-gray-50 rounded-2xl animate-pulse"></div>
                                ))
                            ) : (
                                exigidos?.map((req) => {
                                    const anexo = anexos?.find(a => a.tipo === req.nome);
                                    const statusInfo = anexo ? (statusMap[anexo.status as keyof typeof statusMap] || statusMap['AGUARDANDO']) : null;

                                    return (
                                        <div key={req.id} className="bg-gray-50/50 border border-gray-100 rounded-2xl p-4 flex items-center justify-between group hover:border-indigo-100 hover:bg-white transition-all shadow-sm">
                                            <div className="flex items-center space-x-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 ${anexo ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-gray-100 border-dashed border-gray-200 text-gray-400'}`}>
                                                    <FileText size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 text-sm">{req.nome}</div>
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center mt-1">
                                                        {anexo ? (
                                                            <>
                                                                <CheckCircle size={10} className="mr-1 text-emerald-500" />
                                                                <span>Enviado em {new Date(anexo.uploadDate).toLocaleDateString()}</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <AlertCircle size={10} className="mr-1" />
                                                                <span>Pendente</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-3">
                                                {anexo && statusInfo && (
                                                    <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${statusInfo.color}`}>
                                                        <statusInfo.icon size={10} />
                                                        <span>{statusInfo.label}</span>
                                                    </div>
                                                )}

                                                <div className="flex items-center bg-white p-1 rounded-xl border border-gray-100 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {(!anexo || ['REPROVADO', 'NAO_APROVADO'].includes(anexo.status)) && isCompany ? (
                                                        <label className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer flex items-center space-x-2">
                                                            <Upload size={16} />
                                                            <span className="text-[10px] font-black uppercase tracking-widest px-1">{anexo ? 'Corrigir' : 'Upload'}</span>
                                                            <input type="file" className="hidden" onChange={(e) => handleFileUpload(req.nome, e)} />
                                                        </label>
                                                    ) : anexo && (
                                                        <>
                                                            <button
                                                                onClick={() => setHistoryAnexo(anexo)}
                                                                className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                                                title="Histórico"
                                                            >
                                                                <Clock size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDownload(anexo.id)}
                                                                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                                title="Download"
                                                            >
                                                                <Download size={16} />
                                                            </button>
                                                            {!isCompany && (
                                                                <button
                                                                    onClick={() => setSelectedAnexo(anexo)}
                                                                    className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                                                    title="Validar"
                                                                >
                                                                    <Check size={16} />
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {selectedAnexo && (
                    <div className="p-6 border-t border-gray-100 bg-gray-50/50 animate-in slide-in-from-bottom duration-300 shrink-0">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-900 border-none">Validar: {selectedAnexo.tipo}</h3>
                            <button onClick={() => setSelectedAnexo(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>

                        {['AGUARDANDO', 'CORRIGIDO', 'PENDENTE'].includes(selectedAnexo.status) ? (
                            !isCompany ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-sm font-bold text-gray-700">Justificativa</label>
                                        {!obs.trim() && <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Obrigatória para reprovar</span>}
                                    </div>
                                    <textarea
                                        placeholder="Descreva o motivo da reprovação..."
                                        value={obs}
                                        onChange={(e) => setObs(e.target.value)}
                                        className="w-full p-4 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all min-h-[100px] text-sm font-bold"
                                    />
                                    <div className="flex justify-end space-x-3">
                                        <button
                                            onClick={() => {
                                                if (!obs.trim()) {
                                                    notify('error', 'Justificativa Obrigatória', 'Por favor, informe o motivo da reprovação antes de continuar.');
                                                    return;
                                                }
                                                requestConfirm(
                                                    'Reprovar Documento',
                                                    `Você tem certeza que deseja reprovar o documento ${selectedAnexo.tipo}? Esta ação exigirá que a prestadora envie um novo arquivo.`,
                                                    () => updateStatusMutation.mutate({ id: selectedAnexo.id, status: 'REPROVADO', observacao: obs }),
                                                    'danger'
                                                );
                                            }}
                                            className="px-4 py-2 bg-rose-100 text-rose-700 font-bold rounded-xl hover:bg-rose-200 transition-all text-xs"
                                        >
                                            Reprovar
                                        </button>
                                        <button
                                            onClick={() => requestConfirm(
                                                'Aprovar Documento',
                                                `Deseja confirmar a aprovação imediata do documento ${selectedAnexo.tipo}?`,
                                                () => updateStatusMutation.mutate({ id: selectedAnexo.id, status: 'APROVADO', observacao: obs }),
                                                'info'
                                            )}
                                            className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all text-xs shadow-lg shadow-emerald-100"
                                        >
                                            Aprovar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 space-y-3 font-bold">
                                    <div className="flex items-center space-x-2 text-amber-800 font-bold text-sm">
                                        <AlertCircle size={18} />
                                        <span>Ação Necessária: Corrigir Documento</span>
                                    </div>
                                    <p className="text-xs text-amber-700 text-left">Você pode apenas justificar o motivo da reprovação ou reenviar o arquivo com uma observação.</p>
                                    <textarea
                                        placeholder="Sua justificativa ou observação sobre a correção..."
                                        value={obs}
                                        onChange={(e) => setObs(e.target.value)}
                                        className="w-full p-3 bg-white border border-amber-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition-all text-sm min-h-[80px] font-bold"
                                    />
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => {
                                                if (!obs.trim()) return;
                                                funcionarioService.justificarAnexo(selectedAnexo.id, obs).then(() => {
                                                    queryClient.invalidateQueries({ queryKey: ['funcionarios', funcionario.id, 'documentos'] });
                                                    setSelectedAnexo(null);
                                                    setObs('');
                                                });
                                            }}
                                            disabled={!obs.trim()}
                                            className="flex-1 px-4 py-2 bg-amber-100 text-amber-700 font-bold rounded-xl hover:bg-amber-200 transition-all text-xs disabled:opacity-50"
                                        >
                                            Somente Justificar
                                        </button>
                                        <label className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all text-xs cursor-pointer">
                                            <Upload size={14} />
                                            <span>Subir e Corrigir</span>
                                            <input type="file" className="hidden" onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    funcionarioService.uploadAnexo(funcionario.id, selectedAnexo.tipo, file, obs).then(() => {
                                                        queryClient.invalidateQueries({ queryKey: ['funcionarios', funcionario.id, 'documentos'] });
                                                        setSelectedAnexo(null);
                                                        setObs('');
                                                    });
                                                }
                                            }} />
                                        </label>
                                    </div>
                                </div>
                            )
                        ) : (
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center space-x-3 text-blue-800">
                                <AlertCircle size={20} className="text-blue-500" />
                                <span className="text-xs font-bold">Documento em status {statusMap[selectedAnexo.status as keyof typeof statusMap]?.label || selectedAnexo.status}. Nenhuma ação necessária.</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer for Company to Finalize */}
                {isCompany && (
                    <div className="p-6 border-t border-gray-100 bg-white flex justify-end shrink-0 items-center space-x-4">
                        <button
                            onClick={onClose}
                            disabled={!isAllSent}
                            className={`flex items-center space-x-2 px-8 py-3 rounded-2xl font-bold transition-all shadow-lg ${isAllSent
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                                }`}
                        >
                            <Check size={20} />
                            <span>Finalizar Envio</span>
                        </button>
                    </div>
                )}
            </div>

            {historyAnexo && (
                <HistoryModal
                    tipo={historyAnexo.tipo}
                    anexoId={historyAnexo.id}
                    onClose={() => setHistoryAnexo(null)}
                />
            )}

            <ConfirmationModal
                {...confirmModal}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
            />
        </div>
    );
}
