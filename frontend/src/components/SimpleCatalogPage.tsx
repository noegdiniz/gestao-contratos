
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, X, Tag } from 'lucide-react';
import { useState } from 'react';

interface SimpleCatalogPageProps {
    title: string;
    description: string;
    queryKey: string;
    fetchMethod: () => Promise<any[]>;
    createMethod: (data: any) => Promise<any>;
    deleteMethod: (id: number) => Promise<any>;
}

export default function SimpleCatalogPage({
    title,
    description,
    queryKey,
    fetchMethod,
    createMethod,
    deleteMethod
}: SimpleCatalogPageProps) {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [nome, setNome] = useState('');

    const { data: items, isLoading } = useQuery({
        queryKey: [queryKey],
        queryFn: fetchMethod,
    });

    const createMutation = useMutation({
        mutationFn: createMethod,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKey] });
            setIsModalOpen(false);
            setNome('');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteMethod,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKey] });
        },
    });

    const handleDelete = (id: number) => {
        if (confirm('Deseja excluir este item?')) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <div className="space-y-8 text-left">
            <header className="flex justify-between items-center text-left">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 border-none">{title}</h1>
                    <p className="text-gray-500 mt-1">{description}</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                    <Plus size={20} />
                    <span>Novo Item</span>
                </button>
            </header>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden text-left">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase font-bold text-gray-400">
                        <tr className="text-left">
                            <th className="px-6 py-4">Nome</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {isLoading ? (
                            <tr><td colSpan={2} className="p-10 text-center animate-pulse">Carregando...</td></tr>
                        ) : items?.map((item: any) => (
                            <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-3 text-left">
                                        <Tag size={18} className="text-indigo-500" />
                                        <span className="font-bold text-gray-900">{item.nome}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">Novo Item</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ nome }); }} className="p-6 space-y-4 text-left">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nome</label>
                                <input
                                    type="text" required value={nome}
                                    onChange={e => setNome(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="Digite o nome..."
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-50">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 font-bold text-gray-400 hover:text-gray-600 transition-all">Cancelar</button>
                                <button
                                    type="submit"
                                    disabled={!nome}
                                    className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
