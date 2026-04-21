import React, { useState, useEffect } from 'react';

const SYMBOLS = [
    // IT / Tech / Platform
    { symbol: '005930.KS', name: 'Samsung Elec' },
    { symbol: '000660.KS', name: 'SK Hynix' },
    { symbol: '035420.KS', name: 'NAVER' },
    { symbol: '035720.KS', name: 'Kakao' },
    { symbol: '066570.KS', name: 'LG Elec' },
    { symbol: '018260.KS', name: 'Samsung SDS' },

    // Battery / EV / Chemical
    { symbol: '373220.KS', name: 'LG Energy' },
    { symbol: '006400.KS', name: 'Samsung SDI' },
    { symbol: '051910.KS', name: 'LG Chem' },
    { symbol: '247540.KQ', name: 'Ecopro BM' },
    { symbol: '086520.KQ', name: 'Ecopro' },
    { symbol: '003670.KS', name: 'POSCO Future M' },
    { symbol: '096770.KS', name: 'SK Innovation' },

    // Automakers
    { symbol: '005380.KS', name: 'Hyundai Motor' },
    { symbol: '000270.KS', name: 'Kia Corp' },
    { symbol: '012330.KS', name: 'Hyundai Mobis' },
    { symbol: '000150.KS', name: 'Doosan' },

    // Bio / Healthcare
    { symbol: '207940.KS', name: 'Samsung Bio' },
    { symbol: '068270.KS', name: 'Celltrion' },
    { symbol: '302440.KS', name: 'SK Bioscience' },
    { symbol: '000100.KS', name: 'Yuhan' },
    { symbol: '096530.KQ', name: 'Seegene' },

    // Entertainment / K-Pop
    { symbol: '352820.KS', name: 'HYBE' },
    { symbol: '035900.KQ', name: 'JYP Ent.' },
    { symbol: '041510.KQ', name: 'SM Ent.' },
    { symbol: '122870.KQ', name: 'YG Ent.' },
    { symbol: '011115.KS', name: 'CJ ENM' },

    // Game / Gaming
    { symbol: '259960.KS', name: 'Krafton' },
    { symbol: '036570.KS', name: 'NCSoft' },
    { symbol: '251270.KS', name: 'Netmarble' },
    { symbol: '263750.KQ', name: 'Pearl Abyss' },
    { symbol: '293490.KQ', name: 'Kakao Games' },

    // Finance / Banking
    { symbol: '105560.KS', name: 'KB Fin' },
    { symbol: '055550.KS', name: 'Shinhan Fin' },
    { symbol: '086790.KS', name: 'Hana Fin' },
    { symbol: '316140.KS', name: 'Woori Fin' },
    { symbol: '323410.KS', name: 'Kakao Bank' },
    { symbol: '032830.KS', name: 'Samsung Life' },
    { symbol: '000810.KS', name: 'Samsung F&M' },

    // Heavy Industry / Manufacturing / Logistics
    { symbol: '005490.KS', name: 'POSCO' },
    { symbol: '010130.KS', name: 'Korea Zinc' },
    { symbol: '028260.KS', name: 'Samsung C&T' },
    { symbol: '012450.KS', name: 'Hanwha Aero' },
    { symbol: '047810.KS', name: 'KAI' },
    { symbol: '011200.KS', name: 'HMM' },
    { symbol: '015760.KS', name: 'KEPCO' },
    { symbol: '090430.KS', name: 'Amorepacific' },
    { symbol: '033780.KS', name: 'KT&G' },

    // Telecom
    { symbol: '017670.KS', name: 'SK Telecom' },
    { symbol: '030200.KS', name: 'KT' },
    { symbol: '032640.KS', name: 'LG Uplus' },

    // ETFs
    { symbol: '069500.KS', name: 'KODEX 200' },
    { symbol: '314250.KS', name: 'TIGER Tech 10' },

    // Crypto
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
            const results = [];
            const chunkSize = 15; // Phân vùng 15 mã mỗi lần tải
            
            for (let i = 0; i < SYMBOLS.length; i += chunkSize) {
                const chunk = SYMBOLS.slice(i, i + chunkSize);
                
                const chunkPromises = chunk.map(async (item) => {
                    try {
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
                            if (!res.ok) return null;
                            const data = await res.json();
                            const meta = data.chart.result[0].meta;
                            const price = meta.regularMarketPrice;
                            const prevClose = meta.previousClose || meta.chartPreviousClose;
                            const change = ((price - prevClose) / prevClose) * 100;
                            
                            return { ...item, price, change };
                        }
                    } catch (err) {
                        console.error("Ticker error:", item.symbol, err.message);
                        return null;
                    }
                });

                const chunkResults = await Promise.all(chunkPromises);
                chunkResults.forEach(r => { if (r) results.push(r); });
                
                // Nghỉ 500ms giữa các chunk để tránh bị block IP
                await new Promise(r => setTimeout(r, 500));
            }
            
            setStocks(results);
            setLoading(false);
        } catch (error) {
            console.error("Ticker fetch error:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 180000); // 3 phút thay vì 1 phút (đồng bộ độ an toàn)
        return () => clearInterval(interval);
    }, []);

    if (loading && stocks.length === 0) {
        return (
            <div className="w-full bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 h-9 flex items-center px-8 overflow-hidden marquee-container z-50">
                <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 animate-pulse uppercase tracking-tighter">Đang tải dữ liệu thị trường (Loading Market Data)...</span>
            </div>
        );
    }

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

