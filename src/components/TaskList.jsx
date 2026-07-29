import React from 'react';
import TaskItem from './TaskItem';
import { useLanguage } from '../contexts/LanguageContext';

export default function TaskList({ tasks, onToggle, onDelete, savedAccounts = [], isHidden, onToggleHidden }) {
    const { t } = useLanguage();

    if (isHidden) {
        return (
            <div 
                onClick={onToggleHidden}
                className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-10 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center text-center min-h-[260px] animate-in fade-in duration-300 cursor-pointer hover:border-blue-200 dark:hover:border-blue-800/50 hover:shadow-md transition-all my-2"
            >
                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/40 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400 shadow-sm group-hover:scale-105 transition-transform">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.025 10.025 0 013.68-.763c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m-3.565 1.57A3.75 3.75 0 1110.06 10.06m8.88 8.88l-15-15" />
                    </svg>
                </div>
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1.5 tracking-tight">
                    작업 목록이 가려져 있습니다
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mb-6 leading-relaxed">
                    보안 및 개인 정보 보호를 위해 작업 목록이 숨겨졌습니다. 클릭하여 내용을 확인하세요.
                </p>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onToggleHidden(); }}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all duration-200 cursor-pointer"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>작업 목록 보기</span>
                </button>
            </div>
        );
    }

    if (tasks.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-400 dark:text-gray-500 text-lg">{t('noTasks')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-1 animate-in fade-in duration-300">
            {tasks.map((task) => (
                <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={onToggle}
                    onDelete={onDelete}
                    savedAccounts={savedAccounts}
                />
            ))}
        </div>
    );
}
