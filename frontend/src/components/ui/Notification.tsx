'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
}

interface NotificationContextType {
    notify: (type: NotificationType, title: string, message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const notify = useCallback((type: NotificationType, title: string, message: string) => {
        const id = Math.random().toString(36).substring(2, 9);
        setNotifications((prev) => [...prev, { id, type, title, message }]);
    }, []);

    const remove = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    return (
        <NotificationContext.Provider value={{ notify }}>
            {children}
            <div className="fixed top-6 right-6 z-[9999] flex flex-col space-y-4 w-full max-w-sm pointer-events-none">
                {notifications.map((n) => (
                    <NotificationCard key={n.id} {...n} onRemove={() => remove(n.id)} />
                ))}
            </div>
        </NotificationContext.Provider>
    );
};

const NotificationCard: React.FC<Notification & { onRemove: () => void }> = ({
    type,
    title,
    message,
    onRemove
}) => {
    const [progress, setProgress] = useState(100);
    const duration = 7000; // 7 seconds

    useEffect(() => {
        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
            setProgress(remaining);
            if (remaining <= 0) {
                clearInterval(interval);
                onRemove();
            }
        }, 10);

        return () => clearInterval(interval);
    }, [onRemove]);

    const config = {
        success: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100', bar: 'bg-emerald-500' },
        error: { icon: X, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100', bar: 'bg-rose-500' },
        info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100', bar: 'bg-blue-500' },
        warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100', bar: 'bg-amber-500' }
    };

    const { icon: Icon, color, bg, border, bar } = config[type];

    return (
        <div className={`pointer-events-auto group relative overflow-hidden bg-white ${border} border rounded-2xl shadow-2xl animate-in slide-in-from-right-full duration-300`}>
            <div className="p-4 flex items-start space-x-4">
                <div className={`${bg} ${color} p-2 rounded-xl`}>
                    <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">{title}</h4>
                    <p className="text-xs text-gray-500 font-medium mt-0.5 line-clamp-2">{message}</p>
                </div>
                <button
                    onClick={onRemove}
                    className="text-gray-300 hover:text-gray-500 transition-colors"
                >
                    <X size={16} />
                </button>
            </div>
            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 h-1 w-full bg-gray-100">
                <div
                    className={`h-full ${bar} transition-all ease-linear`}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
};

export const useNotify = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotify must be used within NotificationProvider');
    return context;
};
