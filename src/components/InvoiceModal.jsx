import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import invoiceHtml from '../../public/invoice-app/index.html?raw';
import { subscribeClients, getCachedClients } from '../services/clientAddressService';

export default function InvoiceModal({ isOpen, onClose }) {
    const iframeRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;

        const sendClients = (clients) => {
            if (!iframeRef.current || !iframeRef.current.contentWindow) return;
            const normalized = (clients || []).map(c => ({
                name: (c.name || c.company_name || '').trim(),
                rep: c.representative || c.rep || c.contactName || '',
                tel: c.phone || c.tel || c.courier_phone || '',
                addr: c.address || c.addr || c.recipient_address || c.default_address || '',
                biz: c.biz || c.business_number || c.bizNumber || '',
                bizType: c.bizType || c.biz_type || '',
                itemType: c.itemType || c.item_type || ''
            })).filter(c => c.name);

            iframeRef.current.contentWindow.postMessage({
                type: 'SET_CLIENT_ADDRESS_BOOK',
                clients: normalized
            }, '*');
        };

        // Listen for iframe readiness or requests
        const handleMessage = (e) => {
            if (e.data && (e.data.type === 'IFRAME_READY' || e.data.type === 'GET_CLIENT_ADDRESS_BOOK')) {
                sendClients(getCachedClients());
            }
        };
        window.addEventListener('message', handleMessage);

        // Realtime subscription from clientAddressService
        const unsubscribe = subscribeClients((clients) => {
            sendClients(clients);
        });

        // Backup timer to guarantee transmission after iframe renders
        const timer1 = setTimeout(() => sendClients(getCachedClients()), 150);
        const timer2 = setTimeout(() => sendClients(getCachedClients()), 600);

        return () => {
            window.removeEventListener('message', handleMessage);
            unsubscribe();
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 p-2 sm:p-4">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-[98%] max-w-7xl h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-gray-100 dark:border-slate-700/80">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/80">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-950/60 rounded-xl text-blue-600 dark:text-blue-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300">
                            거래명세서 발행
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* History Button (발행 내역) */}
                        <button
                            onClick={() => {
                                if (iframeRef.current && iframeRef.current.contentWindow) {
                                    iframeRef.current.contentWindow.postMessage({ type: 'OPEN_HISTORY_MODAL' }, '*');
                                }
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold transition-all border border-blue-200/60 dark:border-blue-800/60 cursor-pointer shadow-xs"
                            title="발행 내역 목록 보기"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>발행 내역</span>
                        </button>

                        <button
                            onClick={onClose}
                            className="group p-2.5 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-all duration-200 cursor-pointer"
                            title="닫기"
                        >
                            <svg className="w-6 h-6 text-gray-400 dark:text-slate-400 group-hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <line x1="18" y1="6" x2="6" y2="18" strokeWidth="2.5" strokeLinecap="round" />
                                <line x1="6" y1="6" x2="18" y2="18" strokeWidth="2.5" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="flex-1 w-full h-full bg-slate-50 dark:bg-slate-900 p-0 overflow-hidden">
                    <iframe
                        ref={iframeRef}
                        srcDoc={invoiceHtml}
                        title="거래명세서 발행"
                        className="w-full h-full border-none"
                    />
                </div>
            </div>
        </div>,
        document.body
    );
}
