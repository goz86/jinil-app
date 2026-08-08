import React from 'react';
import TaskItem from './TaskItem';
import { useLanguage } from '../contexts/LanguageContext';

export default function TaskList({ tasks, onToggle, onDelete, savedAccounts = [], isHidden, onToggleHidden }) {
    const { t } = useLanguage();

    if (isHidden) {
        return (
            <div 
                onClick={onToggleHidden}
                className="group bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center min-h-[250px] animate-in fade-in duration-300 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 my-2 relative overflow-hidden"
            >
                <div className="mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center border border-slate-200/80 dark:border-slate-700/80 shadow-sm group-hover:scale-105 transition-transform duration-200">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5 tracking-tight">
                    작업 목록이 가려져 있습니다
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-5 leading-relaxed">
                    보안 및 개인 정보 보호를 위해 작업 목록이 숨겨졌습니다. 클릭하여 내용을 확인하세요.
                </p>

                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onToggleHidden(); }}
                    className="rounded-xl px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold text-xs shadow-sm active:scale-95 transition-all duration-200 cursor-pointer flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                    <span className="tracking-tight">작업 목록 보기</span>
                </button>
            </div>
        );
    }

    if (tasks.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-400 dark:text-slate-400 text-lg">{t('noTasks')}</p>
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
