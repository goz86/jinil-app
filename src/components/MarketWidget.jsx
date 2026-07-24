import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import StockChartModal from './StockChartModal';

// Component vẽ đường Sparkline siêu nhẹ bằng SVG
const Sparkline = ({ data }) => {
    if (!data || data.length < 2) return <div className="w-16 h-8"></div>;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;

    // Nếu giá không đổi trong 7 ngày
    if (range === 0) {
        return (
            <svg className="w-16 h-8" viewBox="0 0 100 30" preserveAspectRatio="none">
                <line x1="0" y1="15" x2="100" y2="15" stroke="#9ca3af" strokeWidth="2" />
            </svg>
        );
    }

    const startPrice = data[0];
    const endPrice = data[data.length - 1];
    const isPositive = endPrice >= startPrice;
    const strokeColor = isPositive ? "#ef4444" : "#3b82f6"; // Red up, Blue down (Korean style)

    // Tạo các điểm tọa độ (x, y) cho thẻ <polyline>
    const points = data.map((price, index) => {
        const x = (index / (data.length - 1)) * 100;
        // SVG Oy hướng xuống, nên y thấp có toạ độ lớn
        const y = 30 - ((price - min) / range) * 30;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg className="w-16 h-8 overflow-visible" viewBox="0 -2 100 34" preserveAspectRatio="none">
            {/* Tạo dải gradient làm nền */}
            <defs>
                <linearGradient id={`gradient-${isPositive}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={strokeColor} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polyline
                fill={`url(#gradient-${isPositive})`}
                stroke="none"
                points={`0,34 ${points} 100,34`}
            />
            <polyline
                fill="none"
                stroke={strokeColor}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
            />
        </svg>
    );
};

export default function MarketWidget() {
    const { lang } = useLanguage();
    const [marketData, setMarketData] = useState({
        krwUsd: null,
        krwVnd: null,
        gold: null,
        stocks: []
    });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [savedStockSymbols, setSavedStockSymbols] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [selectedStock, setSelectedStock] = useState(null);
    const [isChartModalOpen, setIsChartModalOpen] = useState(false);

    const { t } = useLanguage();

    const openChart = (stockItem) => {
        setSelectedStock(stockItem);
        setIsChartModalOpen(true);
    };

    // Kho dữ liệu Top Korea Stocks (Mở rộng đa ngành nghề)
    const KOREAN_TOP_STOCKS = [
        // IT / 반도체 / 플랫폼
        { symbol: '005930.KS', name: '삼성전자', alias: 'Samsung Elec' },
        { symbol: '000660.KS', name: 'SK하이닉스', alias: 'SK Hynix' },
        { symbol: '035420.KS', name: 'NAVER', alias: '네이버' },
        { symbol: '035720.KS', name: '카카오', alias: 'Kakao' },
        { symbol: '066570.KS', name: 'LG전자', alias: 'LG Elec' },
        { symbol: '018260.KS', name: '삼성SDS', alias: 'Samsung SDS' },
        { symbol: '042700.KS', name: '한미반도체', alias: 'Hanmi Semi' },
        { symbol: '058470.KQ', name: '리노공업', alias: 'Leeno' },
        { symbol: '403870.KQ', name: 'HPSP', alias: '에이치피에스피' },
        { symbol: '357780.KQ', name: '솔브레인', alias: 'Soulbrain' },
        { symbol: '005290.KQ', name: '동진쎄미켐', alias: 'Dongjin' },

        // 2차전지 / 자동차 / 화학
        { symbol: '373220.KS', name: 'LG에너지솔루션', alias: 'LG Energy' },
        { symbol: '006400.KS', name: '삼성SDI', alias: 'Samsung SDI' },
        { symbol: '051910.KS', name: 'LG화학', alias: 'LG Chem' },
        { symbol: '247540.KQ', name: '에코프로비엠', alias: 'Ecopro BM' },
        { symbol: '086520.KQ', name: '에코프로', alias: 'Ecopro' },
        { symbol: '003670.KS', name: '포스코퓨처엠', alias: 'POSCO Future M' },
        { symbol: '096770.KS', name: 'SK이노베이션', alias: 'SK Innovation' },
        { symbol: '005380.KS', name: '현대차', alias: 'Hyundai Motor' },
        { symbol: '000270.KS', name: '기아', alias: 'Kia' },
        { symbol: '012330.KS', name: '현대모비스', alias: 'Hyundai Mobis' },
        { symbol: '086280.KS', name: '현대글로비스', alias: 'Hyundai Glovis' },
        { symbol: '204320.KS', name: 'HL만도', alias: 'Mando' },
        { symbol: '001570.KS', name: '금양', alias: 'Kumyang' },

        // 방산 / 조선 / 중공업
        { symbol: '012450.KS', name: '한화에어로스페이스', alias: 'Hanwha Aero' },
        { symbol: '047810.KS', name: '한국항공우주', alias: 'KAI' },
        { symbol: '079550.KS', name: 'LIG넥스원', alias: 'LIG Nex1' },
        { symbol: '272210.KS', name: '한화시스템', alias: 'Hanwha Systems' },
        { symbol: '329180.KS', name: 'HD현대중공업', alias: 'HD Hyundai' },
        { symbol: '009540.KS', name: 'HD한국조선해양', alias: 'KSOE' },
        { symbol: '010140.KS', name: '삼성중공업', alias: 'Samsung Heavy' },
        { symbol: '042660.KS', name: '한화오션', alias: 'Hanwha Ocean' },
        { symbol: '034020.KS', name: '두산에너빌리티', alias: 'Doosan Enerbility' },
        { symbol: '241560.KS', name: '두산밥캣', alias: 'Doosan Bobcat' },
        { symbol: '000150.KS', name: '두산', alias: 'Doosan' },

        // 바이오 / 제약
        { symbol: '207940.KS', name: '삼성바이오로직스', alias: 'Samsung Bio' },
        { symbol: '068270.KS', name: '셀트리온', alias: 'Celltrion' },
        { symbol: '302440.KS', name: 'SK바이오사이언스', alias: 'SK Bioscience' },
        { symbol: '326030.KS', name: 'SK바이오팜', alias: 'SK Biopharm' },
        { symbol: '000100.KS', name: '유한양행', alias: 'Yuhan' },
        { symbol: '128940.KS', name: '한미약품', alias: 'Hanmi Pharm' },
        { symbol: '196170.KQ', name: '알테오젠', alias: 'Alteogen' },
        { symbol: '028300.KQ', name: 'HLB', alias: '에이치엘비' },
        { symbol: '096530.KQ', name: '씨젠', alias: 'Seegene' },
        { symbol: '069620.KS', name: '대웅제약', alias: 'Daewoong' },

        // 엔터 / 유통 / 소비재 / 물류
        { symbol: '352820.KS', name: '하이브', alias: 'HYBE' },
        { symbol: '035900.KQ', name: 'JYP Ent.', alias: '제이와이피' },
        { symbol: '041510.KQ', name: 'SM Ent.', alias: '에스엠' },
        { symbol: '122870.KQ', name: 'YG Ent.', alias: '와이지' },
        { symbol: '011115.KS', name: 'CJ ENM', alias: '씨제이이엔엠' },
        { symbol: '090430.KS', name: '아모레퍼시픽', alias: 'Amorepacific' },
        { symbol: '051900.KS', name: 'LG생활건강', alias: 'LG H&H' },
        { symbol: '383220.KS', name: 'F&F', alias: '에프앤에프' },
        { symbol: '111770.KS', name: '영원무역', alias: 'Youngone' },
        { symbol: '081660.KS', name: '휠라홀딩스', alias: 'Fila' },
        { symbol: '004170.KS', name: '신세계', alias: 'Shinsegae' },
        { symbol: '069960.KS', name: '현대백화점', alias: 'Hyundai Dept' },
        { symbol: '139480.KS', name: '이마트', alias: 'E-Mart' },
        { symbol: '000120.KS', name: 'CJ대한통운', alias: 'CJ Logistics' },
        { symbol: '033780.KS', name: 'KT&G', alias: '케이티앤지' },

        // 금융 / 지주사
        { symbol: '105560.KS', name: 'KB금융', alias: 'KB Financial' },
        { symbol: '055550.KS', name: '신한지주', alias: 'Shinhan' },
        { symbol: '086790.KS', name: '하나금융지주', alias: 'Hana' },
        { symbol: '316140.KS', name: '우리금융지주', alias: 'Woori' },
        { symbol: '323410.KS', name: '카카오뱅크', alias: 'Kakao Bank' },
        { symbol: '032830.KS', name: '삼성생명', alias: 'Samsung Life' },
        { symbol: '000810.KS', name: '삼성화재', alias: 'Samsung F&M' },
        { symbol: '138040.KS', name: '메리츠금융지주', alias: 'Meritz' },
        { symbol: '006800.KS', name: '미래에셋증권', alias: 'Mirae Asset' },
        { symbol: '005490.KS', name: 'POSCO홀딩스', alias: 'POSCO' },
        { symbol: '010130.KS', name: '고려아연', alias: 'Korea Zinc' },
        { symbol: '028260.KS', name: '삼성물산', alias: 'Samsung C&T' },
        { symbol: '015760.KS', name: '한국전력', alias: 'KEPCO' },

        // 통신 / 게임
        { symbol: '017670.KS', name: 'SK텔레콤', alias: 'SK Telecom' },
        { symbol: '030200.KS', name: 'KT', alias: '케이티' },
        { symbol: '032640.KS', name: 'LG유플러스', alias: 'LG Uplus' },
        { symbol: '259960.KS', name: '크래프톤', alias: 'Krafton' },
        { symbol: '036570.KS', name: '엔씨소프트', alias: 'NCSoft' },
        { symbol: '251270.KS', name: '넷마블', alias: 'Netmarble' },
        { symbol: '263750.KQ', name: '펄어비스', alias: 'Pearl Abyss' },
        { symbol: '293490.KQ', name: '카카오게임즈', alias: 'Kakao Games' },
        { symbol: '078340.KQ', name: '컴투스', alias: 'Com2uS' },

        // 지수 ETF & 가상화폐 (Upbit)
        { symbol: '069500.KS', name: 'KODEX 200', alias: '코덱스200' },
        { symbol: '314250.KS', name: 'TIGER Top10', alias: '타이거 탑10' },
        { symbol: '122630.KS', name: 'KODEX 레버리지', alias: '레버리지' },
        { symbol: '252670.KS', name: 'KODEX 200선물인버스2X', alias: '곱버스' },
        { symbol: 'BTC.KRW', name: '비트코인 (BTC)', alias: 'Bitcoin' },
        { symbol: 'ETH.KRW', name: '이더리움 (ETH)', alias: 'Ethereum' },
        { symbol: 'XRP.KRW', name: '리플 (XRP)', alias: 'Ripple' },
        { symbol: 'SOL.KRW', name: '솔라나 (SOL)', alias: 'Solana' },
        { symbol: 'DOGE.KRW', name: '도지코인 (DOGE)', alias: 'Dogecoin' }
    ];

    const defaultStocks = ['005930.KS', '000660.KS', '005380.KS'];
    const [user, setUser] = useState(null);

    // Lắng nghe trạng thái đăng nhập và khôi phục danh sách theo dõi
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // Đã đăng nhập -> Đọc từ Firebase
                const unsubDoc = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
                    if (docSnap.exists() && docSnap.data().savedStocks) {
                        setSavedStockSymbols(docSnap.data().savedStocks);
                    } else {
                        // Nếu chưa có trên Firebase, đẩy LocalStorage lên nếu có, hoặc dùng mặc định
                        const localSaved = localStorage.getItem('savedStocks');
                        const initialStocks = localSaved ? JSON.parse(localSaved) : defaultStocks;
                        setSavedStockSymbols(initialStocks);
                        setDoc(doc(db, "users", currentUser.uid), { savedStocks: initialStocks }, { merge: true });
                    }
                });
                return () => unsubDoc();
            } else {
                // Chưa đăng nhập -> Dùng LocalStorage
                const localSaved = localStorage.getItem('savedStocks');
                if (localSaved) {
                    setSavedStockSymbols(JSON.parse(localSaved));
                } else {
                    setSavedStockSymbols(defaultStocks);
                }
            }
        });

        return () => unsubscribeAuth();
    }, []);

    const saveStocksToCloud = async (newStocks) => {
        setSavedStockSymbols(newStocks);
        localStorage.setItem('savedStocks', JSON.stringify(newStocks));

        if (user) {
            try {
                await setDoc(doc(db, "users", user.uid), { savedStocks: newStocks }, { merge: true });
            } catch (error) {
                console.error("Error saving stocks to Firestore:", error);
            }
        }
    };

    const fetchMarketData = async () => {
        if (savedStockSymbols.length === 0) return;

        try {
            // 1. Fetch Exchange Rates (USD/KRW, KRW/VND)
            let usdToKrw = null;
            let krwToVnd = null;
            try {
                const krwUrl = import.meta.env.DEV ? '/api/yahoo/USDKRW=X?range=1d&interval=1m' : 'https://query2.finance.yahoo.com/v8/finance/chart/USDKRW=X?range=1d&interval=1m';
                const krwRes = await fetch(krwUrl);
                const krwData = await krwRes.json();
                if (krwData && krwData.chart && krwData.chart.result && krwData.chart.result.length > 0) {
                    usdToKrw = krwData.chart.result[0].meta.regularMarketPrice;
                }

                const vndUrl = import.meta.env.DEV ? '/api/yahoo/VND=X?range=1d&interval=1m' : 'https://query2.finance.yahoo.com/v8/finance/chart/VND=X?range=1d&interval=1m';
                const vndRes = await fetch(vndUrl);
                const vndData = await vndRes.json();
                if (vndData && vndData.chart && vndData.chart.result && vndData.chart.result.length > 0) {
                    const usdToVnd = vndData.chart.result[0].meta.regularMarketPrice;
                    if (usdToKrw && usdToVnd) {
                        krwToVnd = usdToVnd / usdToKrw;
                    }
                }
            } catch (err) {
                console.error("Exchange API Error:", err);
            }

            // 2. Fetch Crypto Prices (Upbit API)
            const cryptoSymbolsMap = savedStockSymbols.filter(s => s.includes('.KRW')).map(s => s.replace('.KRW', ''));
            const cryptoDataMap = {};

            if (cryptoSymbolsMap.length > 0) {
                try {
                    const cryptoRes = await fetch(`https://api.upbit.com/v1/ticker?markets=${cryptoSymbolsMap.map(s => `KRW-${s}`).join(',')}`);
                    const cryptoData = await cryptoRes.json();

                    if (Array.isArray(cryptoData)) {
                        for (const coin of cryptoData) {
                            const rawSymbol = coin.market.replace('KRW-', '');
                            const originalSymbol = `${rawSymbol}.KRW`;

                            let sparklinePrices = [];
                            try {
                                const candleRes = await fetch(`https://api.upbit.com/v1/candles/days?market=${coin.market}&count=7`);
                                const candleData = await candleRes.json();
                                sparklinePrices = candleData.map(c => c.trade_price).reverse();
                            } catch (e) {
                                console.error(`Failed to fetch history for ${originalSymbol}`, e);
                            }

                            cryptoDataMap[originalSymbol] = {
                                price: coin.trade_price,
                                change: coin.signed_change_rate * 100,
                                sparklineData: sparklinePrices.length === 7 ? sparklinePrices : []
                            };
                            await new Promise(r => setTimeout(r, 200));
                        }
                    }
                } catch (err) {
                    console.error("Crypto API Error:", err);
                }
            }

            // 3. Fetch Stocks and Gold
            const regularSymbols = savedStockSymbols.filter(s => !s.includes('.KRW'));
            let goldPrice = null;
            const stockDataMap = {};
            const delay = ms => new Promise(res => setTimeout(res, ms));

            if (!regularSymbols.includes('GC=F')) {
                regularSymbols.push('GC=F');
            }

            if (regularSymbols.length > 0) {
                for (const symbol of regularSymbols) {
                    try {
                        const targetUrl = import.meta.env.DEV
                            ? `/api/yahoo/${symbol}?range=7d&interval=1d`
                            : `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?range=7d&interval=1d`;

                        const yahooRes = await fetch(targetUrl);
                        if (!yahooRes.ok) continue;
                        const yahooData = await yahooRes.json();

                        if (yahooData && yahooData.chart && yahooData.chart.result && yahooData.chart.result.length > 0) {
                            const meta = yahooData.chart.result[0].meta;
                            const indicators = yahooData.chart.result[0].indicators;
                            let sparklinePrices = [];
                            if (indicators && indicators.quote && indicators.quote[0].close) {
                                sparklinePrices = indicators.quote[0].close.filter(p => p !== null);
                            }

                            let changePct = 0;
                            if (sparklinePrices.length >= 2) {
                                const todayPrice = meta.regularMarketPrice;
                                const yesterdayPrice = sparklinePrices[sparklinePrices.length - 2];
                                changePct = ((todayPrice - yesterdayPrice) / yesterdayPrice) * 100;
                            } else {
                                const previousClose = meta.previousClose || meta.chartPreviousClose;
                                changePct = ((meta.regularMarketPrice - previousClose) / previousClose) * 100;
                            }

                            if (symbol === 'GC=F') {
                                goldPrice = usdToKrw ? (meta.regularMarketPrice * usdToKrw / 31.1035) : meta.regularMarketPrice;
                            } else {
                                stockDataMap[symbol] = {
                                    price: meta.regularMarketPrice,
                                    change: changePct,
                                    sparklineData: sparklinePrices
                                };
                            }
                        }
                    } catch (err) {
                        console.error(`Yahoo API Error for ${symbol}:`, err);
                    }
                    await delay(300);
                }
            }

            // 4. Merge all data into the UI format
            const dynamicStocks = savedStockSymbols.map(symbol => {
                const stockInfo = KOREAN_TOP_STOCKS.find(s => s.symbol === symbol) || { name: symbol, symbol };

                let currentPrice = null;
                let currentChange = null;
                let sparklineData = [];

                if (symbol.includes('.KRW')) {
                    if (cryptoDataMap[symbol]) {
                        currentPrice = cryptoDataMap[symbol].price;
                        currentChange = cryptoDataMap[symbol].change;
                        sparklineData = cryptoDataMap[symbol].sparklineData;
                    }
                } else {
                    if (stockDataMap[symbol]) {
                        currentPrice = stockDataMap[symbol].price;
                        currentChange = stockDataMap[symbol].change;
                        sparklineData = stockDataMap[symbol].sparklineData;
                    }
                }

                return {
                    symbol: stockInfo.symbol,
                    name: stockInfo.name,
                    price: currentPrice,
                    change: currentChange,
                    sparklineData: sparklineData
                };
            });

            setMarketData(prev => ({
                krwUsd: usdToKrw || prev.krwUsd,
                krwVnd: krwToVnd || prev.krwVnd,
                gold: goldPrice || prev.gold,
                stocks: dynamicStocks
            }));
            setLoading(false);
        } catch (error) {
            console.error("Lỗi tổng quát khi tải dữ liệu thị trường:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        let isMounted = true;

        const loadData = async () => {
            if (isMounted) {
                await fetchMarketData();
            }
        };

        loadData();
        const interval = setInterval(loadData, 180000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [savedStockSymbols]);

    const handleAddStock = (symbol) => {
        if (!savedStockSymbols.includes(symbol)) {
            const newSaved = [...savedStockSymbols, symbol];
            saveStocksToCloud(newSaved);
        }
        setSearchTerm('');
        setShowResults(false);
    };

    const handleRemoveStock = (symbol) => {
        const newSaved = savedStockSymbols.filter(s => s !== symbol);
        saveStocksToCloud(newSaved);
    };

    const searchResults = KOREAN_TOP_STOCKS.filter(stock => {
        const term = searchTerm.toLowerCase().trim();
        return (
            stock.name.toLowerCase().includes(term) ||
            (stock.alias && stock.alias.toLowerCase().includes(term)) ||
            stock.symbol.toLowerCase().includes(term)
        );
    }).filter(stock => !savedStockSymbols.includes(stock.symbol));

    const formatCurrency = (val, currency = '') => {
        if (!val) return '...';
        return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(val) + (currency ? ` ${currency}` : '');
    };

    const formatPercent = (val) => {
        if (val === undefined || val === null) return '';
        const sign = val > 0 ? '+' : '';
        const colorClass = val > 0 ? 'text-red-500' : val < 0 ? 'text-blue-500' : 'text-gray-500';
        return <span className={`text-xs font-semibold ${colorClass}`}>{sign}{val.toFixed(2)}%</span>;
    };

    if (loading) {
        return (
            <div className="animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-6"></div>
                <div className="space-y-4">
                    <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-xl"></div>
                    <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-xl"></div>
                    <div className="h-20 bg-gray-100 dark:bg-gray-700 rounded-xl"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                </svg>
                {t('marketWidgetTitle')}
            </h2>

            <div className="grid grid-cols-2 gap-3 mb-4">
                <div 
                    onClick={() => openChart({ name: 'USD/KRW', symbol: 'USD/KRW', price: marketData.krwUsd })}
                    className="bg-gray-50 dark:bg-gray-700 p-3 rounded-2xl border border-gray-100 dark:border-gray-600 cursor-pointer hover:bg-blue-50/70 dark:hover:bg-gray-600 transition"
                    title="USD/KRW 클릭하여 차트 보기"
                >
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">USD/KRW</p>
                    <p className="text-sm font-bold text-gray-800 dark:text-white">₩{formatCurrency(marketData.krwUsd)}</p>
                </div>
                <div 
                    onClick={() => openChart({ name: 'KRW/VND', symbol: 'KRW/VND', price: marketData.krwVnd })}
                    className="bg-gray-50 dark:bg-gray-700 p-3 rounded-2xl border border-gray-100 dark:border-gray-600 cursor-pointer hover:bg-blue-50/70 dark:hover:bg-gray-600 transition"
                    title="KRW/VND 클릭하여 차트 보기"
                >
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">KRW/VND</p>
                    <p className="text-sm font-bold text-gray-800 dark:text-white">₫{formatCurrency(marketData.krwVnd)}</p>
                </div>
            </div>

            <div 
                onClick={() => openChart({ name: '금 (1g)', symbol: 'GOLD', price: marketData.gold })}
                className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-2xl border border-yellow-100 dark:border-yellow-800 mb-4 flex justify-between items-center cursor-pointer hover:bg-yellow-100/70 transition"
                title="금 시세 클릭하여 차트 보기"
            >
                <div className="flex items-center">
                    <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center mr-2 shadow-sm">
                        <span className="text-white text-xs font-bold">Au</span>
                    </div>
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">{t('goldPrice')}</p>
                </div>
                <p className="text-sm font-bold text-yellow-900 dark:text-yellow-200">₩{formatCurrency(marketData.gold)}</p>
            </div>

            {/* Search Top Stocks */}
            <div className="relative mb-4">
                <div className="relative">
                    <input
                        type="text"
                        placeholder={t('searchStocks')}
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setShowResults(true);
                        }}
                        onFocus={() => setShowResults(true)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                    />
                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                {/* Search Results Dropdown */}
                {showResults && searchTerm && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {searchResults.length > 0 ? (
                            searchResults.map(stock => (
                                <div
                                    key={stock.symbol}
                                    onClick={() => handleAddStock(stock.symbol)}
                                    className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex justify-between items-center border-b border-gray-50 dark:border-gray-700 last:border-0"
                                >
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800 dark:text-white">{stock.name}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">{stock.symbol}</p>
                                    </div>
                                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">{t('noResults')}</div>
                        )}
                    </div>
                )}
            </div>

            {/* Watchlist */}
            <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {marketData.stocks.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">{t('noResults')}</p>
                ) : (
                    marketData.stocks.map(stock => (
                        <div 
                            key={stock.symbol} 
                            onClick={() => openChart(stock)}
                            className="group flex justify-between items-center border-b border-gray-50 dark:border-gray-700 pb-2 last:border-0 last:pb-0 relative cursor-pointer hover:bg-blue-50/40 dark:hover:bg-gray-700/40 p-1.5 rounded-xl transition"
                            title={`${stock.name} 클릭하여 실시간 차트 보기`}
                        >
                            <div>
                                <p className="text-sm font-semibold text-gray-800 dark:text-white group-hover:text-blue-600 transition-colors">{stock.name}</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">{stock.symbol}</p>
                            </div>

                            {/* Cột giữa: Biểu đồ mini */}
                            <div className="flex-1 flex justify-center opacity-100 group-hover:opacity-20 transition-opacity px-2">
                                <Sparkline data={stock.sparklineData} />
                            </div>

                            <div className="text-right transition-opacity group-hover:opacity-0">
                                <p className="text-sm font-bold text-gray-800 dark:text-white">{formatCurrency(stock.price)}</p>
                                {formatPercent(stock.change)}
                            </div>

                            {/* Nút xóa (chỉ hiện khi hover) */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveStock(stock.symbol);
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 bg-red-50 text-red-500 p-1.5 rounded-lg hover:bg-red-100 transition-all"
                                title="Remove from widget"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Click outside search handler */}
            {showResults && searchTerm && (
                <div
                    className="fixed inset-0 z-0 bg-black/0"
                    onClick={() => setShowResults(false)}
                ></div>
            )}

            <StockChartModal
                stock={selectedStock}
                isOpen={isChartModalOpen}
                onClose={() => setIsChartModalOpen(false)}
            />

            <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-4">{t('updatedAt')} {new Date().toLocaleTimeString()} (Độ trễ ~1p)</p>
        </div>
    );
}
