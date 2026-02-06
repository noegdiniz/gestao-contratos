'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useState } from 'react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems?: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange?: (limit: number) => void;
    pageSizeOptions?: number[];
}

export function Pagination({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange,
    pageSizeOptions = [10, 25, 50, 100]
}: PaginationProps) {
    const [jumpValue, setJumpValue] = useState('');

    if (totalPages <= 1 && !onItemsPerPageChange) return null;

    const startItem = totalItems ? (currentPage - 1) * itemsPerPage + 1 : 0;
    const endItem = totalItems ? Math.min(currentPage * itemsPerPage, totalItems) : 0;

    // Generate page numbers to display
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                pages.push(currentPage - 1);
                pages.push(currentPage);
                pages.push(currentPage + 1);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    const handleJump = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const page = parseInt(jumpValue);
            if (page >= 1 && page <= totalPages) {
                onPageChange(page);
                setJumpValue('');
            }
        }
    };

    return (
        <div className="bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                {/* Left side: Results info + Page size */}
                <div className="flex flex-col sm:flex-row items-center gap-4 text-sm">
                    {/* Results info */}
                    {totalItems !== undefined && (
                        <p className="text-gray-500">
                            Mostrando{' '}
                            <span className="font-bold text-gray-700">{startItem}-{endItem}</span>
                            {' '}de{' '}
                            <span className="font-bold text-indigo-600">{totalItems}</span>
                        </p>
                    )}

                    {/* Page size selector */}
                    {onItemsPerPageChange && (
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500">Exibir:</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer hover:bg-gray-100 transition-all"
                            >
                                {pageSizeOptions.map(size => (
                                    <option key={size} value={size}>{size}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Center: Page navigation */}
                <div className="flex items-center gap-1">
                    {/* First page */}
                    <button
                        onClick={() => onPageChange(1)}
                        disabled={currentPage === 1}
                        className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-all"
                        title="Primeira página"
                    >
                        <ChevronsLeft size={18} />
                    </button>

                    {/* Previous page */}
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-all"
                        title="Página anterior"
                    >
                        <ChevronLeft size={18} />
                    </button>

                    {/* Page numbers */}
                    <div className="flex items-center gap-1 mx-2">
                        {getPageNumbers().map((page, index) => (
                            page === '...' ? (
                                <span key={`ellipsis-${index}`} className="px-1 text-gray-300 text-xs select-none">
                                    •••
                                </span>
                            ) : (
                                <button
                                    key={page}
                                    onClick={() => onPageChange(page as number)}
                                    className={`
                                        min-w-[38px] h-[38px] rounded-xl text-sm font-bold transition-all duration-200
                                        ${currentPage === page
                                            ? 'bg-gradient-to-br from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/30 scale-105'
                                            : 'text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'
                                        }
                                    `}
                                >
                                    {page}
                                </button>
                            )
                        ))}
                    </div>

                    {/* Next page */}
                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-all"
                        title="Próxima página"
                    >
                        <ChevronRight size={18} />
                    </button>

                    {/* Last page */}
                    <button
                        onClick={() => onPageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-all"
                        title="Última página"
                    >
                        <ChevronsRight size={18} />
                    </button>
                </div>

                {/* Right side: Jump to page */}
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Ir para:</span>
                    <input
                        type="number"
                        min={1}
                        max={totalPages}
                        value={jumpValue}
                        onChange={(e) => setJumpValue(e.target.value)}
                        onKeyDown={handleJump}
                        placeholder={String(currentPage)}
                        className="w-16 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 text-center focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-gray-400 text-xs">de {totalPages}</span>
                </div>
            </div>
        </div>
    );
}
