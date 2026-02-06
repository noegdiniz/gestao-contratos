'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { empresaService } from '@/services/empresaService';
import { configService } from '@/services/configService';
import {
    FileText,
    Download,
    X,
    Loader2,
    LayoutGrid,
    ShieldCheck,
    ExternalLink,
    Search,
    GripVertical,
    Calendar,
    Trash2,
    Database,
    Table as TableIcon,
    PieChart,
    Save,
    FolderOpen,
    Edit2,
    Check
} from 'lucide-react';
import { useNotify } from '@/components/ui/Notification';

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
    horizontalListSortingStrategy,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Field Catalog ---

const FIELD_CATALOG = [
    { id: 'Funcionário', category: 'Integração', type: 'text' },
    { id: 'Status Integração', category: 'Integração', type: 'status' },
    { id: 'Data Integração', category: 'Integração', type: 'date' },
    { id: 'Unidade Integração', category: 'Integração', type: 'text' },
    { id: 'Unidade Atividade', category: 'Integração', type: 'text' },
    { id: 'Função', category: 'Integração', type: 'text' },
    { id: 'Cargo', category: 'Integração', type: 'text' },
    { id: 'Setor', category: 'Integração', type: 'text' },
    { id: 'Status Contratual', category: 'Integração', type: 'status' },
    { id: 'Data ASO', category: 'Integração', type: 'date' },
    { id: 'Validade ASO', category: 'Integração', type: 'date' },
    { id: 'Validade Integração', category: 'Integração', type: 'date' },
    { id: 'Dias Restantes ASO', category: 'Integração', type: 'number' },
    { id: 'Dias Restantes Integração', category: 'Integração', type: 'number' },
    { id: 'Empresa', category: 'Empresa', type: 'text' },
    { id: 'CNPJ Empresa', category: 'Empresa', type: 'text' },
    { id: 'Departamento', category: 'Empresa', type: 'text' },
    { id: 'Status Empresa', category: 'Empresa', type: 'status' },
    { id: 'Contrato', category: 'Contrato', type: 'text' },
    { id: 'Início Contrato', category: 'Contrato', type: 'date' },
    { id: 'Fim Contrato', category: 'Contrato', type: 'date' },
    { id: 'Status Contrato', category: 'Contrato', type: 'status' },
    { id: 'Categoria Contrato', category: 'Contrato', type: 'text' },
    { id: 'Título do Documento', category: 'Documentação', type: 'text' },
    { id: 'Categoria do Documento', category: 'Documentação', type: 'text' },
    { id: 'Competência', category: 'Documentação', type: 'text' },
    { id: 'Status do Documento', category: 'Documentação', type: 'status' },
    { id: 'Email Responsável', category: 'Documentação', type: 'text' },
    { id: 'Data Documento', category: 'Documentação', type: 'date' },
    { id: 'Data Criação Doc', category: 'Documentação', type: 'date' },
];

// --- DnD Components ---

