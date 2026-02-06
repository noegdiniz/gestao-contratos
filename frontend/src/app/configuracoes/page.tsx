'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configuracaoService, Configuracao } from '@/services/configuracaoService';
import { Settings, Save, Clock, Calendar, Building2, Globe, ImageIcon, Check, Upload } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNotify } from '@/components/ui/Notification';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

const DIAS_SEMANA = [
    { sigla: 'SEG', label: 'Segunda-feira' },
    { sigla: 'TER', label: 'Terça-feira' },
    { sigla: 'QUA', label: 'Quarta-feira' },
    { sigla: 'QUI', label: 'Quinta-feira' },
    { sigla: 'SEX', label: 'Sexta-feira' },
    { sigla: 'SAB', label: 'Sábado' },
    { sigla: 'DOM', label: 'Domingo' },
];

export default function ConfiguracoesPage() {
    const queryClient = useQueryClient();
    const [form, setForm] = useState<Partial<Configuracao>>({});
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
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

    const { data: config, isLoading } = useQuery({
        queryKey: ['configuracao'],
        queryFn: configuracaoService.get,
    });

    useEffect(() => {
        if (config) {
            setForm(config);
            setSelectedDays(config.diasSemanaAgenda ? config.diasSemanaAgenda.split(',') : []);
        }
    }, [config]);

    const updateMutation = useMutation({
        mutationFn: (data: Partial<Configuracao>) => configuracaoService.update(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['configuracao'] });
            notify('success', 'Configurações Salvas', 'As regras globais foram atualizadas com sucesso.');
        },
        onError: () => notify('error', 'Erro ao Salvar', 'Não foi possível atualizar as configurações.')
    });

    const toggleDay = (sigla: string) => {
        if (selectedDays.includes(sigla)) {
            setSelectedDays(selectedDays.filter(d => d !== sigla));
        } else {
            if (selectedDays.length >= 2) {
                notify('warning', 'Limite de Dias', 'Você deve selecionar exatamente dois dias da semana para a agenda.');
                return;
            }
            setSelectedDays([...selectedDays, sigla]);
        }
    };

    const handleSave = () => {
        if (selectedDays.length !== 2) {
            notify('error', 'Configuração Inválida', 'Por favor, selecione exatamente dois dias da semana para prosseguir.');
            return;
        }

        requestConfirm(
            'Salvar Alterações Globais',
            'Você está prestes a alterar regras que afetam todos os contratos e empresas. Deseja aplicar estas mudanças agora?',
            () => updateMutation.mutate({
                ...form,
                diasSemanaAgenda: selectedDays.join(',')
            }),
            'warning'
        );
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setForm({ ...form, logoImage: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    if (isLoading) return <div className="p-8">Carregando...</div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex justify-between items-center bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center space-x-3">
                        <Settings className="text-indigo-600" size={32} />
                        <span>Configurações do Sistema</span>
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium">Gerencie as regras globais e a identidade do sistema</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    className="flex items-center space-x-2 px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                >
                    <Save size={20} />
                    <span>{updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 font-medium">
                {/* Prazos Gerais */}
                <section className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                        <Clock className="text-indigo-600" size={24} />
                        <span>Prazos e Validades</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Prazo ASO Geral (Dias)</label>
                            <input
                                type="number"
                                value={form.prazoAsoGeral || ''}
                                onChange={e => setForm({ ...form, prazoAsoGeral: parseInt(e.target.value) })}
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Prazo Integração Geral (Dias)</label>
                            <input
                                type="number"
                                value={form.prazoIntegracaoGeral || ''}
                                onChange={e => setForm({ ...form, prazoIntegracaoGeral: parseInt(e.target.value) })}
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Dias para Confirmar Presença (X)</label>
                            <input
                                type="number"
                                value={form.diasParaConfirmarPresenca || ''}
                                onChange={e => setForm({ ...form, diasParaConfirmarPresenca: parseInt(e.target.value) })}
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            />
                            <p className="text-[10px] text-gray-400">Após este prazo, agendamentos sem confirmação viram "FALTOU"</p>
                        </div>
                    </div>
                </section>

                {/* Agenda de Integração */}
                <section className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                        <Calendar className="text-indigo-600" size={24} />
                        <span>Agenda de Integração</span>
                    </h2>
                    <p className="text-sm text-gray-500 italic">Selecione exatamente os 2 dias da semana permitidos para agendamento pelas prestadoras.</p>
                    <div className="flex flex-wrap gap-2">
                        {DIAS_SEMANA.map(dia => {
                            const isSelected = selectedDays.includes(dia.sigla);
                            return (
                                <button
                                    key={dia.sigla}
                                    onClick={() => toggleDay(dia.sigla)}
                                    className={`px-4 py-3 rounded-xl font-bold text-xs transition-all border ${isSelected
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                        : 'bg-white text-gray-600 border-gray-100 hover:border-indigo-200 hover:bg-indigo-50'
                                        }`}
                                >
                                    {dia.label}
                                </button>
                            );
                        })}
                    </div>
                    {selectedDays.length !== 2 && (
                        <p className="text-xs text-red-500 font-bold">Atenção: Selecione exatamente 2 dias.</p>
                    )}
                </section>

                {/* Identidade Visual */}
                <section className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                        <Building2 className="text-indigo-600" size={24} />
                        <span>Identidade Visual</span>
                    </h2>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Nome da Empresa</label>
                            <input
                                type="text"
                                value={form.nomeEmpresa || ''}
                                onChange={e => setForm({ ...form, nomeEmpresa: e.target.value })}
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            />
                        </div>
                        <div className="space-y-4">
                            <label className="text-sm font-bold text-gray-700 flex items-center space-x-2">
                                <ImageIcon size={18} />
                                <span>Logo do Sistema</span>
                            </label>
                            <div className="flex items-center space-x-6">
                                <div className="h-24 w-24 rounded-2xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                                    {form.logoImage ? (
                                        <img src={form.logoImage} alt="Logo preview" className="h-full w-full object-contain" />
                                    ) : (
                                        <ImageIcon className="text-gray-300" size={32} />
                                    )}
                                </div>
                                <label className="flex items-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all cursor-pointer text-sm">
                                    <Upload size={18} />
                                    <span>Alterar Logo</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                </label>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Segurança e Domínio */}
                <section className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                        <Globe className="text-indigo-600" size={24} />
                        <span>Segurança e Acesso</span>
                    </h2>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 italic">Domínio de Login Interno (Google)</label>
                            <input
                                type="text"
                                placeholder="@seudominio.com"
                                value={form.dominioInterno || ''}
                                onChange={e => setForm({ ...form, dominioInterno: e.target.value })}
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            />
                            <p className="text-[10px] text-gray-400">Apenas usuários com este domínio poderão logar via Google.</p>
                        </div>
                    </div>
                </section>
            </div>

            <ConfirmationModal
                {...confirmModal}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
            />
        </div>
    );
}
