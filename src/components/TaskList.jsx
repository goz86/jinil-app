import React from 'react';
import TaskItem from './TaskItem';
import { useLanguage } from '../contexts/LanguageContext';

export default function TaskList({ tasks, onToggle, onDelete, savedAccounts = [], isHidden, onToggleHidden }) {
    const { t } = useLanguage();

    if (isHidden) {
        return (
            <div 
                onClick={onToggleHidden}
                className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-10 border border-gray-100 dark:border-gray-700/60 shadow-lg shadow-blue-500/5 flex flex-col items-center justify-center text-center min-h-[280px] animate-in fade-in duration-300 cursor-pointer hover:border-blue-300 dark:hover:border-blue-600/50 hover:shadow-xl transition-all duration-300 my-2 relative overflow-hidden"
            >
                {/* 3D Glowing Security Shield Icon */}
                <div className="relative mb-5">
                    <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 opacity-30 blur-xl group-hover:opacity-60 transition-opacity duration-500"></div>
                    <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-[0_12px_25px_-5px_rgba(59,130,246,0.5)] border border-white/30 group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-8 h-8 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                </div>

                <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-2 tracking-tight">
                    작업 목록이 가려져 있습니다
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mb-6 leading-relaxed">
                    보안 및 개인 정보 보호를 위해 작업 목록이 숨겨졌습니다. 클릭하여 내용을 확인하세요.
                </p>

                {/* 3D Modern Button */}
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onToggleHidden(); }}
                    className="relative group/btn overflow-hidden rounded-2xl px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-xs shadow-[0_8px_20px_-4px_rgba(59,130,246,0.5)] hover:shadow-[0_12px_25px_-4px_rgba(59,130,246,0.7)] active:scale-95 transition-all duration-200 cursor-pointer flex items-center gap-2.5 border border-white/20"
                >
                    <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <span className="tracking-wide">작업 목록 보기</span>
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
