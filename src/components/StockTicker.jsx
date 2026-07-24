import React, { useState, useEffect } from 'react';

const SYMBOLS = [
    // IT / 반도체 / 플랫폼
    { symbol: '005930.KS', name: '삼성전자' },
    { symbol: '000660.KS', name: 'SK하이닉스' },
    { symbol: '035420.KS', name: 'NAVER' },
    { symbol: '035720.KS', name: '카카오' },
    { symbol: '066570.KS', name: 'LG전자' },
    { symbol: '018260.KS', name: '삼성SDS' },
    { symbol: '042700.KS', name: '한미반도체' },
    { symbol: '058470.KQ', name: '리노공업' },
    { symbol: '403870.KQ', name: 'HPSP' },
    { symbol: '357780.KQ', name: '솔브레인' },
    { symbol: '005290.KQ', name: '동진쎄미켐' },

    // 2차전지 / 자동차 / 화학
    { symbol: '373220.KS', name: 'LG에너지솔루션' },
    { symbol: '006400.KS', name: '삼성SDI' },
    { symbol: '051910.KS', name: 'LG화학' },
    { symbol: '247540.KQ', name: '에코프로비엠' },
    { symbol: '086520.KQ', name: '에코프로' },
    { symbol: '003670.KS', name: '포스코퓨처엠' },
    { symbol: '096770.KS', name: 'SK이노베이션' },
    { symbol: '005380.KS', name: '현대차' },
    { symbol: '000270.KS', name: '기아' },
    { symbol: '012330.KS', name: '현대모비스' },
    { symbol: '086280.KS', name: '현대글로비스' },
    { symbol: '204320.KS', name: 'HL만도' },
    { symbol: '001570.KS', name: '금양' },

    // 방산 / 조선 / 중공업 / 에너빌리티
    { symbol: '012450.KS', name: '한화에어로스페이스' },
    { symbol: '047810.KS', name: '한국항공우주' },
    { symbol: '079550.KS', name: 'LIG넥스원' },
    { symbol: '272210.KS', name: '한화시스템' },
    { symbol: '329180.KS', name: 'HD현대중공업' },
    { symbol: '009540.KS', name: 'HD한국조선해양' },
    { symbol: '010140.KS', name: '삼성중공업' },
    { symbol: '042660.KS', name: '한화오션' },
    { symbol: '034020.KS', name: '두산에너빌리티' },
    { symbol: '241560.KS', name: '두산밥캣' },
    { symbol: '000150.KS', name: '두산' },

    // 바이오 / 제약 / 헬스케어
    { symbol: '207940.KS', name: '삼성바이오로직스' },
    { symbol: '068270.KS', name: '셀트리온' },
    { symbol: '302440.KS', name: 'SK바이오사이언스' },
    { symbol: '326030.KS', name: 'SK바이오팜' },
    { symbol: '000100.KS', name: '유한양행' },
    { symbol: '128940.KS', name: '한미약품' },
    { symbol: '196170.KQ', name: '알테오젠' },
    { symbol: '028300.KQ', name: 'HLB' },
    { symbol: '096530.KQ', name: '씨젠' },
    { symbol: '069620.KS', name: '대웅제약' },

    // 엔터 / 유통 / 소비재 / 패션 / 물류
    { symbol: '352820.KS', name: '하이브' },
    { symbol: '035900.KQ', name: 'JYP Ent.' },
    { symbol: '041510.KQ', name: 'SM Ent.' },
    { symbol: '122870.KQ', name: 'YG Ent.' },
    { symbol: '011115.KS', name: 'CJ ENM' },
    { symbol: '090430.KS', name: '아모레퍼시픽' },
    { symbol: '051900.KS', name: 'LG생활건강' },
    { symbol: '383220.KS', name: 'F&F' },
    { symbol: '111770.KS', name: '영원무역' },
    { symbol: '081660.KS', name: '휠라홀딩스' },
    { symbol: '004170.KS', name: '신세계' },
    { symbol: '069960.KS', name: '현대백화점' },
    { symbol: '139480.KS', name: '이마트' },
    { symbol: '000120.KS', name: 'CJ대한통운' },
    { symbol: '033780.KS', name: 'KT&G' },

    // 금융 / 증권 / 지주사
    { symbol: '105560.KS', name: 'KB금융' },
    { symbol: '055550.KS', name: '신한지주' },
    { symbol: '086790.KS', name: '하나금융지주' },
    { symbol: '316140.KS', name: '우리금융지주' },
    { symbol: '323410.KS', name: '카카오뱅크' },
    { symbol: '032830.KS', name: '삼성생명' },
    { symbol: '000810.KS', name: '삼성화재' },
    { symbol: '138040.KS', name: '메리츠금융지주' },
    { symbol: '006800.KS', name: '미래에셋증권' },
    { symbol: '005490.KS', name: 'POSCO홀딩스' },
    { symbol: '010130.KS', name: '고려아연' },
    { symbol: '028260.KS', name: '삼성물산' },
    { symbol: '015760.KS', name: '한국전력' },

    // 통신 / 게임
    { symbol: '017670.KS', name: 'SK텔레콤' },
    { symbol: '030200.KS', name: 'KT' },
    { symbol: '032640.KS', name: 'LG유플러스' },
    { symbol: '259960.KS', name: '크래프톤' },
    { symbol: '036570.KS', name: '엔씨소프트' },
    { symbol: '251270.KS', name: '넷마블' },
    { symbol: '263750.KQ', name: '펄어비스' },
    { symbol: '293490.KQ', name: '카카오게임즈' },
    { symbol: '078340.KQ', name: '컴투스' },

    // 지수 ETF & 가상화폐
    { symbol: '069500.KS', name: 'KODEX 200' },
    { symbol: '314250.KS', name: 'TIGER Top10' },
    { symbol: '122630.KS', name: 'KODEX 레버리지' },
    { symbol: '252670.KS', name: 'KODEX 200선물인버스2X' },
    { symbol: 'BTC.KRW', name: '비트코인' },
    { symbol: 'ETH.KRW', name: '이더리움' },
    { symbol: 'XRP.KRW', name: '리플' },
    { symbol: 'SOL.KRW', name: '솔라나' },
    { symbol: 'DOGE.KRW', name: '도지코인' }
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
            <div className="w-full bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 h-10 flex items-center px-8 overflow-hidden marquee-container z-50">
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 animate-pulse uppercase tracking-tighter">Đang tải dữ liệu thị trường (Loading Market Data)...</span>
            </div>
        );
    }

    return (
        <div className="w-full bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 h-10 flex items-center overflow-hidden marquee-container z-50">
            <div className="animate-marquee">
                {/* 
                  Double the items for seamless loop (0 to -50% translateX)
                  The .animate-marquee class in index.css handles display: flex and white-space: nowrap
                */}
                {stocks.concat(stocks).map((stock, idx) => (
                    <div key={`${stock.symbol}-${idx}`} className="flex items-center px-8 border-r border-gray-100 dark:border-gray-700 h-10 shrink-0">
                        <span className="text-[13px] font-extrabold text-gray-700 dark:text-gray-200 mr-2.5 tracking-tight whitespace-nowrap">{stock.name}</span>
                        <span className="text-[14px] font-black text-gray-900 dark:text-white mr-2.5 whitespace-nowrap">
                            {formatCurrency(stock.price, stock.symbol)} 
                            <span className="text-[10px] text-gray-400 ml-1 font-semibold">KRW</span>
                        </span>
                        <span className={`text-[13px] font-extrabold ${stock.change >= 0 ? 'text-red-500' : 'text-blue-500'} whitespace-nowrap`}>
                            {stock.change >= 0 ? '▲' : '▼'} {Math.abs(stock.change).toFixed(2)}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

