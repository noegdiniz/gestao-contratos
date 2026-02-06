'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboardService';
import {
  Building2,
  FileText,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  History
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useEffect } from 'react';
import Link from 'next/link';
import { PermissionGuard } from '@/components/ui/PermissionGuard';

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return `há ${Math.floor(interval)} anos`;
  interval = seconds / 2592000;
  if (interval > 1) return `há ${Math.floor(interval)} meses`;
  interval = seconds / 86400;
  if (interval > 1) return `há ${Math.floor(interval)} dias`;
  interval = seconds / 3600;
  if (interval > 1) return `há ${Math.floor(interval)} horas`;
  interval = seconds / 60;
  if (interval > 1) return `há ${Math.floor(interval)} minutos`;
  return 'agora mesmo';
}

export default function Home() {
  const router = useRouter();

  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const response = await api.get('/me');
      return response.data;
    },
    retry: false,
  });

  useEffect(() => {
    if (!isUserLoading && userData && userData.type === 'empresa') {
      router.push('/portal');
    }
  }, [userData, isUserLoading, router]);

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardService.getStats(),
    enabled: !!userData && userData.type !== 'empresa'
  });

  const { data: activities, isLoading: isActivitiesLoading } = useQuery({
    queryKey: ['dashboard-activities'],
    queryFn: () => dashboardService.getActivities(),
    enabled: !!userData && userData.type !== 'empresa'
  });

  const statsCards = [
    {
      name: 'Empresas Ativas',
      value: stats?.empresasAtivas || 0,
      icon: Building2,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      percentage: '+5%',
      up: true,
      permission: 'canViewEmpresas'
    },
    {
      name: 'Docs Pendentes',
      value: stats?.docsPendentes || 0,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      percentage: '-2%',
      up: false,
      permission: 'canViewDocs'
    },
    {
      name: 'Funcionários',
      value: stats?.totalFuncionarios || 0,
      icon: Users,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      percentage: '+8%',
      up: true,
      permission: 'canViewFuncionarios'
    },
    {
      name: 'Aprovados (Mês)',
      value: stats?.aprovadosMes || 0,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      percentage: '+15%',
      up: true,
      permission: 'canViewDocs'
    },
  ];

  if (isUserLoading || (userData?.type === 'empresa')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight border-none">Visão Geral</h1>
        <p className="text-gray-500 mt-2 text-lg">Bem-vindo ao centro de controle de documentação e contratos, {userData?.name}.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat) => (
          <PermissionGuard key={stat.name} permission={stat.permission}>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow h-full">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.bg} ${stat.color} p-3 rounded-2xl`}>
                  <stat.icon size={24} />
                </div>
                <div className={`flex items-center ${stat.up ? 'text-emerald-500 bg-emerald-50' : 'text-amber-500 bg-amber-50'} px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider`}>
                  <TrendingUp size={10} className={`mr-1 ${!stat.up && 'rotate-180'}`} />
                  {stat.percentage}
                </div>
              </div>
              <div className="text-3xl font-black text-gray-900 mb-1">
                {isStatsLoading ? '...' : stat.value}
              </div>
              <div className="text-sm font-medium text-gray-400 uppercase tracking-wider">{stat.name}</div>
            </div>
          </PermissionGuard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <PermissionGuard permission="canViewLogs">
          <div className="lg:col-span-2 space-y-6 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <History size={20} className="text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-800">Atividade Recente</h2>
              </div>
              <Link href="/logs" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider cursor-pointer transition-all border-b border-indigo-600 pb-1 pt-1 hover:border-indigo-700 hover:pb-2 hover:pt-2">Ver tudo</Link>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
              {isActivitiesLoading ? (
                <div className="p-12 text-center text-gray-400">Carregando atividades...</div>
              ) : activities?.length === 0 ? (
                <div className="p-12 text-center text-gray-400">Nenhuma atividade registrada.</div>
              ) : activities?.map((activity: any) => (
                <div key={activity.id} className="p-5 flex items-start space-x-4 hover:bg-gray-50 transition-colors group">
                  <div className="mt-1.5 w-2 h-2 rounded-full bg-indigo-500 shrink-0 group-hover:scale-125 transition-transform shadow-lg shadow-indigo-100"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800 font-medium">
                      <span className="font-bold text-gray-900">{activity.userName}</span>
                      <span className="text-gray-500 mx-1">({activity.userPerfil})</span>
                      <span className="text-gray-600">{activity.action}:</span>
                      <span className="ml-1 text-indigo-600">{activity.info}</span>
                    </p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1.5 flex items-center">
                      <Clock size={10} className="mr-1" />
                      {formatTimeAgo(activity.date)}
                      <span className="mx-2">•</span>
                      {activity.menu}
                    </p>
                  </div>
                  <ArrowUpRight size={16} className="text-gray-200 group-hover:text-indigo-400 transition-colors" />
                </div>
              ))}
            </div>
          </div>
        </PermissionGuard>

        {/* Quick Actions / Alerts */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-800">Alertas Críticos</h2>
          <div className="space-y-4">
            <div className={`p-6 rounded-3xl border transition-all ${stats?.vencidos && stats.vencidos > 0 ? 'bg-red-50 border-red-100 shadow-lg shadow-red-50' : 'bg-emerald-50 border-emerald-100 opacity-60'}`}>
              <div className="flex items-start space-x-3">
                <AlertCircle className={stats?.vencidos && stats.vencidos > 0 ? 'text-red-500' : 'text-emerald-500'} size={24} />
                <div>
                  <p className={`text-lg font-black uppercase tracking-tight ${stats?.vencidos && stats.vencidos > 0 ? 'text-red-900' : 'text-emerald-900'}`}>
                    {stats?.vencidos && stats.vencidos > 0 ? `${stats.vencidos} Pendências` : 'Tudo em Ordem'}
                  </p>
                  <p className={`text-xs font-medium mt-1 ${stats?.vencidos && stats.vencidos > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                    {stats?.vencidos && stats.vencidos > 0
                      ? 'Existem integrações ou ASOs vencidos que precisam de atenção.'
                      : 'Não há integrações vencidas registradas no momento.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
