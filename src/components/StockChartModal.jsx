import React, { useEffect, useRef } from 'react';

export default function StockChartModal({ stock, isOpen, onClose }) {
    const containerRef = useRef(null);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Convert stock symbol to TradingView symbol format
    const getTvSymbol = (sym, name) => {
        if (!sym) return 'KRX:005930';
        const cleanSym = String(sym).toUpperCase().trim();
        if (cleanSym.includes('.KS')) return `KRX:${cleanSym.replace('.KS', '')}`;
        if (cleanSym.includes('.KQ')) return `KRX:${cleanSym.replace('.KQ', '')}`;
        if (cleanSym.includes('.KRW')) return `UPBIT:${cleanSym.replace('.KRW', '')}KRW`;
        if (cleanSym === 'USD/KRW' || name === 'USD/KRW') return 'FX_IDC:USDKRW';
        if (cleanSym === 'KRW/VND' || name === 'KRW/VND') return 'FX_IDC:KRWVND';
        if (cleanSym === 'GOLD' || name === '금 (1g)') return 'TVC:GOLD';
        return cleanSym;
    };

    const tvSymbol = stock ? getTvSymbol(stock.symbol || stock.code, stock.name) : 'KRX:005930';

    // Inject TradingView tv.js script and instantiate Widget
    useEffect(() => {
        if (!isOpen || !stock || !containerRef.current) return;

        containerRef.current.innerHTML = '';
        const widgetContainerId = `tradingview_widget_${Math.random().toString(36).substring(2, 9)}`;
        
        const widgetDiv = document.createElement('div');
        widgetDiv.id = widgetContainerId;
        widgetDiv.style.width = '100%';
        widgetDiv.style.height = '100%';
        containerRef.current.appendChild(widgetDiv);

        const initWidget = () => {
            if (window.TradingView && document.getElementById(widgetContainerId)) {
                new window.TradingView.widget({
                    autosize: true,
                    symbol: tvSymbol,
                    interval: "D",
                    timezone: "Asia/Seoul",
                    theme: "light",
                    style: "1",
                    locale: "kr",
                    toolbar_bg: "#f1f3f6",
                    enable_publishing: false,
                    allow_symbol_change: true,
                    hide_side_toolbar: false,
                    container_id: widgetContainerId,
                });
            }
        };

        if (window.TradingView) {
            initWidget();
        } else {
            const existingScript = document.getElementById('tradingview-tv-js');
            if (!existingScript) {
                const script = document.createElement('script');
                script.id = 'tradingview-tv-js';
                script.src = 'https://s3.tradingview.com/tv.js';
                script.async = true;
                script.onload = initWidget;
                document.head.appendChild(script);
            } else {
                existingScript.addEventListener('load', initWidget);
            }
        }

        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, [isOpen, stock, tvSymbol]);

    if (!isOpen || !stock) return null;

    const formatCurrency = (val) => {
        if (!val && val !== 0) return '-';
        return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(val);
    };

    return (
        <div 
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl h-[88vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Bar - Clean style without 📈 icons */}
                <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/50">
                    <div className="flex items-center gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                                    {stock.name}
                                </h2>
                                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                    {tvSymbol}
                                </span>
                            </div>
                            {stock.price !== undefined && (
                                <div className="flex items-center gap-2 text-sm mt-0.5">
                                    <span className="font-extrabold text-gray-800 dark:text-gray-200">
                                        {formatCurrency(stock.price)} KRW
                                    </span>
                                    {stock.change !== undefined && (
                                        <span className={`font-bold text-xs ${stock.change >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                            {stock.change >= 0 ? '▲' : '▼'} {Math.abs(stock.change).toFixed(2)}%
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <a
                            href={`https://kr.tradingview.com/symbols/${encodeURIComponent(tvSymbol)}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 flex items-center gap-1 transition"
                        >
                            <span>TradingView에서 크게 보기</span>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-gray-700 transition font-bold"
                            title="닫기 (ESC)"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* TradingView Widget Embed Container */}
                <div className="flex-1 w-full h-full bg-gray-50 dark:bg-gray-900 relative">
                    <div ref={containerRef} className="w-full h-full" />
                </div>
            </div>
        </div>
    );
}
