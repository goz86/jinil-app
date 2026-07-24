import React, { useEffect } from 'react';

export default function StockChartModal({ stock, isOpen, onClose }) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !stock) return null;

    // Convert stock symbol to TradingView symbol format
    const getTvSymbol = (sym, name) => {
        if (!sym) return 'KRX:005930';
        if (sym.includes('.KS')) return `KRX:${sym.replace('.KS', '')}`;
        if (sym.includes('.KQ')) return `KRX:${sym.replace('.KQ', '')}`;
        if (sym.includes('.KRW')) return `UPBIT:${sym.replace('.KRW', '')}KRW`;
        if (sym === 'USD/KRW' || name === 'USD/KRW') return 'FX_IDC:USDKRW';
        if (sym === 'KRW/VND' || name === 'KRW/VND') return 'FX_IDC:KRWVND';
        if (sym === 'GOLD' || name === '금 (1g)') return 'TVC:GOLD';
        return sym;
    };

    const tvSymbol = getTvSymbol(stock.symbol || stock.code, stock.name);
    const iframeUrl = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${encodeURIComponent(tvSymbol)}&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=[]&theme=light&style=1&timezone=Asia%2FSeoul`;

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
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Bar */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-extrabold text-lg flex items-center justify-center shadow-sm">
                            📈
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                                    {stock.name}
                                </h2>
                                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                    {stock.symbol || stock.code || tvSymbol}
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

                    <button
                        onClick={onClose}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-gray-700 transition"
                        title="닫기 (ESC)"
                    >
                        ✕
                    </button>
                </div>

                {/* TradingView Chart Container */}
                <div className="flex-1 w-full h-full bg-gray-50 dark:bg-gray-900 relative">
                    <iframe
                        title={`TradingView Chart - ${stock.name}`}
                        src={iframeUrl}
                        className="w-full h-full border-0"
                        allowFullScreen
                    />
                </div>
            </div>
        </div>
    );
}
