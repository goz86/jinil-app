import React, { useEffect, useRef } from 'react';
import invoiceHtml from '../../public/invoice-app/index.html?raw';
import { supabase } from '../lib/supabase';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

export default function InvoiceModal({ isOpen, onClose }) {
    const iframeRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;

        const sendClientsToIframe = async () => {
            let combinedClients = [];
            const namesSet = new Set();

            // 1. Supabase partners
            try {
                const { data: partnersData } = await supabase.from('partners').select('*');
                if (partnersData) {
                    partnersData.forEach(p => {
                        const name = (p.company_name || p.name || '').trim();
                        if (name && !namesSet.has(name.toLowerCase())) {
                            namesSet.add(name.toLowerCase());
                            combinedClients.push({
                                name: name,
                                rep: p.representative_name || p.contact_person || '',
                                tel: p.phone || p.tel || '',
                                addr: p.address || p.default_address || '',
                                biz: p.business_number || p.biz || '',
                                bizType: p.biz_type || '',
                                itemType: p.item_type || ''
                            });
                        }
                    });
                }
            } catch (e) {
                console.error("Supabase partners fetch error:", e);
            }

            // 2. Firestore clients
            try {
                const querySnapshot = await getDocs(collection(db, 'clients'));
                querySnapshot.forEach(doc => {
                    const data = doc.data();
                    const name = (data.name || '').trim();
                    if (name && !namesSet.has(name.toLowerCase())) {
                        namesSet.add(name.toLowerCase());
                        combinedClients.push({
                            name: name,
                            rep: data.representative || data.contactName || '',
                            tel: data.phone || '',
                            addr: data.address || '',
                            biz: data.biz || '',
                            bizType: data.bizType || '',
                            itemType: data.itemType || ''
                        });
                    }
                });
            } catch (e) {
                console.error("Firestore clients fetch error:", e);
            }

            // 3. Send message to iframe
            if (iframeRef.current && iframeRef.current.contentWindow) {
                iframeRef.current.contentWindow.postMessage({
                    type: 'SET_CLIENT_ADDRESS_BOOK',
                    clients: combinedClients
                }, '*');
            }
        };

        const timer = setTimeout(() => {
            void sendClientsToIframe();
        }, 300);

        return () => clearTimeout(timer);
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-[96%] max-w-7xl h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-gray-100 dark:border-slate-700/80">
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
        </div>
    );
}
