import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function TaskItem({ task, onToggle, onDelete, savedAccounts = [] }) {
    const { t } = useLanguage();
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        if (task.completed || !task.time || !task.date) {
            setTimeLeft('');
            return;
        }

        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        
        if (task.date !== todayStr) {
            setTimeLeft('');
            return;
        }

        const [hours, minutes] = task.time.split(':').map(Number);
        const target = new Date(now);
        target.setHours(hours, minutes, 0, 0);

        const updateTimer = () => {
            const currentTime = new Date();
            const diff = target - currentTime;
            
            if (diff > 0) {
                const h = Math.floor(diff / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diff % (1000 * 60)) / 1000);
                
                const parts = [];
                if (h > 0) parts.push(`${h}${t('timeHours')}`);
                if (m > 0 || h > 0) parts.push(`${m}${t('timeMinutes')}`);
                parts.push(`${s}${t('timeSeconds')} ${t('timeSuffix')}`);
                
                setTimeLeft(parts.join(' '));
            } else {
                setTimeLeft(t('timePassed'));
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [task]);

    const getPriorityText = (priority) => {
        if (priority === 'urgent') return '급급급';
        if (priority === 'high' || priority === 'Quan trọng' || priority === 'CAO') return '급';
        if (priority === 'low' || priority === 'Không quan trọng') return t('priorityLow');
        return t('priorityNormal');
    };

    return (
        <div
            className={`group flex items-center justify-between p-4 mb-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border transition-all duration-300 ${task.completed ? 'border-gray-200 dark:border-slate-700/60 bg-gray-50 dark:bg-slate-800/50 opacity-75' : 'border-gray-100 dark:border-slate-700/80 hover:shadow-md'
                }`}
        >
            <div className="flex items-center space-x-4 flex-1">
                <button
                    onClick={() => onToggle(task.id)}
                    className={`w-6 h-6 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-colors duration-200 ${task.completed
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-gray-300 dark:border-slate-500 hover:border-blue-400'
                        }`}
                >
                    {task.completed && (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                </button>
                <div className="flex-1">
                    <p
                        className={`text-lg font-semibold transition-colors duration-200 ${task.completed ? 'text-gray-400 dark:text-slate-500 line-through' : 'text-gray-800 dark:text-slate-100'
                            }`}
                    >
                        {task.title}
                    </p>
                    <div className="flex flex-wrap items-center mt-1.5 gap-x-3 gap-y-2 text-xs text-gray-500 dark:text-slate-300 font-medium">
                        <span className="flex items-center">
                            <span className={`w-2 h-2 rounded-full mr-1.5 ${task.priority === 'urgent' ? 'bg-red-600' : task.priority === 'high' || task.priority === 'Quan trọng' || task.priority === 'CAO' ? 'bg-orange-400' : task.priority === 'low' || task.priority === 'Không quan trọng' ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
                            {getPriorityText(task.priority)}
                        </span>
                        
                        {task.assigneeName && (
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] ${task.completed ? 'bg-gray-100 text-gray-400 dark:bg-slate-700/50 dark:text-slate-500' : 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-100 dark:border-purple-800/40'}`}>
                                <span>{(() => {
                                    const acc = savedAccounts.find(a => (a.uid && a.uid === task.assignedByUid) || (a.email && a.email === task.assignedByUid) || (a.email && a.email.split('@')[0] === task.assignedByName));
                                    return acc?.alias || task.assignedByName || '나';
                                })()}</span>
                                <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                <span>{(() => {
                                    const acc = savedAccounts.find(a => (a.uid && a.uid === task.assigneeUid) || (a.email && a.email === task.assigneeUid) || (a.email && a.email.split('@')[0] === task.assigneeName));
                                    return acc?.alias || task.assigneeName;
                                })()}</span>
                            </span>
                        )}

                        <span className="flex items-center">
                            {task.date && task.date.includes('-')
                                ? task.date.split('-').reverse().join('/')
                                : t('today')}
                            {task.time ? ` ${task.time}` : ''}
                            {timeLeft && (
                                <span className={`ml-3 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide ${timeLeft === t('timePassed') ? 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800/40' : 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 animate-pulse'}`}>
                                    {timeLeft}
                                </span>
                            )}
                        </span>
                    </div>
                </div>
            </div>
            <button
                onClick={() => onDelete(task.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 dark:text-slate-500 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200 focus:opacity-100"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </div>
    );
}
