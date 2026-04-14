import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function ProgressBar({ total, completed }) {
    const { t } = useLanguage();
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    return (
        <div className="mb-6 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-end mb-2">
                <div>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">{t('progressTitle')}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {completed} / {total} {t('tasksCompleted')}
                    </p>
                </div>
                <span className="text-2xl font-bold text-blue-600">{percentage}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 mt-4 overflow-hidden">
                <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
}
