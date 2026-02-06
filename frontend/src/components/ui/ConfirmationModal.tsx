'use client';

import React from 'react';
import { AlertTriangle, X, Check } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'danger' | 'warning' | 'info';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    type = 'danger'
}) => {
    if (!isOpen) return null;

    const themes = {
        danger: {
            icon: AlertTriangle,
            iconColor: 'text-rose-600',
            iconBg: 'bg-rose-50',
            btnBg: 'bg-rose-600 hover:bg-rose-700 shadow-rose-100',
            border: 'border-rose-100'
        },
        warning: {
            icon: AlertTriangle,
            iconColor: 'text-amber-600',
            iconBg: 'bg-amber-50',
            btnBg: 'bg-amber-600 hover:bg-amber-700 shadow-amber-100',
            border: 'border-amber-100'
        },
        info: {
            icon: Check,
            iconColor: 'text-indigo-600',
            iconBg: 'bg-indigo-50',
            btnBg: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100',
            border: 'border-indigo-100'
        }
    };

    const { icon: Icon, iconColor, iconBg, btnBg, border } = themes[type];

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
                onClick={onClose}
            />
            <div className={`relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300 border ${border}`}>
                <div className="p-8">
                    <div className="flex items-center space-x-6">
                        <div className={`${iconBg} ${iconColor} p-4 rounded-3xl`}>
                            <Icon size={32} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight leading-tight">
                                {title}
                            </h3>
                            <p className="text-sm text-gray-500 font-medium mt-2 leading-relaxed italic">
                                "{message}"
                            </p>
                        </div>
                    </div>

                    <div className="mt-10 grid grid-cols-2 gap-4">
                        <button
                            onClick={onClose}
                            className="px-6 py-4 bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-gray-100 hover:text-gray-600 transition-all border border-gray-100"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`px-6 py-4 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-xl ${btnBg}`}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
