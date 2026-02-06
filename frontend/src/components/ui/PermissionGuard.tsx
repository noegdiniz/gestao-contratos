'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface PermissionGuardProps {
    permission?: string;
    anyPermission?: string[];
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

/**
 * Component to conditionally render children based on user permissions.
 */
export function PermissionGuard({ permission, anyPermission, children, fallback = null }: PermissionGuardProps) {
    const { data: userData } = useQuery<any>({
        queryKey: ['me'],
        queryFn: async () => {
            const response = await api.get('/me');
            return response.data;
        },
    });

    const perms = userData?.permissions || {};

    if (permission) {
        if (perms[permission]) return <>{children}</>;
        return <>{fallback}</>;
    }

    if (anyPermission) {
        if (anyPermission.some(p => perms[p])) return <>{children}</>;
        return <>{fallback}</>;
    }

    // If no permission specified, show nothing by default if guard is used
    return <>{fallback}</>;
}

/**
 * Hook to check permissions in functional components.
 */
export function usePermissions() {
    const { data: userData } = useQuery<any>({
        queryKey: ['me'],
        queryFn: async () => {
            const response = await api.get('/me');
            return response.data;
        },
    });

    const hasPermission = (permission: string) => {
        return !!userData?.permissions?.[permission];
    };

    const hasAnyPermission = (permissions: string[]) => {
        return permissions.some(p => !!userData?.permissions?.[p]);
    };

    return {
        hasPermission,
        hasAnyPermission,
        userData,
        permissions: userData?.permissions || {}
    };
}
