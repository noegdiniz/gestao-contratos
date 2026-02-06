'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { NotificationProvider } from '@/components/ui/Notification';
import React, { useState } from 'react';

const GOOGLE_CLIENT_ID = "13256348917-k29q8fpfoblkan04mfadpr8fe6vafkg6.apps.googleusercontent.com";

export default function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <QueryClientProvider client={queryClient}>
                <NotificationProvider>
                    {children}
                </NotificationProvider>
            </QueryClientProvider>
        </GoogleOAuthProvider>
    );
}
