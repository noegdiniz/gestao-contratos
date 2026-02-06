'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useEffect, useRef, useState } from 'react';
import {
    LayoutDashboard,
    Building2,
    FileText,
    Users,
    Settings,
    LogOut,
    FolderTree,
    ShieldCheck,
    ClipboardList,
    LayoutGrid,
    ChevronDown,
    ChevronRight,
    PieChart
} from 'lucide-react';

interface MenuItem {
    name: string;
    href: string;
    icon: any;
    permission?: string;
    children?: MenuItem[];
}

const internalMenu: MenuItem[] = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Empresas', href: '/empresas', icon: Building2, permission: 'canViewEmpresas' },
    { name: 'Contratos', href: '/contratos', icon: FileText, permission: 'canViewContratos' },
    { name: 'Documentos', href: '/documentos', icon: ClipboardList, permission: 'canViewDocs' },
    { name: 'Funcionários', href: '/funcionarios', icon: Users, permission: 'canViewFuncionarios' },
    {
        name: 'Relatórios',
        href: '/relatorios',
        icon: PieChart,
        permission: 'relatorios_access',
    },
    { name: 'Cadastros', href: '/cadastros', icon: FolderTree, permission: 'any_catalog' },
    { name: 'Configurações', href: '/configuracoes', icon: Settings, permission: 'any_config' },
];

const empresaMenu: MenuItem[] = [
    { name: 'Portal Prestadora', href: '/portal', icon: LayoutDashboard },
];

