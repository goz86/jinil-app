import React, { useState } from 'react';
import MarketWidget from './MarketWidget';
import DeliveryWidget from './DeliveryWidget';
import { useLanguage } from '../contexts/LanguageContext';

export default function MarketDeliveryTabs({ selectedDate, deliveryCount, deliveries }) {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('market');
    const deliveryLabel = `${t('delivery')} (${deliveryCount || 0})`;

    const tabs = [
        {
            key: 'market', label: t('marketWidgetTitle'), icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
            )
        },
        {
            key: 'delivery', label: deliveryLabel, icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
            )
        }
    ];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300 overflow-hidden">
            {/* Tab Header */}
            <div className="flex border-b border-gray-100 dark:border-gray-700">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold transition-all duration-200 relative
                            ${activeTab === tab.key
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                        {/* Active indicator */}
                        {activeTab === tab.key && (
                            <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-500 dark:bg-blue-400 rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="p-5">
                {activeTab === 'market' ? <MarketWidget /> : <DeliveryWidget selectedDate={selectedDate} deliveries={deliveries} />}
            </div>
        </div>
    );
}