function ColumnCard({
    id,
    onRemove,
    filter,
    onFilterChange,
    isDragging,
    isOverlay,
    listeners,
    attributes
}: {
    id: string,
    onRemove?: () => void,
    filter?: { operator: string, value: string },
    onFilterChange?: (filter: { operator: string, value: string } | null) => void,
    isDragging?: boolean,
    isOverlay?: boolean,
    listeners?: any,
    attributes?: any
}) {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    return (
        <div
            className={`flex items-center justify-between bg-white border p-3 rounded-xl shadow-sm group relative transition-all duration-200 
                ${isDragging ? 'opacity-30 border-gray-100' : 'opacity-100 border-gray-100'} 
                ${isOverlay ? 'shadow-2xl ring-2 ring-indigo-500 scale-105 cursor-grabbing z-[1000] border-indigo-200' : 'hover:shadow-md hover:border-gray-200'}`}
        >
            <div className="flex items-center space-x-3 overflow-hidden">
                <button
                    {...attributes}
                    {...listeners}
                    className={`text-gray-300 hover:text-gray-500 shrink-0 ${isOverlay ? 'cursor-grabbing' : 'cursor-grab active:cursor-grabbing'}`}
                >
                    <GripVertical size={16} />
                </button>
                <span className="text-sm font-bold text-gray-700 truncate">{id}</span>
                {filter?.value && (
                    <div className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase truncate max-w-[80px]">
                        {filter.operator}: {filter.value}
                    </div>
                )}
            </div>

            <div className="flex items-center space-x-1 shrink-0">
                <button
                    onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                    className={`p-1.5 rounded-lg transition-colors ${filter?.value ? 'text-indigo-600 bg-indigo-50' : 'text-gray-300 hover:bg-gray-50 hover:text-gray-500'}`}
                    title="Configurar Filtro"
                >
                    <Search size={14} />
                </button>

                {onRemove && (
                    <button onClick={onRemove} className="p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors">
                        <X size={14} />
                    </button>
                )}
            </div>

            {isPopoverOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filtro de Coluna</span>
                            <button onClick={() => setIsPopoverOpen(false)}><X size={12} className="text-gray-400" /></button>
                        </div>

                        <div className="space-y-2 text-left">
                            <select
                                className="w-full text-xs p-2 bg-gray-50 border border-gray-100 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                                value={filter?.operator || 'igual'}
                                onChange={(e) => onFilterChange?.({ operator: e.target.value, value: filter?.value || '' })}
                            >
                                <option value="igual">Igual a</option>
                                <option value="contem">Contém</option>
                                <option value="in">Lista (In) - sep. por vírgula</option>
                            </select>

                            {/* Render Select for Status Fields, Input for others */}
                            {(() => {
                                const statusOptions: Record<string, string[]> = {
                                    'Status Integração': ['PENDENTE', 'AGENDADA', 'REALIZADA', 'VENCIDO', 'FALTOU', 'AGUARDANDO_APROVACAO'],
                                    'Status Contratual': ['ATIVO', 'INATIVO'],
                                    'Status Empresa': ['ATIVA', 'INATIVA'],
                                    'Status do Documento': ['APROVADO', 'REPROVADO', 'PENDENTE', 'AGUARDANDO', 'NAO_APROVADO'],
                                    'Status Contrato': ['ATIVO', 'INATIVO', 'VENCIDO']
                                };
                                const options = statusOptions[id];

                                if (options) {
                                    return (
                                        <select
                                            className="w-full text-xs p-2 bg-gray-50 border border-gray-100 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                                            value={filter?.value || ''}
                                            onChange={(e) => onFilterChange?.({ operator: filter?.operator || 'igual', value: e.target.value })}
                                        >
                                            <option value="">Selecione...</option>
                                            {options.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    );
                                }
                                return (
                                    <input
                                        type="text"
                                        placeholder="Valor do filtro..."
                                        className="w-full text-xs p-2 bg-gray-50 border border-gray-100 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                                        value={filter?.value || ''}
                                        onChange={(e) => onFilterChange?.({ operator: filter?.operator || 'igual', value: e.target.value })}
                                    />
                                );
                            })()}
                        </div>

                        {filter?.value && (
                            <button
                                onClick={() => onFilterChange?.(null)}
                                className="w-full text-[10px] font-bold text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                            >
                                Limpar Filtro
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function SortableItem(props: {
    id: string,
    onRemove?: () => void,
    filter?: { operator: string, value: string },
    onFilterChange: (filter: { operator: string, value: string } | null) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: props.id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <ColumnCard
                {...props}
                isDragging={isDragging}
                listeners={listeners}
                attributes={attributes}
            />
        </div>
    );
}

// --- Main Page ---

export default function RelatoriosPage() {
    // Pega dados do usuário e permissões
    const { data: userData } = useQuery({
        queryKey: ['me'],
        queryFn: async () => (await api.get('/me')).data
    });

    const perms = userData?.permissions || {};
    const isAdmin = userData?.data?.role === 'admin';
    const { notify } = useNotify();

    const canViewPdf = isAdmin || perms.canViewRelatorios;
    const canGeneratePdf = isAdmin || perms.canGeneratePdfReports;
    const canViewCubo = isAdmin || perms.canViewCubos;
    const canCreateCubo = isAdmin || perms.canCreateCubos;
    const canEditCubo = isAdmin || perms.canEditCubos;
    const canDeleteCubo = isAdmin || perms.canDeleteCubos;

    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<'pdf' | 'cubo'>(canViewPdf ? 'pdf' : 'cubo');

    // Se mudar permissão ou no primeiro load, garante tab válida
    useEffect(() => {
        if (!canViewPdf && activeTab === 'pdf') {
            setActiveTab('cubo');
        } else if (!canViewCubo && activeTab === 'cubo') {
            setActiveTab('pdf');
        }
    }, [canViewPdf, canViewCubo]);

    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

    // Cubo States
    const [selectedColumns, setSelectedColumns] = useState<string[]>(['Funcionário', 'Empresa', 'Status Integração', 'Data Integração']);
    const [dateFilterField, setDateFilterField] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [columnFilters, setColumnFilters] = useState<Record<string, { operator: string, value: string }>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [isGeneratingCubo, setIsGeneratingCubo] = useState(false);

    const [activeId, setActiveId] = useState<string | null>(null);

    // Snapshot States
    const [isSaveSnapshotOpen, setIsSaveSnapshotOpen] = useState(false);
    const [snapshotName, setSnapshotName] = useState('');
    const [editingSnapshotId, setEditingSnapshotId] = useState<number | null>(null);

    // Snapshots Query
    const { data: snapshots = [] } = useQuery({
        queryKey: ['cubo-snapshots'],
        queryFn: async () => (await api.get('/cubo-snapshots')).data,
        enabled: canViewCubo
    });

    // Snapshot Mutations
    const createSnapshotMutation = useMutation({
        mutationFn: (data: any) => api.post('/cubo-snapshots', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cubo-snapshots'] });
            notify('success', 'Snapshot Salvo', 'Sua configuração foi salva com sucesso!');
            setIsSaveSnapshotOpen(false);
            setSnapshotName('');
        },
        onError: () => notify('error', 'Erro', 'Não foi possível salvar o snapshot.')
    });

    const updateSnapshotMutation = useMutation({
        mutationFn: ({ id, data }: { id: number, data: any }) => api.put(`/cubo-snapshots/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cubo-snapshots'] });
            notify('success', 'Snapshot Atualizado', 'A configuração foi atualizada!');
            setEditingSnapshotId(null);
            setSnapshotName('');
        },
        onError: () => notify('error', 'Erro', 'Não foi possível atualizar o snapshot.')
    });

    const deleteSnapshotMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/cubo-snapshots/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cubo-snapshots'] });
            notify('success', 'Excluído', 'Snapshot removido com sucesso.');
        },
        onError: () => notify('error', 'Erro', 'Não foi possível excluir o snapshot.')
    });

    const handleSaveSnapshot = () => {
        if (!snapshotName.trim()) {
            notify('warning', 'Nome Obrigatório', 'Informe um nome para o snapshot.');
            return;
        }
        createSnapshotMutation.mutate({
            nome: snapshotName,
            columns: selectedColumns,
            filters: columnFilters,
            dateFilterField,
            dateRangeStart: dateRange.start,
            dateRangeEnd: dateRange.end
        });
    };

    const handleLoadSnapshot = (snapshot: any) => {
        setSelectedColumns(snapshot.columns || []);
        setColumnFilters(snapshot.filters || {});
        setDateFilterField(snapshot.dateFilterField || null);
        setDateRange({ start: snapshot.dateRangeStart || '', end: snapshot.dateRangeEnd || '' });
        notify('info', 'Configuração Carregada', `Snapshot "${snapshot.nome}" aplicado.`);
    };

    const handleUpdateSnapshot = (id: number) => {
        updateSnapshotMutation.mutate({
            id,
            data: {
                columns: selectedColumns,
                filters: columnFilters,
                dateFilterField,
                dateRangeStart: dateRange.start,
                dateRangeEnd: dateRange.end
            }
        });
    };

    // Filtered fields based on search
    const filteredFields = useMemo(() => {
        return FIELD_CATALOG.filter(f =>
            f.id.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !selectedColumns.includes(f.id) &&
            (f.type === 'date' || f.id !== dateFilterField)
        );
    }, [searchTerm, selectedColumns, dateFilterField]);

    // Sensors for DnD
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragStart(event: any) {
        setActiveId(event.active.id);
    }

    function handleDragEnd(event: any) {
        const { active, over } = event;
        setActiveId(null);

        if (active.id !== over?.id) {
            setSelectedColumns((items) => {
                const oldIndex = items.indexOf(active.id);
                const newIndex = items.indexOf(over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    }

    const addColumn = (fieldId: string) => {
        if (!selectedColumns.includes(fieldId)) {
            setSelectedColumns([...selectedColumns, fieldId]);
        }
    };

    const setFilter = (fieldId: string) => {
        const field = FIELD_CATALOG.find(f => f.id === fieldId);
        if (field?.type === 'date') {
            setDateFilterField(fieldId);
        } else {
            notify('warning', 'Campo Inválido', 'Apenas campos de DATA podem ser usados como filtro de período.');
        }
    };

    const handleDownloadCubo = async () => {
        if (selectedColumns.length === 0) {
            notify('warning', 'Seleção Necessária', 'Selecione ao menos uma coluna para o relatório.');
            return;
        }

        setIsGeneratingCubo(true);
        try {
            const response = await api.post('/relatorios/cubo-custom', {
                columns: selectedColumns,
                date_filter: dateFilterField ? {
                    field: dateFilterField,
                    start: dateRange.start,
                    end: dateRange.end
                } : null,
                filters: columnFilters
            }, { responseType: 'blob' });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const now = new Date();
            const timestamp = now.toISOString().split('T')[0].replace(/-/g, '');
            link.setAttribute('download', `cubo_custom_${timestamp}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            notify('success', 'Relatório Gerado', 'O download da planilha iniciará automaticamente.');
        } catch (error: any) {
            console.error('Error downloading custom cube:', error);
            notify('error', 'Erro no Relatório', 'Não foi possível gerar a planilha. Verifique os filtros e tente novamente.');
        } finally {
            setIsGeneratingCubo(false);
        }
    };

    // --- PDF Logic (Existing) ---
    const handleGeneratePdfReport = async (filters: any) => {
        try {
            const response = await api.get('/relatorios/integracoes-agendadas', {
                params: filters,
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `report_${filters.data_inicio}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error: any) {
            alert('Erro ao gerar PDF.');
        }
    };

    if (userData && !canViewPdf && !canViewCubo) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center">
                    <X size={40} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Acesso Negado</h2>
                    <p className="text-gray-500 mt-2">Você não tem permissão para visualizar relatórios.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 border-none">Relatórios</h1>
                    <p className="text-gray-500 mt-1">Configure e extraia dados customizados do sistema.</p>
                </div>

                <div className="flex bg-gray-100 p-1.5 rounded-2xl w-fit">
                    {canViewPdf && (
                        <button
                            onClick={() => setActiveTab('pdf')}
                            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center space-x-2 ${activeTab === 'pdf' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <FileText size={18} />
                            <span>Relatórios PDF</span>
                        </button>
                    )}
                    {canViewCubo && (
                        <button
                            onClick={() => setActiveTab('cubo')}
                            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center space-x-2 ${activeTab === 'cubo' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <LayoutGrid size={18} />
                            <span>Planilha Cubo</span>
                        </button>
                    )}
                </div>
            </header>

            <main className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                {activeTab === 'pdf' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                        {/* Static PDF Cards (omitted for brevity in this block, but same as before) */}
                        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm flex flex-col h-full group">
                            <div className="flex items-center justify-between mb-6">
                                <div className="bg-red-50 text-red-600 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                                    <FileText size={32} />
                                </div>
                                <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-2 py-1 rounded-md uppercase tracking-widest">PDF</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2 truncate">Integrações Agendadas por Período</h3>
                            <p className="text-sm text-gray-400 mb-8 line-clamp-3 leading-relaxed">Ficha de presença para integrações agendadas em um período específico.</p>
                            <button
                                onClick={() => setIsFilterModalOpen(true)}
                                disabled={!canGeneratePdf}
                                className={`w-full flex items-center justify-center space-x-2 font-bold py-3 rounded-2xl transition-all shadow-lg ${canGeneratePdf ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                title={!canGeneratePdf ? 'Sem permissão para gerar relatórios' : ''}
                            >
                                {canGeneratePdf ? <Download size={18} /> : <ShieldAlert size={18} />}
                                <span>{canGeneratePdf ? 'Configurar e Gerar' : 'Sem Permissão'}</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Sidebar: Available Fields */}
                        <aside className="lg:w-80 space-y-4">
                            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm overflow-hidden flex flex-col h-[600px]">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                                    <Database size={20} className="text-indigo-600" />
                                    <span>Campos Disponíveis</span>
                                </h3>
                                <div className="relative mb-4">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Buscar campo..."
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar text-left text-sm">
                                    {['Integração', 'Empresa', 'Contrato', 'Documentação'].map(cat => (
                                        <div key={cat} className="space-y-1">
                                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest pt-2">{cat}</p>
                                            {filteredFields.filter(f => f.category === cat).map(field => (
                                                <div key={field.id} className="flex flex-col space-y-1">
                                                    <div className="flex items-center justify-between group p-2 rounded-lg hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100">
                                                        <span className="text-gray-600 font-medium">{field.id}</span>
                                                        <div className="flex items-center space-x-1">
                                                            <button
                                                                onClick={() => addColumn(field.id)}
                                                                className="opacity-0 group-hover:opacity-100 bg-white text-indigo-600 p-1.5 rounded-lg shadow-sm border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all"
                                                                title="Adicionar Coluna"
                                                            >
                                                                <TableIcon size={14} />
                                                            </button>
                                                            {field.type === 'date' && (
                                                                <button
                                                                    onClick={() => setFilter(field.id)}
                                                                    className="opacity-0 group-hover:opacity-100 bg-white text-emerald-600 p-1.5 rounded-lg shadow-sm border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all"
                                                                    title="Usar como Filtro de Data"
                                                                >
                                                                    <Calendar size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Snapshots Section */}
                            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                                        <FolderOpen size={20} className="text-amber-600" />
                                        <span>Configurações Salvas</span>
                                    </h3>
                                    {canCreateCubo && (
                                        <button
                                            onClick={() => setIsSaveSnapshotOpen(!isSaveSnapshotOpen)}
                                            className="flex items-center space-x-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                                        >
                                            <Save size={14} />
                                            <span>Salvar Atual</span>
                                        </button>
                                    )}
                                </div>

                                {isSaveSnapshotOpen && (
                                    <div className="mb-4 p-3 bg-indigo-50 rounded-xl space-y-2">
                                        <input
                                            type="text"
                                            placeholder="Nome da configuração..."
                                            className="w-full px-3 py-2 text-sm border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={snapshotName}
                                            onChange={(e) => setSnapshotName(e.target.value)}
                                        />
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={handleSaveSnapshot}
                                                disabled={createSnapshotMutation.isPending}
                                                className="flex-1 flex items-center justify-center space-x-1 bg-indigo-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                            >
                                                {createSnapshotMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                                <span>Salvar</span>
                                            </button>
                                            <button
                                                onClick={() => { setIsSaveSnapshotOpen(false); setSnapshotName(''); }}
                                                className="px-3 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {snapshots.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic text-center py-4">Nenhuma configuração salva.</p>
                                    ) : snapshots.map((snap: any) => (
                                        <div key={snap.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl group hover:bg-gray-100 transition-all">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-700 truncate">{snap.nome}</p>
                                                <p className="text-[10px] text-gray-400">{snap.columns?.length || 0} colunas</p>
                                            </div>
                                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleLoadSnapshot(snap)}
                                                    className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg"
                                                    title="Usar esta configuração"
                                                >
                                                    <ExternalLink size={14} />
                                                </button>
                                                {canEditCubo && (
                                                    <button
                                                        onClick={() => handleUpdateSnapshot(snap.id)}
                                                        className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-lg"
                                                        title="Atualizar com configuração atual"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                )}
                                                {canDeleteCubo && (
                                                    <button
                                                        onClick={() => deleteSnapshotMutation.mutate(snap.id)}
                                                        className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </aside>

                        {/* Main Canvas: Report Builder */}
                        <div className="flex-1 space-y-6">
                            {/* Date Filter Zone */}
                            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm border-l-4 border-l-emerald-500 text-left">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider flex items-center space-x-2">
                                        <Calendar size={16} />
                                        <span>Filtro de Período (Obrigatório: 1 campo de data)</span>
                                    </h3>
                                    {dateFilterField && (
                                        <button onClick={() => setDateFilterField(null)} className="text-red-500 hover:underline text-xs flex items-center space-x-1">
                                            <Trash2 size={12} />
                                            <span>Limpar Filtro</span>
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-col md:flex-row gap-4 items-end">
                                    <div className="flex-1">
                                        <div className={`h-16 rounded-2xl border-2 border-dashed flex items-center px-6 transition-all ${dateFilterField ? 'border-emerald-200 bg-emerald-50/20' : 'border-gray-200 bg-gray-50/50'}`}>
                                            {dateFilterField ? (
                                                <div className="flex items-center space-x-3 text-emerald-700 font-bold">
                                                    <div className="bg-emerald-500 text-white p-2 rounded-lg"><Calendar size={16} /></div>
                                                    <span>{dateFilterField}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-sm italic font-medium">Arraste ou clique no calendário de um campo de data...</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex space-x-2">
                                        <div className="w-40">
                                            <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Início</label>
                                            <input
                                                type="date"
                                                className="w-full bg-gray-50 border border-gray-100 p-2 text-sm rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                                                value={dateRange.start}
                                                onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                                            />
                                        </div>
                                        <div className="w-40">
                                            <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Fim</label>
                                            <input
                                                type="date"
                                                className="w-full bg-gray-50 border border-gray-100 p-2 text-sm rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                                                value={dateRange.end}
                                                onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Columns Zone */}
                            <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm text-left">
                                <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider mb-6 flex items-center space-x-2">
                                    <TableIcon size={16} />
                                    <span>Colunas do Relatório (Arraste para reordenar)</span>
                                </h3>

                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 min-h-[100px] relative transition-all duration-300">
                                        <SortableContext items={selectedColumns} strategy={rectSortingStrategy}>
                                            {selectedColumns.map(id => (
                                                <SortableItem
                                                    key={id}
                                                    id={id}
                                                    onRemove={() => {
                                                        setSelectedColumns(selectedColumns.filter(c => c !== id));
                                                        const newFilters = { ...columnFilters };
                                                        delete newFilters[id];
                                                        setColumnFilters(newFilters);
                                                    }}
                                                    filter={columnFilters[id]}
                                                    onFilterChange={(f) => {
                                                        if (f) setColumnFilters({ ...columnFilters, [id]: f });
                                                        else {
                                                            const newFilters = { ...columnFilters };
                                                            delete newFilters[id];
                                                            setColumnFilters(newFilters);
                                                        }
                                                    }}
                                                />
                                            ))}
                                        </SortableContext>
                                    </div>

                                    <DragOverlay dropAnimation={{
                                        sideEffects: defaultDropAnimationSideEffects({
                                            styles: {
                                                active: {
                                                    opacity: '0.4',
                                                },
                                            },
                                        }),
                                    }}>
                                        {activeId ? (
                                            <ColumnCard
                                                id={activeId}
                                                filter={columnFilters[activeId]}
                                                isOverlay
                                            />
                                        ) : null}
                                    </DragOverlay>

                                    {selectedColumns.length === 0 && (
                                        <div className="h-32 border-2 border-dashed border-gray-200 bg-gray-50/50 rounded-3xl flex items-center justify-center text-gray-400 text-sm italic font-medium">
                                            Nenhuma coluna selecionada. Adicione campos da lista à esquerda.
                                        </div>
                                    )}
                                </DndContext>

                                <div className="mt-12 flex items-center justify-between pt-6 border-t border-gray-100">
                                    <div className="flex items-center space-x-4 text-sm text-gray-400 font-medium">
                                        <span>Total: <b className="text-gray-900">{selectedColumns.length}</b> colunas</span>
                                        <span>•</span>
                                        <button onClick={() => setSelectedColumns([])} className="hover:text-red-500">Limpar tudo</button>
                                    </div>
                                    <button
                                        onClick={handleDownloadCubo}
                                        disabled={isGeneratingCubo || selectedColumns.length === 0}
                                        className="flex items-center space-x-3 bg-indigo-600 text-white font-bold px-8 py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                                    >
                                        {isGeneratingCubo ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
                                        <span>{isGeneratingCubo ? 'Processando Dados...' : 'Gerar Planilha Customizada'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Preview Hub */}
                            {/* <div className="bg-gray-900 rounded-3xl p-8 text-white relative overflow-hidden group shadow-xl">
                                <div className="relative z-10">
                                    <div className="flex items-center space-x-2 text-indigo-400 mb-4">
                                        <ShieldCheck size={20} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Informação de Segurança</span>
                                    </div>
                                    <h2 className="text-2xl font-bold mb-4">Motor de Extração Cubo</h2>
                                    <p className="text-indigo-200/70 text-sm leading-relaxed max-w-xl">
                                        Esta ferramenta utiliza o motor de denormalização Cubo. Os dados são extraídos em tempo real do schema unificado, garantindo que as relações entre funcionários e documentos acessórios permaneçam íntegras.
                                    </p>
                                </div>
                                <PieChart size={180} className="absolute -bottom-10 -right-10 text-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-1000" />
                            </div> */}
                        </div>
                    </div>
                )}
            </main>

            {isFilterModalOpen && (
                <IntegrationFilterModal
                    onClose={() => setIsFilterModalOpen(false)}
                    onGenerate={handleGeneratePdfReport}
                />
            )}
        </div>
    );
}

interface FilterModalProps {
    onClose: () => void;
    onGenerate: (filters: any) => void;
}

function IntegrationFilterModal({ onClose, onGenerate }: FilterModalProps) {
    const [filters, setFilters] = useState({
        data_inicio: '',
        data_fim: '',
        unidade_id: '',
        empresa_id: ''
    });
    const [isGenerating, setIsGenerating] = useState(false);

    const { data: units } = useQuery({ queryKey: ['unidadesIntegracao'], queryFn: configService.getUnidadesIntegracao });
    const { data: companies } = useQuery({ queryKey: ['empresas'], queryFn: () => empresaService.getAll() });

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsGenerating(true);
        try {
            await onGenerate(filters);
            onClose();
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Filtros do Relatório</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>
                <form onSubmit={handleGenerate} className="p-6 space-y-4 text-left">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Data Início</label>
                            <input
                                type="date"
                                required
                                value={filters.data_inicio}
                                onChange={e => setFilters({ ...filters, data_inicio: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Data Fim</label>
                            <input
                                type="date"
                                required
                                value={filters.data_fim}
                                onChange={e => setFilters({ ...filters, data_fim: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Unidade de Integração</label>
                        <select
                            value={filters.unidade_id}
                            onChange={e => setFilters({ ...filters, unidade_id: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                        >
                            <option value="">Todas as Unidades</option>
                            {units?.map((u: any) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Prestadora</label>
                        <select
                            value={filters.empresa_id}
                            onChange={e => setFilters({ ...filters, empresa_id: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                        >
                            <option value="">Todas as Prestadoras</option>
                            {companies?.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isGenerating}
                            className="w-full flex items-center justify-center space-x-2 bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                        >
                            {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
                            <span>Gerar PDF</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