function SidebarItem({ item, pathname }: { item: MenuItem; pathname: string }) {
    const isActive = pathname === item.href || (item.children && pathname.startsWith(item.href));
    const [isOpen, setIsOpen] = useState(isActive);

    if (item.children) {
        return (
            <div className="space-y-1">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                        ? 'bg-indigo-600/20 text-white'
                        : 'text-indigo-200 hover:bg-indigo-900/40 hover:text-white'
                        }`}
                >
                    <div className="flex items-center space-x-3">
                        <item.icon size={20} className={isActive ? 'text-indigo-400' : 'text-indigo-400 group-hover:text-indigo-200'} />
                        <span className="font-medium">{item.name}</span>
                    </div>
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                {isOpen && (
                    <div className="pl-4 space-y-1 animate-in slide-in-from-top-2 duration-200">
                        {item.children.map((child) => {
                            const isChildActive = pathname === child.href;
                            return (
                                <Link
                                    key={child.href}
                                    href={child.href}
                                    className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${isChildActive
                                        ? 'bg-indigo-600 text-white shadow-lg'
                                        : 'text-indigo-300 hover:bg-indigo-900/40 hover:text-white'
                                        }`}
                                >
                                    <child.icon size={18} className={isChildActive ? 'text-white' : 'text-indigo-500 group-hover:text-indigo-300'} />
                                    <span className="text-sm font-medium">{child.name}</span>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    return (
        <Link
            href={item.href}
            className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                : 'text-indigo-200 hover:bg-indigo-900/40 hover:text-white'
                }`}
        >
            <item.icon size={20} className={isActive ? 'text-white' : 'text-indigo-400 group-hover:text-indigo-200'} />
            <span className="font-medium">{item.name}</span>
        </Link>
    );
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const hasRedirected = useRef(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const { data: userData, isLoading, isError, error } = useQuery({
        queryKey: ['me'],
        queryFn: async () => {
            const response = await api.get('/me');
            return response.data;
        },
        retry: false,
        enabled: pathname !== '/login' && pathname !== '/bloqueado',
    });

    const { data: config } = useQuery({
        queryKey: ['configuracao'],
        queryFn: async () => {
            const response = await api.get('/configuracao');
            return response.data;
        },
    });

    useEffect(() => {
        if (hasRedirected.current) return;

        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

        if (!token && pathname !== '/login' && pathname !== '/bloqueado') {
            hasRedirected.current = true;
            router.push('/login');
            return;
        }

        if (!isLoading) {
            if (isError) {
                const axiosError = error as any;
                if (axiosError?.response?.status === 401 && pathname !== '/login') {
                    hasRedirected.current = true;
                    localStorage.removeItem('token');
                    router.push('/login');
                }
            } else if (userData && userData.profileStatus === 'blocked' && pathname !== '/bloqueado') {
                hasRedirected.current = true;
                router.push('/bloqueado');
            }
        }
    }, [userData, isLoading, isError, error, pathname, router]);

    if (!isMounted) return null;

    if (pathname === '/login' || pathname === '/bloqueado') return <>{children}</>;

    if (isLoading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-[#0a0c14] text-white flex flex-col fixed inset-y-0 h-full shadow-2xl z-40 border-r border-white/5 font-medium">
                <div className="p-8 border-b border-white/5 shrink-0">
                    <div className="flex items-center space-x-3 group cursor-default">
                        {config?.logoImage ? (
                            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg border border-white/10 group-hover:scale-105 transition-transform">
                                <img src={config.logoImage} alt="Logo" className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/40 group-hover:rotate-6 transition-transform">
                                <ShieldCheck size={24} className="text-white" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <h1 className="text-lg font-black tracking-tight truncate leading-tight group-hover:text-indigo-400 transition-colors">
                                {config?.nomeEmpresa || 'Gestão Contratos'}
                            </h1>
                            <p className="text-[10px] text-gray-500 mt-0.5 uppercase font-black tracking-[0.2em] leading-none opacity-80 group-hover:opacity-100 transition-opacity">
                                Sistema de Controle
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {(userData?.type === 'empresa' ? empresaMenu : internalMenu)
                        .filter(item => {
                            if (userData?.type === 'empresa') return true;
                            if (!item.permission) return true;

                            const perms = userData?.permissions || {};

                            if (item.permission === 'relatorios_access') {
                                return perms.canViewRelatorios || perms.canViewCubos;
                            }

                            if (item.permission === 'any_catalog') {
                                return perms.canViewPerfis || perms.canViewUsers || perms.canViewCategorias ||
                                    perms.canViewTipoProcesso || perms.canViewFuncionarios || perms.canViewRegrasAprovacao;
                            }

                            if (item.permission === 'any_config') {
                                return perms.canEditPerfis || perms.canEditUsers || perms.canEditCategorias ||
                                    perms.canEditTipoProcesso || perms.canEditFuncionarios || perms.canCreateRegrasAprovacao;
                            }

                            return perms[item.permission];
                        })
                        .map((item) => (
                            <SidebarItem key={item.href} item={item} pathname={pathname} />
                        ))}
                </div>

                {/* User Profile Section */}
                <div className="p-4 border-t border-indigo-900/50 space-y-2">
                    <div className="flex items-center space-x-3 px-4 py-3 rounded-xl bg-indigo-950/50 border border-white/5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                            {(userData?.type === 'empresa' ? userData?.data?.nome?.[0] : userData?.data?.name?.[0]) || 'U'}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate leading-tight">
                                {userData?.type === 'empresa' ? userData?.data?.nome : userData?.data?.name}
                            </p>
                            <p className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-wider mt-0.5 leading-none">
                                {userData?.type === 'empresa' ? 'Prestadora' : (userData?.data?.role || 'Usuário')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            localStorage.removeItem('token');
                            router.push('/login');
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all font-medium"
                    >
                        <LogOut size={20} />
                        <span>Sair</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 min-h-screen flex flex-col">
                {/* Global Header */}
                <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center space-x-4">
                        <div className="flex flex-col">
                            <h2 className="text-sm font-bold text-gray-900 leading-tight">
                                {userData?.type === 'empresa' ? 'Portal da Prestadora' : 'Painel Administrativo'}
                            </h2>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-6">
                        <div className="flex flex-col text-right">
                            <p className="text-xs font-bold text-gray-700 leading-tight">
                                Bem-vindo, {userData?.type === 'empresa' ? userData?.data?.nome : userData?.data?.name}
                            </p>
                            <p className="text-[10px] font-bold text-indigo-600 mt-0.5">
                                {userData?.type === 'empresa' ? 'Acesso Externo' : 'Acesso Interno'}
                            </p>
                        </div>
                    </div>
                </header>

                <div className="max-w-7xl w-full mx-auto p-8 flex-1">
                    {children}
                </div>
            </main>
        </div>
    );
}
