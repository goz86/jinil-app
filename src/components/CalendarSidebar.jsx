import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

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
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col h-fit sticky top-6 transition-colors duration-300">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">{monthNames[month]} {year}</h2>
                <div className="flex space-x-2">
                    <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {dayNames.map(d => (
                    <div key={d} className="text-xs font-semibold text-gray-400 dark:text-gray-500 py-2">{d}</div>
                ))}
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

                    const stats = taskCounts[dateStr];
                    const hasActiveTasks = stats && stats.active > 0;
                    const hasOnlyCompleted = stats && stats.active === 0 && stats.total > 0;
                    const holidayName = holidays[dateStr];

                    let dayStyle = 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700';
                    if (hasActiveTasks) {
                        dayStyle = 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 font-bold border border-red-200 dark:border-red-800/60';
                    } else if (hasOnlyCompleted) {
                        dayStyle = 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800/60';
                    } else if (isSelected) {
                        dayStyle = 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/30';
                    }

                    return (
                        <button
                            key={day}
                            onClick={() => handleDateClick(day)}
                            className={`
                                group aspect-square flex flex-col items-center justify-center rounded-full relative transition-all duration-200
                                ${dayStyle}
                                ${isSelected && (hasActiveTasks || hasOnlyCompleted) ? 'ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-gray-800 scale-105 shadow-sm' : isSelected ? 'scale-105' : ''}
                                ${isToday && !isSelected ? 'ring-2 ring-blue-400/60 ring-offset-1 dark:ring-offset-gray-800' : ''}
                            `}
                        >
                            {holidayName && (
                                <div className="absolute bottom-full mb-2 hidden group-hover:block z-50 whitespace-nowrap bg-red-500 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-xl translate-y-2 group-hover:translate-y-0 transition-all duration-200 pointer-events-none">
                                    {holidayName}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-red-500"></div>
                                </div>
                            )}

                            <span className={`text-sm ${holidayName && !isSelected && !hasActiveTasks && !hasOnlyCompleted ? 'text-red-500 font-bold' : ''}`}>{day}</span>
                        </button>
                    );
                })}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">{t('calendarLegend')}</h3>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <div className="w-3.5 h-3.5 rounded-full bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700 mr-2 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                    </div>
                    {t('hasActiveTasks')}
                </div>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700 mr-2 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    </div>
                    {t('hasCompletedTasks')}
                </div>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <div className="w-3.5 h-3.5 rounded-full bg-blue-600 mr-2"></div>
                    {t('selectedDate')}
                </div>
            </div>
        </div>
    );
}
