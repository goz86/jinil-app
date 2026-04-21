import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function TaskInput({ onAdd }) {
    const { t } = useLanguage();
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState('normal');
    const [time, setTime] = useState('');
    const [timeLeft, setTimeLeft] = useState('');
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [tempHour, setTempHour] = useState('');
    const [tempMinute, setTempMinute] = useState('');
    const timePickerRef = useRef(null);
    const hourScrollRef = useRef(null);
    const minuteScrollRef = useRef(null);

    useEffect(() => {
        if (!time) {
            setTimeLeft('');
            return;
        }

        const interval = setInterval(() => {
            const now = new Date();
            const [hours, minutes] = time.split(':').map(Number);
            const target = new Date(now);
            target.setHours(hours, minutes, 0, 0);

            const diff = target - now;
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
        }, 1000);

        return () => clearInterval(interval);
    }, [time]);

    // Close time picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (timePickerRef.current && !timePickerRef.current.contains(e.target)) {
                setShowTimePicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Auto-scroll to selected time when picker opens
    useEffect(() => {
        if (showTimePicker) {
            // Small timeout to ensure DOM is rendered
            setTimeout(() => {
                if (hourScrollRef.current) {
                    const activeHour = hourScrollRef.current.querySelector('[data-active="true"]');
                    if (activeHour) {
                        activeHour.scrollIntoView({ block: 'center', behavior: 'auto' });
                    }
                }
                if (minuteScrollRef.current) {
                    const activeMinute = minuteScrollRef.current.querySelector('[data-active="true"]');
                    if (activeMinute) {
                        activeMinute.scrollIntoView({ block: 'center', behavior: 'auto' });
                    }
                }
            }, 50);
        }
    }, [showTimePicker]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (title.trim()) {
            onAdd(title, priority, time);
            setTitle('');
            setPriority('normal');
            setTime('');
            setTempHour('');
            setTempMinute('');
        }
    };

    const openTimePicker = () => {
        if (time) {
            const [h, m] = time.split(':');
            setTempHour(h);
            setTempMinute(m);
        } else {
            const now = new Date();
            const h = String(now.getHours()).padStart(2, '0');
            // Round minutes to the nearest multiple of 5 to match the picker options
            const rawMinutes = now.getMinutes();
            let roundedMinutes = Math.round(rawMinutes / 5) * 5;
            if (roundedMinutes === 60) roundedMinutes = 55; // Keep it within 0-55
            
            const m = String(roundedMinutes).padStart(2, '0');
            
            setTempHour(h);
            setTempMinute(m);
        }
        setShowTimePicker(true);
    };

    const confirmTime = () => {
        if (tempHour && tempMinute) {
            setTime(`${tempHour.padStart(2, '0')}:${tempMinute.padStart(2, '0')}`);
        }
        setShowTimePicker(false);
    };

    const clearTime = () => {
        setTime('');
        setTempHour('');
        setTempMinute('');
        setShowTimePicker(false);
    };

    const priorities = [
        { id: 'normal', label: t('priorityNormal'), color: 'bg-yellow-400', ring: 'ring-yellow-300', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-300 dark:border-yellow-700', text: 'text-yellow-700 dark:text-yellow-300' },
        { id: 'high', label: '급', color: 'bg-orange-400', ring: 'ring-orange-300', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-300 dark:border-orange-700', text: 'text-orange-700 dark:text-orange-300' },
        { id: 'urgent', label: '급급급', color: 'bg-red-500', ring: 'ring-red-300', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-300 dark:border-red-700', text: 'text-red-700 dark:text-red-300' },
    ];

    const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

    return (
        <form onSubmit={handleSubmit} className="mb-6 relative flex flex-col gap-3">
            {/* Title input row */}
            <div className="relative">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('addTaskPlaceholder')}
                    className="w-full pl-6 pr-16 py-4 border-none rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-700 dark:text-white text-lg transition-shadow duration-200 hover:shadow-md"
                />
                <button
                    type="submit"
                    disabled={!title.trim()}
                    className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white p-2 rounded-xl aspect-square flex items-center justify-center shadow-md transition-colors duration-200"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>

            {/* Priority pills + Time picker row */}
            <div className="flex items-center gap-2 px-1 flex-wrap">
                {/* Priority pill buttons */}
                {priorities.map((p) => (
                    <button
                        key={p.id}
                        type="button"
                        onClick={() => setPriority(p.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200 cursor-pointer select-none
                            ${priority === p.id
                                ? `${p.bg} ${p.border} ${p.text} ring-2 ${p.ring} shadow-sm scale-105`
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                            }`}
                    >
                        <span className={`w-2.5 h-2.5 rounded-full ${p.color} ${priority === p.id ? 'animate-pulse' : ''}`}></span>
                        {p.label}
                    </button>
                ))}

                {/* Divider */}
                <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1"></div>

                {/* Time picker button */}
                <div className="relative" ref={timePickerRef}>
                    <button
                        type="button"
                        onClick={openTimePicker}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 cursor-pointer
                            ${time
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-gray-300'
                            }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {time || '--:--'}
                        {time && (
                            <span
                                onClick={(e) => { e.stopPropagation(); clearTime(); }}
                                className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-500"
                            >
                                ×
                            </span>
                        )}
                    </button>

                    {/* Time picker dropdown */}
                    {showTimePicker && (
                        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl shadow-xl p-3 z-50 w-56 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex gap-2 mb-3">
                                {/* Hour column */}
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 text-center">시</p>
                                    <div ref={hourScrollRef} className="h-36 overflow-y-auto custom-scrollbar rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                        {hours.map(h => (
                                            <button
                                                key={h}
                                                type="button"
                                                onClick={() => setTempHour(h)}
                                                data-active={tempHour === h}
                                                className={`w-full py-1.5 text-sm font-medium rounded-lg transition-all ${tempHour === h
                                                    ? 'bg-blue-500 text-white shadow-sm'
                                                    : 'text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                                                }`}
                                            >
                                                {h}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {/* Separator */}
                                <div className="flex items-center text-2xl font-bold text-gray-300 dark:text-gray-500 pt-5">:</div>
                                {/* Minute column */}
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 text-center">분</p>
                                    <div ref={minuteScrollRef} className="h-36 overflow-y-auto custom-scrollbar rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                        {minutes.map(m => (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() => setTempMinute(m)}
                                                data-active={tempMinute === m}
                                                className={`w-full py-1.5 text-sm font-medium rounded-lg transition-all ${tempMinute === m
                                                    ? 'bg-blue-500 text-white shadow-sm'
                                                    : 'text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                                                }`}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            {/* Preview + Confirm */}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                                    {tempHour || '--'}:{tempMinute || '--'}
                                </span>
                                <div className="flex gap-1.5">
                                    <button type="button" onClick={clearTime} className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                        삭제
                                    </button>
                                    <button type="button" onClick={confirmTime} className="px-3 py-1 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-lg shadow-sm transition-colors">
                                        확인
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Countdown display */}
                {timeLeft && (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${timeLeft === t('timePassed') ? 'bg-red-50 dark:bg-red-900/30 text-red-500' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 animate-pulse'}`}>
                        {timeLeft}
                    </span>
                )}
            </div>
        </form>
    );
}
