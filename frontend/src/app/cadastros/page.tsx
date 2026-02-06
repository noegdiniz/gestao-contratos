'use client';

import {
    Users,
    ShieldAlert,
    Tag,
    Workflow,
    Briefcase,
    UserPlus,
    MapPin,
    Building,
    FileSpreadsheet,
    ClipboardType,
    FileCheck,
    Database,
    FolderTree
} from 'lucide-react';
import Link from 'next/link';
import { PermissionGuard } from '@/components/ui/PermissionGuard';

const catalogItems = [
    {
        title: 'Usuários e Acesso',
        description: 'Gerencie os usuários do sistema e suas permissões.',
        icon: Users,
        href: '/configuracoes/usuarios',
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        permission: 'canViewUsers'
    },
    {
        title: 'Perfis de Usuário',
        description: 'Defina os perfis e níveis de permissão do sistema.',
        icon: ShieldAlert,
        href: '/configuracoes/perfis',
        color: 'text-indigo-600',
        bg: 'bg-indigo-50',
        permission: 'canViewPerfis'
    },
    {
        title: 'Tipos de Processo',
        description: 'Configure as etapas e fluxos de validação.',
        icon: Workflow,
        href: '/configuracoes/processos',
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        permission: 'canViewTipoProcesso'
    },
    {
        title: 'Cargos',
        description: 'Gerencie o catálogo de cargos para funcionários.',
        icon: Briefcase,
        href: '/configuracoes/cargos',
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        permission: 'canEditFuncionarios'
    },
    {
        title: 'Funções',
        description: 'Defina as funções exercidas pelos colaboradores.',
        icon: UserPlus,
        href: '/configuracoes/funcoes',
        color: 'text-rose-600',
        bg: 'bg-rose-50',
        permission: 'canEditFuncionarios'
    },
    {
        title: 'Setores',
        description: 'Organize os setores internos da empresa.',
        icon: MapPin,
        href: '/configuracoes/setores',
        color: 'text-cyan-600',
        bg: 'bg-cyan-50',
        permission: 'canEditFuncionarios'
    },
    {
        title: 'Unidades de Integração',
        description: 'Gerencie os locais onde ocorrem as integrações.',
        icon: Building,
        href: '/configuracoes/unidades-integracao',
        color: 'text-fuchsia-600',
        bg: 'bg-fuchsia-50',
        permission: 'canEditFuncionarios'
    },
    {
        title: 'Documentos do Contrato',
        description: 'Defina os documentos exigidos para contratos por categoria.',
        icon: FileSpreadsheet,
        href: '/configuracoes/categorias',
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        permission: 'canViewCategorias'
    },
    {
        title: 'Documentos do Funcionário',
        description: 'Configure a documentação exigida por colaborador/contrato.',
        icon: FileCheck,
        href: '/configuracoes/documentos-funcionario',
        color: 'text-teal-600',
        bg: 'bg-teal-50',
        permission: 'canEditFuncionarios'
    },
    {
        title: 'Regras de Aprovação',
        description: 'Conecte Categorias, Perfis de Aprovação e Pastas do Drive.',
        icon: Database,
        href: '/configuracoes/cubo',
        color: 'text-violet-600',
        bg: 'bg-violet-50',
        permission: 'canViewRegrasAprovacao'
    }
];

export default function CadastrosPage() {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-4">
                    <div className="bg-indigo-50 text-indigo-600 p-3 rounded-2xl">
                        <FolderTree size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Catálogo de Cadastros</h1>
                        <p className="text-gray-500 mt-1 font-medium italic">Gerenciamento de dados base e classificações</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {catalogItems.map((item) => (
                    <PermissionGuard key={item.href} permission={item.permission}>
                        <Link
                            href={item.href}
                            className="group bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 w-full h-full block"
                        >
                            <div className="flex items-start space-x-6">
                                <div className={`${item.bg} ${item.color} p-4 rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                                    <item.icon size={28} />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                    <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                                        {item.title}
                                    </h3>
                                    <p className="text-sm text-gray-400 font-medium leading-relaxed">
                                        {item.description}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    </PermissionGuard>
                ))}
            </div>
        </div>
    );
}
