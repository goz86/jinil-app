import React, { useState } from 'react';
import MarketWidget from './MarketWidget';
import DeliveryWidget from './DeliveryWidget';
import { useLanguage } from '../contexts/LanguageContext';

export default function MarketDeliveryTabs({ selectedDate, deliveryCount, deliveries, onOpenClients, onOpenInventory }) {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('market'); // Only for market and delivery
    const deliveryLabel = `${t('delivery')} (${deliveryCount || 0})`;

    const inlineTabs = [
        {
            key: 'market', 
            label: t('marketWidgetTitle'), 
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
            )
        },
        {
            key: 'delivery', 
            label: deliveryLabel, 
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
            )
        }
    ];

    const modalTabs = [
        {
            key: 'clients', 
            label: t('clientAddressBook'), 
            onClick: onOpenClients,
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m3.22-11.08a4 4 0 117.56 0" />
                </svg>
            )
        },
        {
            key: 'inventory', 
            label: t('inventoryManagement'), 
            onClick: onOpenInventory,
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
            )
        }
    ];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-300 overflow-hidden">
            {/* 2x2 Tab Grid */}
            <div className="grid grid-cols-2">
                {/* Row 1: Market & Delivery (Inline) */}
                {inlineTabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 text-[12px] font-bold transition-all duration-300 border-b border-r last:border-r-0 border-gray-50 dark:border-gray-700 relative
                            ${activeTab === tab.key
                                ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                        {activeTab === tab.key && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full mx-8" />
                        )}
                    </button>
                ))}
                
                {/* Row 2: Clients & Inventory (Modals) */}
                {modalTabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={tab.onClick}
                        className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 text-[12px] font-bold text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all duration-300 border-r last:border-r-0 border-gray-50 dark:border-gray-700"
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Content for Inline Tabs */}
            <div className="p-5 border-t border-gray-50 dark:border-gray-700">
                {activeTab === 'market' ? (
                    <MarketWidget />
                ) : (
                    <DeliveryWidget selectedDate={selectedDate} deliveries={deliveries} />
                )}
            </div>
        </div>
    );
}
