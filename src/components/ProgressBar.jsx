import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function ProgressBar({ total, completed }) {
    const { t } = useLanguage();
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    return (
        <div className="mb-6 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/80 transition-colors duration-300">
            <div className="flex justify-between items-end mb-2">
                <div>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100">{t('progressTitle')}</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-300 mt-1">
                        {completed} / {total} {t('tasksCompleted')}
                    </p>
                </div>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{percentage}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-slate-900/60 rounded-full h-3 mt-4 overflow-hidden border border-transparent dark:border-slate-700/50">
                <div
                    className="bg-blue-600 dark:bg-blue-500 h-3 rounded-full transition-all duration-500 ease-out shadow-xs"
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
}
