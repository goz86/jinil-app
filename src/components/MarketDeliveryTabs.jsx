import React, { useState, useEffect } from 'react';
import MarketWidget from './MarketWidget';
import DeliveryWidget from './DeliveryWidget';
import InvoiceWidget from './InvoiceWidget';
import InvoiceModal from './InvoiceModal';
import InTransitShipmentModal from './InTransitShipmentModal';
import NotesModal from './NotesModal';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

export default function MarketDeliveryTabs({ selectedDate, deliveryCount, deliveries, onOpenClients, onOpenInventory, onOpenLabelPrint, user }) {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('market'); // Only for market and delivery inline
    const [isInTransitModalOpen, setIsInTransitModalOpen] = useState(false);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const [liveActiveCount, setLiveActiveCount] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const fetchCount = async () => {
            try {
                const { data, error } = await supabase.rpc('search_public_b2b_shipments', {
                    p_query: '25',
                    p_limit: 100
                });

                if (!error && data && isMounted) {
                    const active = data.filter((s) => s.tracking_status_label !== '배달완료');
                    setLiveActiveCount(active.length);
                }
            } catch (err) {
                console.error('Failed to fetch live shipment count:', err);
            }
        };
        void fetchCount();
        const interval = setInterval(() => void fetchCount(), 30000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    const countToDisplay = liveActiveCount !== null ? liveActiveCount : (deliveryCount || 0);
    const deliveryLabel = `${t('delivery')} (${countToDisplay})`;

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
        },
        {
            key: 'invoice',
            label: '거래명세서',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            )
        },
        {
            key: 'notes',
            label: t('notes') || '노트',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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
        },
        {
            key: 'homepage',
            label: '홈페이지',
            onClick: () => window.electronAPI?.openExternal('https://www.jinil.top/') ?? window.open('https://www.jinil.top/', '_blank'),
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            )
        },
        {
            key: 'labelPrint',
            label: t('labelPrinting'),
            onClick: onOpenLabelPrint,
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
            )
        }
    ];

    return (
        <div className="backdrop-blur-md bg-white/75 dark:bg-slate-800/75 rounded-3xl shadow-sm border border-white/80 dark:border-slate-700/70 transition-all duration-300 overflow-hidden">
            {/* Row 1: Market, Delivery, Invoice & Notes (Inline Tabs - 4 cols) */}
            <div className="grid grid-cols-4">
                {inlineTabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => {
                            if (tab.key === 'delivery') {
                                setIsInTransitModalOpen(true);
                            } else if (tab.key === 'invoice') {
                                setIsInvoiceModalOpen(true);
                            } else if (tab.key === 'notes') {
                                setIsNotesModalOpen(true);
                            } else {
                                setActiveTab(tab.key);
                            }
                        }}
                        className={`flex flex-col items-center justify-center gap-1.5 py-3.5 px-1 text-[11px] font-bold transition-all duration-300 border-b border-r last:border-r-0 border-gray-100 dark:border-slate-700/80 relative cursor-pointer
                            ${activeTab === tab.key
                                ? 'text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/40 font-black'
                                : 'text-gray-500 dark:text-slate-300 hover:text-gray-800 dark:hover:text-white dark:hover:bg-slate-700/40'
                            }`}
                    >
                        {tab.icon}
                        <span className="whitespace-nowrap truncate max-w-full px-0.5">{tab.label}</span>
                        {activeTab === tab.key && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full mx-4 shadow-xs" />
                        )}
                    </button>
                ))}
            </div>
                
            {/* Row 2: Clients, Inventory, Order Management & Label Print (Modals) */}
            <div className="grid grid-cols-4 border-b border-gray-100 dark:border-slate-700/80 bg-gray-50/50 dark:bg-slate-900/30">
                {modalTabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={tab.onClick}
                        className="flex flex-col items-center justify-center gap-1.5 py-3 px-1 text-[11px] font-bold text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-all duration-200 border-r last:border-r-0 border-gray-100 dark:border-slate-700/80 cursor-pointer"
                    >
                        {tab.icon}
                        <span className="whitespace-nowrap">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Content for Inline Tabs */}
            <div className="p-5">
                {activeTab === 'market' ? (
                    <MarketWidget />
                ) : (
                    <DeliveryWidget
                        selectedDate={selectedDate}
                        deliveries={deliveries}
                        onOpenInTransitModal={() => setIsInTransitModalOpen(true)}
                    />
                )}
            </div>

            {/* In-Transit Shipment Popup Modal */}
            <InTransitShipmentModal
                isOpen={isInTransitModalOpen}
                onClose={() => setIsInTransitModalOpen(false)}
                onRefreshCount={(count) => setLiveActiveCount(count)}
            />

            {/* Invoice Statement Generator Popup Modal */}
            <InvoiceModal
                isOpen={isInvoiceModalOpen}
                onClose={() => setIsInvoiceModalOpen(false)}
            />

            {/* Notion-Style Shared Notes Modal */}
            <NotesModal
                isOpen={isNotesModalOpen}
                onClose={() => setIsNotesModalOpen(false)}
                user={user}
            />
        </div>
    );
}

