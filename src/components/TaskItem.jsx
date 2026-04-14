import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function TaskItem({ task, onToggle, onDelete }) {
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
            className={`group flex items-center justify-between p-4 mb-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border transition-all duration-300 ${task.completed ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-75' : 'border-gray-100 dark:border-gray-700 hover:shadow-md'
                }`}
        >
            <div className="flex items-center space-x-4 flex-1">
                <button
                    onClick={() => onToggle(task.id)}
                    className={`w-6 h-6 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-colors duration-200 ${task.completed
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-gray-300 dark:border-gray-500 hover:border-blue-400'
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
                        className={`text-lg font-medium transition-colors duration-200 ${task.completed ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-800 dark:text-white'
                            }`}
                    >
                        {task.title}
                    </p>
                    <div className="flex items-center mt-1 space-x-3 text-xs text-gray-500 dark:text-gray-400 font-medium">
                        <span className="flex items-center">
                            <span className={`w-2 h-2 rounded-full mr-1.5 ${task.priority === 'urgent' ? 'bg-red-600' : task.priority === 'high' || task.priority === 'Quan trọng' || task.priority === 'CAO' ? 'bg-orange-400' : task.priority === 'low' || task.priority === 'Không quan trọng' ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
                            {getPriorityText(task.priority)}
                        </span>
                        <span>•</span>
                        <span>
                            {task.date && task.date.includes('-')
                                ? task.date.split('-').reverse().join('/')
                                : t('today')}
                            {task.time ? ` ${task.time}` : ''}
                            {timeLeft && (
                                <span className={`ml-3 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide ${timeLeft === t('timePassed') ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 animate-pulse'}`}>
                                    {timeLeft}
                                </span>
                            )}
                        </span>
                    </div>
                </div>
            </div>
            <button
                onClick={() => onDelete(task.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 dark:text-gray-500 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200 focus:opacity-100"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </div>
    );
}
