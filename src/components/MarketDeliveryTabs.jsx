import React, { useState } from 'react';
import MarketWidget from './MarketWidget';
import DeliveryWidget from './DeliveryWidget';
import ClientAddressBook from './ClientAddressBook';
import InventoryManagement from './InventoryManagement';
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
        },
        {
            key: 'clients', label: t('clientAddressBook'), icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m3.22-11.08a4 4 0 117.56 0" />
                </svg>
            )
        },
        {
            key: 'inventory', label: t('inventoryManagement'), icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
            )
        }
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'market': return <MarketWidget />;
            case 'delivery': return <DeliveryWidget selectedDate={selectedDate} deliveries={deliveries} />;
            case 'clients': return <ClientAddressBook />;
            case 'inventory': return <InventoryManagement />;
            default: return <MarketWidget />;
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300 overflow-hidden">
            {/* Tab Header */}
            <div className="flex border-b border-gray-100 dark:border-gray-700 overflow-x-auto scroller-hide">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 px-4 text-[13px] font-semibold transition-all duration-200 relative whitespace-nowrap
                            ${activeTab === tab.key
                                ? 'text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/10'
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
            <div className={`p-5 ${activeTab === 'clients' || activeTab === 'inventory' ? 'max-w-full overflow-x-hidden' : ''}`}>
                {renderContent()}
            </div>
        </div>
    );
}
