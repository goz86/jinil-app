import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function TaskFilter({ filter, setFilter }) {
    const { t } = useLanguage();
    const filters = [
        { id: 'all', label: t('filterAll') },
        { id: 'active', label: t('filterActive') },
        { id: 'completed', label: t('filterCompleted') },
    ];

    return (
        <div className="flex space-x-2 p-1 bg-gray-100 dark:bg-slate-900/60 rounded-xl border border-gray-200/50 dark:border-slate-700/60 overflow-x-auto">
            {filters.map((f) => (
                <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap flex-1 cursor-pointer ${filter === f.id
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs font-bold'
                        : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-slate-800/50'
                        }`}
                >
                    {f.label}
                </button>
            ))}
        </div>
    );
}
