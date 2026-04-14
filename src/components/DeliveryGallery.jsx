import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import Swal from 'sweetalert2';

export default function DeliveryGallery({ selectedDate, deliveries }) {
    const { t, lang } = useLanguage();
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [isZoomed, setIsZoomed] = useState(false);

    // Drag-to-scroll refs
    const scrollContainerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);


    const filteredDeliveries = deliveries.filter(item => {
        let itemDateStr;
        if (!item.timestamp) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            itemDateStr = `${year}-${month}-${day}`;
        } else {
            const date = item.timestamp.toDate ? item.timestamp.toDate() : new Date(item.timestamp);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            itemDateStr = `${year}-${month}-${day}`;
        }
        return itemDateStr === selectedDate;
    });

    const selectedImage = selectedIndex !== null ? filteredDeliveries[selectedIndex] : null;

    const handleNext = (e) => {
        e?.stopPropagation();
        if (selectedIndex < filteredDeliveries.length - 1) {
            setSelectedIndex(selectedIndex + 1);
            setIsZoomed(false);
        }
    };

    const handlePrev = (e) => {
        e?.stopPropagation();
        if (selectedIndex > 0) {
            setSelectedIndex(selectedIndex - 1);
            setIsZoomed(false);
        }
    };

    const closeGallery = () => {
        setSelectedIndex(null);
        setIsZoomed(false);
    };

    // Drag-to-scroll logic
    const handleMouseDown = (e) => {
        if (!isZoomed) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
        setStartY(e.pageY - scrollContainerRef.current.offsetTop);
        setScrollLeft(scrollContainerRef.current.scrollLeft);
        setScrollTop(scrollContainerRef.current.scrollTop);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e) => {
        if (!isDragging || !isZoomed) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const y = e.pageY - scrollContainerRef.current.offsetTop;
        const walkX = (x - startX) * 1.5; // multiplier for speed
        const walkY = (y - startY) * 1.5;
        scrollContainerRef.current.scrollLeft = scrollLeft - walkX;
        scrollContainerRef.current.scrollTop = scrollTop - walkY;
    };

    const [menuPos, setMenuPos] = useState(null);

    useEffect(() => {
        const handleKeyDown = async (e) => {
            if (selectedIndex === null) return;
            
            // Image shortcuts
            if (isZoomed && selectedImage) {
                if (e.ctrlKey && e.key === 'c') {
                    e.preventDefault();
                    const success = await window.electronAPI?.copyImage(selectedImage.imageUrl);
                    if (success) {
                        Swal.fire({
                            title: t('copiedToast'),
                            toast: true,
                            position: 'top-end',
                            timer: 2000,
                            showConfirmButton: false,
                            icon: 'success'
                        });
                    }
                }
                if (e.ctrlKey && e.key === 's') {
                    e.preventDefault();
                    const filename = `jinil_delivery_${selectedImage.barcode || selectedImage.trackingNumber}.jpg`;
                    window.electronAPI?.saveImage(selectedImage.imageUrl, filename);
                }
                if (e.ctrlKey && e.key === 'p') {
                    e.preventDefault();
                    window.electronAPI?.printImage(selectedImage.imageUrl);
                }
            }

            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'Escape') {
                closeGallery();
                setMenuPos(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIndex, isZoomed, selectedImage]);

    // Close menu on click elsewhere
    useEffect(() => {
        const h = () => setMenuPos(null);
        window.addEventListener('click', h);
        return () => window.removeEventListener('click', h);
    }, []);

    if (!selectedDate || filteredDeliveries.length === 0) return null;

    const handleContextMenu = (e) => {
        e.preventDefault();
        setMenuPos({ x: e.clientX, y: e.clientY });
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mt-6 transition-colors duration-300">
            <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                    {t('delivery') || '택배'} ({filteredDeliveries.length})
                </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredDeliveries.map((item, index) => (
                    <div key={item.id} className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer border border-gray-100 dark:border-gray-700" onClick={() => setSelectedIndex(index)}>
                        {item.imageUrl ? (
                            <img
                                src={item.imageUrl}
                                alt="Delivery"
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            />
                        ) : (
                            <div className="w-full h-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                                <span className="text-gray-400 text-sm">{t('noImage')}</span>
                            </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end">
                            <p className="text-white text-xs font-semibold truncate hover:text-blue-200 transition-colors">{item.barcode || item.trackingNumber || 'N/A'}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Image Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm transition-all animate-in fade-in duration-300"
                    onClick={() => {
                        if (!isZoomed) closeGallery();
                        setMenuPos(null);
                    }}
                >
                    {/* Top Controls Bar */}
                    <div className="absolute top-0 inset-x-0 h-16 flex items-center justify-center px-6 z-[60] pointer-events-none">
                        <div className="pointer-events-auto bg-white/10 backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-full flex items-center gap-4 shadow-xl">
                            <span className="text-white/60 text-[10px] font-bold tracking-[0.2em] uppercase">
                                {selectedIndex + 1} / {filteredDeliveries.length}
                            </span>
                            <div className="w-px h-3 bg-white/20" />
                            <div className="flex items-center gap-2">
                                <button
                                    className="p-1 text-white/40 hover:text-white transition-colors"
                                    onClick={(e) => { e.stopPropagation(); window.electronAPI?.saveImage(selectedImage.imageUrl); }}
                                    title={t('saveCtrlS')}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                </button>
                                <button
                                    className="p-1 text-white/40 hover:text-white transition-colors"
                                    onClick={() => closeGallery()}
                                    title={t('closeEsc')}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Image Container with Custom Drag Scroll */}
                    <div
                        ref={scrollContainerRef}
                        className={`relative flex-1 w-full h-full transition-all duration-300 select-none ${isZoomed ? 'overflow-auto cursor-grab active:cursor-grabbing flex items-start justify-center' : 'overflow-hidden cursor-zoom-in flex items-center justify-center'}`}
                        onMouseDown={handleMouseDown}
                        onMouseLeave={handleMouseLeave}
                        onMouseUp={handleMouseUp}
                        onMouseMove={handleMouseMove}
                        onClick={(e) => {
                            if (isZoomed && !isDragging) {
                                setIsZoomed(false);
                                setMenuPos(null);
                            }
                        }}
                        onContextMenu={handleContextMenu}
                    >
                        {/* Navigation Buttons (Hidden when zoomed) */}
                        {!isZoomed && (
                            <>
                                <button
                                    className={`fixed left-4 top-1/2 -translate-y-1/2 z-40 p-5 bg-white/5 hover:bg-white/10 backdrop-blur-md text-white/50 hover:text-white rounded-full transition-all duration-300 border border-white/5 shadow-2xl ${selectedIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:scale-110'}`}
                                    onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                                >
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <button
                                    className={`fixed right-4 top-1/2 -translate-y-1/2 z-40 p-5 bg-white/5 hover:bg-white/10 backdrop-blur-md text-white/50 hover:text-white rounded-full transition-all duration-300 border border-white/5 shadow-2xl ${selectedIndex === filteredDeliveries.length - 1 ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:scale-110'}`}
                                    onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                >
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </>
                        )}

                        <div
                            className={`relative transition-all duration-500 ease-out flex items-center justify-center ${isZoomed ? 'w-[250vw] h-auto p-[10vh] min-h-full' : 'max-w-[92%] max-h-[85vh] w-full h-full'}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!isDragging) {
                                    setIsZoomed(!isZoomed);
                                    setMenuPos(null);
                                }
                            }}
                        >
                            <img
                                src={selectedImage.imageUrl}
                                alt="Enlarged Delivery"
                                className={`rounded-2xl shadow-[0_40px_100px_rgba(0,0,0,0.8)] transition-all duration-500 ring-1 ring-white/10 ${isZoomed ? 'w-full h-auto max-w-none' : 'w-full h-full object-contain'}`}
                                draggable="false"
                            />
                        </div>
                    </div>

                    {/* Context Menu */}
                    {menuPos && (
                        <div
                            className="fixed z-[100] bg-white rounded-lg shadow-2xl border border-gray-100 py-1 w-44 animate-in fade-in zoom-in duration-200"
                            style={{ top: menuPos.y, left: menuPos.x }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex justify-between items-center transition-colors"
                                onClick={async () => { 
                                    const success = await window.electronAPI?.copyImage(selectedImage.imageUrl); 
                                    setMenuPos(null); 
                                    if (success) {
                                        Swal.fire({
                                            title: t('copiedToast'),
                                            toast: true,
                                            position: 'top-end',
                                            timer: 2000,
                                            showConfirmButton: false,
                                            icon: 'success'
                                        });
                                    }
                                }}
                            >
                                <span>{t('copy')}</span>
                                <span className="text-gray-400 text-[10px] font-medium">Ctrl+C</span>
                            </button>
                            <button
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex justify-between items-center transition-colors"
                                onClick={() => {
                                    const filename = `jinil_delivery_${selectedImage.barcode || selectedImage.trackingNumber}.jpg`;
                                    window.electronAPI?.saveImage(selectedImage.imageUrl, filename);
                                    setMenuPos(null);
                                }}
                            >
                                <span>{t('save')}</span>
                                <span className="text-gray-400 text-[10px] font-medium">Ctrl+S</span>
                            </button>
                            <button
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex justify-between items-center transition-colors border-t border-gray-50"
                                onClick={() => { window.electronAPI?.printImage(selectedImage.imageUrl); setMenuPos(null); }}
                            >
                                <span>{t('print')}</span>
                                <span className="text-gray-400 text-[10px] font-medium">Ctrl+P</span>
                            </button>
                        </div>
                    )}

                    {/* Simple Reverted Info Panel */}
                    <div
                        className={`fixed bottom-10 left-1/2 -translate-x-1/2 bg-white px-8 py-5 rounded-[2rem] shadow-[0_15px_50px_rgba(0,0,0,0.3)] w-[90%] max-w-[420px] text-center transform transition-all duration-500 z-50 ${isZoomed ? 'translate-y-40 opacity-0' : 'translate-y-0 opacity-100'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-gray-500 text-[13px] font-medium tracking-wide">
                                {selectedImage?.timestamp?.toDate ? new Intl.DateTimeFormat('ko-KR', {
                                    year: 'numeric', month: '2-digit', day: '2-digit',
                                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                                    hour12: true
                                }).format(selectedImage.timestamp.toDate()).replace(/\//g, '. ') : '—'}
                            </span>

                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-gray-800 font-bold text-xl">{t('waybillNumber')}:</span>
                                <span className="text-blue-600 font-bold text-2xl">
                                    {selectedImage?.barcode || selectedImage?.trackingNumber || t('noResults')}
                                </span>
                            </div>

                            <div className="flex justify-center gap-1.5 items-center w-full max-w-[120px] mt-2">
                                {filteredDeliveries && filteredDeliveries.map((_, idx) => (
                                    <div key={idx} className={`h-1 rounded-full transition-all duration-500 ${idx === selectedIndex ? 'w-full bg-blue-500' : 'w-1.5 bg-gray-200'}`} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
