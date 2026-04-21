import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';

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

    const { t } = useLanguage();

    // Kho dữ liệu Top Korea Stocks (Mở rộng đa ngành nghề)
    const KOREAN_TOP_STOCKS = [
        // IT / Tech / Platform
        { symbol: '005930.KS', name: 'Samsung Elec' },
        { symbol: '000660.KS', name: 'SK Hynix' },
        { symbol: '035420.KS', name: 'NAVER' },
        { symbol: '035720.KS', name: 'Kakao' },
        { symbol: '066570.KS', name: 'LG Electronics' },
        { symbol: '018260.KS', name: 'Samsung SDS' },

        // Battery / EV / Chemical
        { symbol: '373220.KS', name: 'LG Energy' },
        { symbol: '006400.KS', name: 'Samsung SDI' },
        { symbol: '051910.KS', name: 'LG Chem' },
        { symbol: '247540.KQ', name: 'Ecopro BM' },
        { symbol: '086520.KQ', name: 'Ecopro' },
        { symbol: '003670.KS', name: 'POSCO Future M' },

        // Automakers
        { symbol: '005380.KS', name: 'Hyundai Motor' },
        { symbol: '000270.KS', name: 'Kia Corp' },
        { symbol: '012330.KS', name: 'Hyundai Mobis' },
        { symbol: '000150.KS', name: 'Doosan' },

        // Bio / Healthcare
        { symbol: '207940.KS', name: 'Samsung Biologics' },
        { symbol: '068270.KS', name: 'Celltrion' },
        { symbol: '302440.KS', name: 'SK Bioscience' },
        { symbol: '000100.KS', name: 'Yuhan' },
        { symbol: '096530.KQ', name: 'Seegene' },
        { symbol: '214150.KQ', name: 'Classys' },

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
        { symbol: '105560.KS', name: 'KB Financial' },
        { symbol: '055550.KS', name: 'Shinhan Financial' },
        { symbol: '086790.KS', name: 'Hana Financial' },
        { symbol: '316140.KS', name: 'Woori Financial' },
        { symbol: '323410.KS', name: 'Kakao Bank' },
        { symbol: '032830.KS', name: 'Samsung Life' },
        { symbol: '006800.KS', name: 'Mirae Asset Sec.' },

        // Heavy Industry / Manufacturing / Logistics
        { symbol: '005490.KS', name: 'POSCO Holdings' },
        { symbol: '010130.KS', name: 'Korea Zinc' },
        { symbol: '028260.KS', name: 'Samsung C&T' },
        { symbol: '012450.KS', name: 'Hanwha Aerospace' },
        { symbol: '047810.KS', name: 'KAI' },
        { symbol: '011200.KS', name: 'HMM' },
        { symbol: '015760.KS', name: 'KEPCO' },
        { symbol: '090430.KS', name: 'Amorepacific' },

        // Telecom
        { symbol: '017670.KS', name: 'SK Telecom' },
        { symbol: '030200.KS', name: 'KT' },
        { symbol: '032640.KS', name: 'LG Uplus' },

        // Popular ETFs
        { symbol: '069500.KS', name: 'KODEX 200' },
        { symbol: '114800.KS', name: 'KODEX Inverse' },
        { symbol: '314250.KS', name: 'TIGER US Tech Top 10' },
        { symbol: '360750.KS', name: 'TIGER S&P500' },
        { symbol: '252670.KS', name: 'KODEX 200 Futures Invr2X' },

        // Crypto (Upbit)
        { symbol: 'BTC.KRW', name: 'Bitcoin (BTC)' },
        { symbol: 'ETH.KRW', name: 'Ethereum (ETH)' },
        { symbol: 'XRP.KRW', name: 'Ripple (XRP)' },
        { symbol: 'SOL.KRW', name: 'Solana (SOL)' },
        { symbol: 'DOGE.KRW', name: 'Dogecoin' },
        { symbol: 'LINK.KRW', name: 'Chainlink' },
        { symbol: 'SHIB.KRW', name: 'Shiba Inu' }
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
            // Lấy cả giá hiện tại (ticker) và lịch sử 7 ngày (candles/days)
            const cryptoSymbolsMap = savedStockSymbols.filter(s => s.includes('.KRW')).map(s => s.replace('.KRW', ''));
            const cryptoDataMap = {};

            if (cryptoSymbolsMap.length > 0) {
                try {
                    // Lấy Ticker hiện tại
                    const cryptoRes = await fetch(`https://api.upbit.com/v1/ticker?markets=${cryptoSymbolsMap.map(s => `KRW-${s}`).join(',')}`);
                    const cryptoData = await cryptoRes.json();

                    if (Array.isArray(cryptoData)) {
                        for (const coin of cryptoData) {
                            const rawSymbol = coin.market.replace('KRW-', '');
                            const originalSymbol = `${rawSymbol}.KRW`;

                            // Lấy lịch sử 7 ngày cho Sparkline
                            let sparklinePrices = [];
                            try {
                                const candleRes = await fetch(`https://api.upbit.com/v1/candles/days?market=${coin.market}&count=7`);
                                const candleData = await candleRes.json();
                                // Upbit trả về mưới nhất đầu tiên, cần đảo ngược lại
                                sparklinePrices = candleData.map(c => c.trade_price).reverse();
                            } catch (e) {
                                console.error(`Failed to fetch history for ${originalSymbol}`, e);
                            }

                            cryptoDataMap[originalSymbol] = {
                                price: coin.trade_price,
                                change: coin.signed_change_rate * 100,
                                sparklineData: sparklinePrices.length === 7 ? sparklinePrices : []
                            };
                            await new Promise(r => setTimeout(r, 200)); // Delay nhẹ Upbit
                        }
                    }
                } catch (err) {
                    console.error("Crypto API Error:", err);
                }
            }

            // 3. Fetch Stocks and Gold (Yahoo Finance V8 API directly)
            // Note: This relies on Electron with webSecurity: false or browser extensions for local dev testing.
            const regularSymbols = savedStockSymbols.filter(s => !s.includes('.KRW'));
            let goldPrice = null;
            const stockDataMap = {};
            const delay = ms => new Promise(res => setTimeout(res, ms));

            // Add Gold (GC=F) explicitly to fetch list if we have any stocks requested
            if (!regularSymbols.includes('GC=F')) {
                regularSymbols.push('GC=F');
            }

            if (regularSymbols.length > 0) {
                // Fetch tuần tự (Sequential) với độ trễ để chống bị Yahoo block IP do Request liên tục
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
                            // Lấy dải giá lịch sử để vẽ Sparkline
                            const indicators = yahooData.chart.result[0].indicators;
                            let sparklinePrices = [];
                            if (indicators && indicators.quote && indicators.quote[0].close) {
                                sparklinePrices = indicators.quote[0].close.filter(p => p !== null);
                            }

                            // Tính toán % thay đổi trong ngày (Daily Change)
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
                    await delay(300); // Nghỉ 300ms sau mỗi request để an toàn
                }
            }

            // 4. Merge all data into the UI format
            const dynamicStocks = savedStockSymbols.map(symbol => {
                const stockInfo = KOREAN_TOP_STOCKS.find(s => s.symbol === symbol) || { name: symbol, symbol };

                let currentPrice = null;
                let currentChange = null;
                let sparklineData = [];

                if (symbol.includes('.KRW')) { // It's Crypto
                    if (cryptoDataMap[symbol]) {
                        currentPrice = cryptoDataMap[symbol].price;
                        currentChange = cryptoDataMap[symbol].change;
                        sparklineData = cryptoDataMap[symbol].sparklineData;
                    }
                } else { // It's a regular stock
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

            // Update State (Preserve old data if new API fails)
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

    // Khi danh sách mã thay đổi, fetch lại data
    useEffect(() => {
        let isMounted = true;

        const loadData = async () => {
            if (isMounted) {
                await fetchMarketData();
            }
        };

        loadData();
        const interval = setInterval(loadData, 180000); // 3 phút thay vì 1 phút (chống bị chặn)

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

    const searchResults = KOREAN_TOP_STOCKS.filter(stock =>
        stock.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.symbol.includes(searchTerm)
    ).filter(stock => !savedStockSymbols.includes(stock.symbol));

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
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-2xl border border-gray-100 dark:border-gray-600">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">USD/KRW</p>
                    <p className="text-sm font-bold text-gray-800 dark:text-white">₩{formatCurrency(marketData.krwUsd)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-2xl border border-gray-100 dark:border-gray-600">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">KRW/VND</p>
                    <p className="text-sm font-bold text-gray-800 dark:text-white">₫{formatCurrency(marketData.krwVnd)}</p>
                </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-2xl border border-yellow-100 dark:border-yellow-800 mb-4 flex justify-between items-center">
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
                        <div key={stock.symbol} className="group flex justify-between items-center border-b border-gray-50 dark:border-gray-700 pb-2 last:border-0 last:pb-0 relative">
                            <div>
                                <p className="text-sm font-semibold text-gray-800 dark:text-white">{stock.name}</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">{stock.symbol}</p>
                            </div>

                            {/* Cột giữa: Biểu đồ mini */}
                            <div className="flex-1 flex justify-center opacity-100 group-hover:opacity-10 transition-opacity px-2">
                                <Sparkline data={stock.sparklineData} />
                            </div>

                            <div className="text-right transition-opacity group-hover:opacity-0">
                                <p className="text-sm font-bold text-gray-800 dark:text-white">{formatCurrency(stock.price)}</p>
                                {formatPercent(stock.change)}
                            </div>

                            {/* Nút xóa (chỉ hiện khi hover) */}
                            <button
                                onClick={() => handleRemoveStock(stock.symbol)}
                                className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 bg-red-50 text-red-500 p-1.5 rounded-lg hover:bg-red-100 transition-all"
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

            {/* Click outside search handler (soft hack by using fixed clear search) */}
            {showResults && searchTerm && (
                <div
                    className="fixed inset-0 z-0 bg-black/0"
                    onClick={() => setShowResults(false)}
                ></div>
            )}

            <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-4">{t('updatedAt')} {new Date().toLocaleTimeString()} (Độ trễ ~1p)</p>
        </div>
    );
}
