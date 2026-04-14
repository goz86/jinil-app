import React, { useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AnalyticsModal({ isOpen, onClose, tasks, deliveryData }) {
    const { t } = useLanguage();

    const chartData = useMemo(() => {
        const data = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
            const displayDate = `${d.getDate()}/${d.getMonth() + 1}`;

            // Tasks
            const dayTasks = tasks.filter(t => t.date === dateStr);
            const completed = dayTasks.filter(t => t.completed).length;
            const total = dayTasks.length;

            // Deliveries
            const startOfDay = new Date(d.setHours(0, 0, 0, 0));
            const endOfDay = new Date(d.setHours(23, 59, 59, 999));
            
            const dayDeliveries = deliveryData.filter(del => {
                if (!del.timestamp) return false;
                let delDate;
                if (del.timestamp.toDate) {
                    delDate = del.timestamp.toDate();
                } else {
                    delDate = new Date(del.timestamp);
                }
                return delDate >= startOfDay && delDate <= endOfDay;
            });

            data.push({
                name: displayDate,
                '전체 작업': total,
                '완료된 작업': completed,
                '택배': dayDeliveries.length
            });
        }
        return data;
    }, [tasks, deliveryData, t]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-[90%] max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                        통계 및 보고서
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <svg className="w-6 h-6 text-gray-500 hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-8 flex-1">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-2xl border border-blue-100 dark:border-blue-800">
                            <h3 className="text-blue-800 dark:text-blue-300 text-sm font-semibold mb-2">최근 7일 전체 작업</h3>
                            <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                                {chartData.reduce((acc, curr) => acc + (curr['전체 작업'] || 0), 0)}
                            </p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/30 p-6 rounded-2xl border border-green-100 dark:border-green-800">
                            <h3 className="text-green-800 dark:text-green-300 text-sm font-semibold mb-2">완료된 작업</h3>
                            <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                                {chartData.reduce((acc, curr) => acc + (curr['완료된 작업'] || 0), 0)}
                            </p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/30 p-6 rounded-2xl border border-purple-100 dark:border-purple-800">
                            <h3 className="text-purple-800 dark:text-purple-300 text-sm font-semibold mb-2">스캔된 택배</h3>
                            <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                                {chartData.reduce((acc, curr) => acc + (curr['택배'] || 0), 0)}
                            </p>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Tasks Chart */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col">
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6 text-center">최근 7일 작업 진행률</h3>
                            <div className="w-full flex-1 min-h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} stroke="#9CA3AF" />
                                        <YAxis axisLine={false} tickLine={false} stroke="#9CA3AF" allowDecimals={false} />
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            itemStyle={{ fontWeight: 500 }}
                                        />
                                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                        <Line type="monotone" name="전체 작업" dataKey="전체 작업" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                        <Line type="monotone" name="완료된 작업" dataKey="완료된 작업" stroke="#10B981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Deliveries Chart */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col">
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6 text-center">최근 7일 택배 등록량</h3>
                            <div className="w-full flex-1 min-h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} stroke="#9CA3AF" />
                                        <YAxis axisLine={false} tickLine={false} stroke="#9CA3AF" allowDecimals={false} />
                                        <Tooltip 
                                            cursor={{ fill: 'transparent' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            itemStyle={{ fontWeight: 500 }}
                                        />
                                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                        <Bar name="택배" dataKey="택배" fill="#8B5CF6" radius={[6, 6, 0, 0]} maxBarSize={50} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
