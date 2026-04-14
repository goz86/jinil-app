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
        <div className="flex space-x-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-x-auto">
            {filters.map((f) => (
                <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap flex-1 ${filter === f.id
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                        }`}
                >
                    {f.label}
                </button>
            ))}
        </div>
    );
}
