import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import WeatherWidget from './WeatherWidget';

export default function CalendarSidebar({ tasks, selectedDate, setSelectedDate }) {
    const { t } = useLanguage();
    const [currentDate, setCurrentDate] = useState(new Date(selectedDate || new Date()));
    const [holidays, setHolidays] = useState({});

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const blanks = Array.from({ length: firstDay }, (_, i) => i);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    useEffect(() => {
        const fetchHolidays = async () => {
            try {
                const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/KR`);
                if (response.ok) {
                    const data = await response.json();
                    const holidaysMap = {};
                    data.forEach(holiday => {
                        holidaysMap[holiday.date] = holiday.localName;
                    });
                    setHolidays(holidaysMap);
                }
            } catch (error) {
                console.error("Error fetching holidays:", error);
            }
        };
        fetchHolidays();
    }, [year]);

    const taskCounts = tasks.reduce((acc, task) => {
        if (task.date) {
            if (!acc[task.date]) acc[task.date] = { total: 0, active: 0 };
            acc[task.date].total += 1;
            if (!task.completed) acc[task.date].active += 1;
        }
        return acc;
    }, {});

    const handleDateClick = (day) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (selectedDate === dateStr) {
            setSelectedDate(null);
        } else {
            setSelectedDate(dateStr);
        }
    };

    const monthNames = [
        t('jan'), t('feb'), t('mar'), t('apr'), t('may'), t('jun'),
        t('jul'), t('aug'), t('sep'), t('oct'), t('nov'), t('dec')
    ];

    const dayNames = [t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')];

    return (
        <div className="backdrop-blur-xl bg-white/95 dark:bg-slate-800/95 rounded-3xl shadow-lg border border-white/80 dark:border-slate-700/80 p-6 flex flex-col h-fit sticky top-6 z-30 transition-all duration-300">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">{monthNames[month]} {year}</h2>
                <div className="flex space-x-2">
                    <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-300 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-300 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {dayNames.map((d, index) => {
                    const isSun = index === 0;
                    const isSat = index === 6;
                    return (
                        <div 
                            key={d} 
                            className={`text-xs font-bold py-2 ${
                                isSun ? 'text-red-500 dark:text-red-400' :
                                isSat ? 'text-blue-500 dark:text-blue-400' :
                                'text-gray-400 dark:text-slate-400'
                            }`}
                        >
                            {d}
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
                {blanks.map(b => (
                    <div key={`blank-${b}`} className="aspect-square"></div>
                ))}

                {days.map(day => {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isSelected = selectedDate === dateStr;

                    const now = new Date();
                    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                    const isToday = todayStr === dateStr;

                    const dayOfWeek = new Date(year, month, day).getDay(); // 0 = Sun, 6 = Sat
                    const isSunday = dayOfWeek === 0;
                    const isSaturday = dayOfWeek === 6;

                    const stats = taskCounts[dateStr];
                    const hasActiveTasks = stats && stats.active > 0;
                    const hasOnlyCompleted = stats && stats.active === 0 && stats.total > 0;
                    const holidayName = holidays[dateStr];

                    let dayStyle = 'text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/60 font-medium';

                    if (isSelected) {
                        dayStyle = 'bg-blue-600 text-white font-black shadow-lg shadow-blue-500/30 ring-2 ring-blue-400 dark:ring-blue-400';
                    } else if (isToday) {
                        if (hasActiveTasks) {
                            dayStyle = 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-200 font-extrabold border-2 border-blue-500 dark:border-blue-400 shadow-sm';
                        } else if (hasOnlyCompleted) {
                            dayStyle = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-200 font-extrabold border-2 border-blue-500 dark:border-blue-400 shadow-sm';
                        } else {
                            dayStyle = 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-200 font-black border-2 border-blue-500 dark:border-blue-400 shadow-sm';
                        }
                    } else if (hasActiveTasks) {
                        dayStyle = 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 font-bold border border-red-200 dark:border-red-800/50';
                    } else if (hasOnlyCompleted) {
                        dayStyle = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800/50';
                    } else if (isSunday || holidayName) {
                        dayStyle = 'text-red-500 dark:text-red-400 font-bold hover:bg-red-50 dark:hover:bg-red-950/30';
                    } else if (isSaturday) {
                        dayStyle = 'text-blue-500 dark:text-blue-400 font-bold hover:bg-blue-50 dark:hover:bg-blue-950/30';
                    }

                    return (
                        <button
                            key={day}
                            onClick={() => handleDateClick(day)}
                            className={`
                                group aspect-square flex flex-col items-center justify-center rounded-full relative transition-all duration-200 cursor-pointer active:scale-95
                                ${dayStyle}
                                ${isSelected ? 'scale-105' : ''}
                            `}
                        >
                            {/* Today Pulse Badge Dot */}
                            {isToday && (
                                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400 ring-2 ring-white dark:ring-slate-800 shadow-md animate-pulse"></span>
                            )}

                            {holidayName && (
                                <div className="absolute bottom-full mb-2 hidden group-hover:block z-50 whitespace-nowrap bg-red-500 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-xl translate-y-2 group-hover:translate-y-0 transition-all duration-200 pointer-events-none">
                                    {holidayName}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-red-500"></div>
                                </div>
                            )}

                            <span className={`text-sm ${
                                isSelected 
                                    ? 'text-white' 
                                    : (isSunday || holidayName) && !hasActiveTasks && !hasOnlyCompleted && !isToday 
                                        ? 'text-red-500 dark:text-red-400 font-bold' 
                                        : isSaturday && !hasActiveTasks && !hasOnlyCompleted && !isToday 
                                            ? 'text-blue-500 dark:text-blue-400 font-bold' 
                                            : ''
                            }`}>
                                {day}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-slate-700/80 space-y-4">
                {/* 일정 안내 (Schedule Guide) 2x2 Grid */}
                <div>
                    <h3 className="text-xs font-bold text-gray-800 dark:text-slate-200 mb-2.5 flex items-center justify-between">
                        <span>{t('calendarLegend')}</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-y-2.5 gap-x-2 text-xs text-gray-700 dark:text-slate-300 px-1">
                        <div className="flex items-center">
                            <div className="w-3.5 h-3.5 rounded-full bg-blue-500/20 border-2 border-blue-600 dark:border-blue-400 mr-2 flex items-center justify-center shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></div>
                            </div>
                            <span className="font-bold text-blue-700 dark:text-blue-300 text-[11px] whitespace-nowrap">오늘 (Today)</span>
                        </div>
                        <div className="flex items-center text-[11px] font-semibold whitespace-nowrap">
                            <div className="w-3.5 h-3.5 rounded-full bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-700/60 mr-2 flex items-center justify-center shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400"></div>
                            </div>
                            {t('hasActiveTasks')}
                        </div>
                        <div className="flex items-center text-[11px] font-semibold whitespace-nowrap">
                            <div className="w-3.5 h-3.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700/60 mr-2 flex items-center justify-center shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"></div>
                            </div>
                            {t('hasCompletedTasks')}
                        </div>
                        <div className="flex items-center text-[11px] font-semibold whitespace-nowrap">
                            <div className="w-3.5 h-3.5 rounded-full bg-blue-600 mr-2 shrink-0"></div>
                            {t('selectedDate')}
                        </div>
                    </div>
                </div>

                {/* Glassmorphism Realtime Weather Card */}
                <WeatherWidget />
            </div>

        </div>
    );
}
