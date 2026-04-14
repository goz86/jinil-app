import React, { useState, useEffect } from 'react';

const SYMBOLS = [
    { symbol: '005930.KS', name: 'Samsung Elec' },
    { symbol: '000660.KS', name: 'SK Hynix' },
    { symbol: '373220.KS', name: 'LG Energy' },
    { symbol: '207940.KS', name: 'Samsung Bio' },
    { symbol: '005380.KS', name: 'Hyundai' },
    { symbol: '000270.KS', name: 'Kia Corp' },
    { symbol: '068270.KS', name: 'Celltrion' },
    { symbol: '005490.KS', name: 'POSCO' },
    { symbol: '035420.KS', name: 'NAVER' },
    { symbol: '006400.KS', name: 'Samsung SDI' },
    { symbol: '051910.KS', name: 'LG Chem' },
    { symbol: '105560.KS', name: 'KB Financial' },
    { symbol: '028260.KS', name: 'Samsung C&T' },
    { symbol: '012330.KS', name: 'Hyundai Mobis' },
    { symbol: '035720.KS', name: 'Kakao' },
    { symbol: '066570.KS', name: 'LG Elec' },
    { symbol: '055550.KS', name: 'Shinhan Fin' },
    { symbol: '015760.KS', name: 'KEPCO' },
    { symbol: '000810.KS', name: 'Samsung F&M' },
    { symbol: '096770.KS', name: 'SK Innovation' },
    { symbol: '033780.KS', name: 'KT&G' },
    { symbol: '086790.KS', name: 'Hana Fin' },
    { symbol: '034020.KS', name: 'Doosan Ener' },
    { symbol: '010130.KS', name: 'Korea Zinc' },
    { symbol: '011200.KS', name: 'HMM' },
    { symbol: 'BTC.KRW', name: 'Bitcoin' },
    { symbol: 'ETH.KRW', name: 'Ethereum' },
    { symbol: 'XRP.KRW', name: 'XRP' },
    { symbol: 'SOL.KRW', name: 'Solana' },
    { symbol: 'DOGE.KRW', name: 'Dogecoin' }
];


export default function StockTicker() {
    const [stocks, setStocks] = useState([]);
    const [loading, setLoading] = useState(true);

    const formatCurrency = (val, symbol) => {
        if (!val) return '...';
        return new Intl.NumberFormat('en-US', {
            maximumFractionDigits: 0
        }).format(val);
    };

    const fetchData = async () => {
        try {
            const results = await Promise.allSettled(SYMBOLS.map(async (item) => {
                if (item.symbol.includes('.KRW')) {
                    const coin = item.symbol.replace('.KRW', '');
                    const res = await fetch(`https://api.upbit.com/v1/ticker?markets=KRW-${coin}`);
                    const data = await res.json();
                    return {
                        ...item,
                        price: data[0].trade_price,
                        change: data[0].signed_change_rate * 100
                    };
                } else {
                    const url = import.meta.env.DEV 
                        ? `/api/yahoo/${item.symbol}?range=1d&interval=1m`
                        : `https://query2.finance.yahoo.com/v8/finance/chart/${item.symbol}?range=1d&interval=1m`;
                    
                    const res = await fetch(url);
                    const data = await res.json();
                    const meta = data.chart.result[0].meta;
                    const price = meta.regularMarketPrice;
                    const prevClose = meta.previousClose || meta.chartPreviousClose;
                    const change = ((price - prevClose) / prevClose) * 100;
                    
                    return { ...item, price, change };
                }
            }));

            const successful = results
                .filter(r => r.status === 'fulfilled')
                .map(r => r.value);
            
            setStocks(successful);
            setLoading(false);
        } catch (error) {
            console.error("Ticker fetch error:", error);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, []);

    if (loading && stocks.length === 0) return null;

    return (
        <div className="w-full bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 h-9 flex items-center overflow-hidden marquee-container z-50">
            <div className="animate-marquee">
                {/* 
                  Double the items for seamless loop (0 to -50% translateX)
                  The .animate-marquee class in index.css handles display: flex and white-space: nowrap
                */}
                {stocks.concat(stocks).map((stock, idx) => (
                    <div key={`${stock.symbol}-${idx}`} className="flex items-center px-8 border-r border-gray-100 dark:border-gray-700 h-9 shrink-0">
                        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mr-2 uppercase tracking-tighter whitespace-nowrap">{stock.name}</span>
                        <span className="text-[12px] font-bold text-gray-800 dark:text-white mr-2 whitespace-nowrap">
                            {formatCurrency(stock.price, stock.symbol)} 
                            <span className="text-[9px] text-gray-400 ml-1 font-medium">KRW</span>
                        </span>
                        <span className={`text-[11px] font-bold ${stock.change >= 0 ? 'text-red-500' : 'text-blue-500'} whitespace-nowrap`}>
                            {stock.change >= 0 ? '▲' : '▼'} {Math.abs(stock.change).toFixed(2)}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

