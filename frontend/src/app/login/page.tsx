'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { KeyRound, Building2 } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useQuery } from '@tanstack/react-query';
import { configuracaoService } from '@/services/configuracaoService';

export default function LoginPage() {
    const [isInternal, setIsInternal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const { data: config } = useQuery({
        queryKey: ['configuracao'],
        queryFn: configuracaoService.get,
    });

    const handleGoogleSuccess = async (credentialResponse: any) => {
        setLoading(true);
        setError('');
        try {
            const response = await api.post('/auth/google', { token: credentialResponse.credential });
            localStorage.setItem('token', response.data.access_token);
            router.push('/');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Falha na autenticação com Google.');
        } finally {
            setLoading(false);
        }
    };

    const handlePrestadoraLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const formData = new FormData(e.currentTarget);
        const identifier = formData.get('identifier') as string;
        const chaveAcesso = formData.get('chaveAcesso') as string;

        try {
            const response = await api.post('/token', { identifier, chaveAcesso });
            localStorage.setItem('token', response.data.access_token);
            router.push('/');
        } catch (err) {
            setError('Falha na autenticação. Verifique o nome/login da empresa e a chave.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-white flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestão de Contratos</h1>
                    <p className="text-gray-500">Acesse sua conta para continuar</p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-xl mb-8">
                    <button
                        onClick={() => setIsInternal(false)}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${!isInternal ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Prestadora
                    </button>
                    <button
                        onClick={() => setIsInternal(true)}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${isInternal ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Interno
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6">
                        {error}
                    </div>
                )}

                {isInternal ? (
                    <div className="space-y-6">
                        <div className="flex justify-center">
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={() => setError('Erro ao conectar com Google.')}
                                useOneTap
                                theme="filled_blue"
                                shape="pill"
                                width="100%"
                            />
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100"></span></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">Apenas {config?.dominioInterno || '@seudominio.com'}</span></div>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handlePrestadoraLogin} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome ou Login da Empresa</label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    name="identifier"
                                    type="text"
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                                    placeholder="Ex: minha_empresa ou Razão Social"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Chave de Acesso</label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    name="chaveAcesso"
                                    type="password"
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                        <button
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white font-semibold py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 disabled:opacity-50"
                        >
                            {loading ? 'Entrando...' : 'Entrar'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
