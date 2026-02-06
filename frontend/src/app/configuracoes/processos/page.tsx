'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configService } from '@/services/configService';
import { Settings2, Plus, Zap, Trash2, X } from 'lucide-react';
import { useState } from 'react';

export default function ProcessosPage() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ nome: '' });

    const { data: processos, isLoading } = useQuery({
        queryKey: ['processos'],
        queryFn: () => configService.getTiposProcesso(),
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => configService.createTipoProcesso(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['processos'] });
            setIsModalOpen(false);
            setFormData({ nome: '' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => configService.deleteTipoProcesso(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['processos'] });
        },
    });

    const handleDelete = (id: number) => {
        if (confirm('Deseja excluir este tipo de processo?')) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <div className="space-y-8 text-left">
            <header className="flex justify-between items-center text-left">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 border-none">Tipos de Processo</h1>
                    <p className="text-gray-500 mt-1">Fluxos de trabalho e automações do sistema.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                    <Plus size={20} />
                    <span>Novo Processo</span>
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                {isLoading ? (
                    <div className="h-32 bg-white rounded-3xl animate-pulse"></div>
                ) : processos?.map((proc: any) => (
                    <div key={proc.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group relative">
                        <div className="flex items-center space-x-4 text-left">
                            <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                                <Zap size={20} />
                            </div>
                            <span className="font-bold text-gray-900">{proc.nome}</span>
                        </div>
                        <button
                            onClick={() => handleDelete(proc.id)}
                            className="text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}

                {processos?.length === 0 && (
                    <div className="col-span-full py-20 bg-gray-50/50 border-2 border-dashed border-gray-100 rounded-3xl text-center">
                        <p className="text-gray-400 font-medium">Nenhum tipo de processo cadastrado.</p>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">Novo Tipo de Processo</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="p-6 space-y-4 text-left">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Processo</label>
                                <input
                                    type="text" required value={formData.nome}
                                    onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div className="flex justify-end space-x-3 pt-4 text-left">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 font-bold text-gray-400">Cancelar</button>
                                <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100">
                                    Criar Processo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
