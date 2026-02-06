'use client';

import { ShieldAlert, LogOut, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function BlockedPage() {
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem('token');
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-10 text-center animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
                    <ShieldAlert size={48} />
                </div>

                <h1 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Acesso Bloqueado</h1>

                <p className="text-gray-500 mb-8 leading-relaxed">
                    Seu usuário ainda não possui um **Perfil de Acesso** atribuído.
                    Por favor, entre em contato com o administrador do sistema para solicitar sua liberação.
                </p>

                <div className="space-y-4">
                    <button className="w-full flex items-center justify-center space-x-2 bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                        <MessageSquare size={20} />
                        <span>Falar com Suporte</span>
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center space-x-2 bg-white border-2 border-gray-100 text-gray-400 font-bold py-4 rounded-2xl hover:border-red-100 hover:text-red-500 transition-all"
                    >
                        <LogOut size={20} />
                        <span>Sair do Sistema</span>
                    </button>
                </div>

                <div className="mt-10 pt-8 border-t border-gray-50">
                    <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">
                        ID do Usuário: Registrado via Amcel OAuth
                    </p>
                </div>
            </div>
        </div>
    );
}
