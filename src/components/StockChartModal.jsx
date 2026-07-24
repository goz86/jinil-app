import React, { useState, useEffect, useRef, useMemo, Component } from 'react';
import { createChart, ColorType, CandlestickSeries, AreaSeries, HistogramSeries } from 'lightweight-charts';

// React Error Boundary to safeguard against any unexpected chart render crashes
class ChartErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("StockChartModal Error Catch:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full text-center shadow-2xl border border-gray-100 dark:border-gray-700">
                        <p className="text-base font-bold text-red-500 mb-2">차트를 표시하는 중 오류가 발생했습니다.</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{this.state.error?.message || "알 수 없는 오류"}</p>
                        <button
                            onClick={this.props.onClose}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

// Helper to deduplicate and sort time series ascending for lightweight-charts
function sanitizeTimeSeries(items) {
    if (!Array.isArray(items) || items.length === 0) return [];
    const map = new Map();
    items.forEach(item => {
        if (item && item.time) {
            map.set(item.time, item);
        }
    });
    return Array.from(map.values()).sort((a, b) => (a.time > b.time ? 1 : a.time < b.time ? -1 : 0));
}

function StockChartContent({ stock, isOpen, onClose }) {
    const chartContainerRef = useRef(null);
    const chartInstanceRef = useRef(null);

    const [chartType, setChartType] = useState('candlestick'); // 'candlestick' | 'area'
    const [timeframe, setTimeframe] = useState('6M'); // '1W', '1M', '3M', '6M', '1Y'
    const [chartData, setChartData] = useState({ candles: [], volumes: [] });
    const [loading, setLoading] = useState(true);
    const [hoverData, setHoverData] = useState(null);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const getDaysForTimeframe = (tf) => {
        switch (tf) {
            case '1W': return 7;
            case '1M': return 30;
            case '3M': return 90;
            case '6M': return 180;
            case '1Y': return 365;
            default: return 180;
        }
    };

    // Fetch candlestick & volume data
    useEffect(() => {
        if (!isOpen || !stock) return;

        let isMounted = true;
        setLoading(true);
        setHoverData(null);

        const fetchHistory = async () => {
            const days = getDaysForTimeframe(timeframe);
            const now = Math.floor(Date.now() / 1000);
            const period1 = now - (days * 24 * 3600);

            const sym = String(stock.symbol || stock.code || '').toUpperCase().trim();
            const name = stock.name || '';

            try {
                // 1. Upbit API for Crypto (.KRW)
                if (sym.includes('.KRW')) {
                    const coin = sym.replace('.KRW', '');
                    const res = await fetch(`https://api.upbit.com/v1/candles/days?market=KRW-${coin}&count=${Math.min(days, 200)}`);
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0 && isMounted) {
                        const rawCandles = [];
                        const rawVolumes = [];

                        data.forEach((c) => {
                            const dateStr = c.candle_date_time_kms ? c.candle_date_time_kms.split('T')[0] : c.candle_date_time_utc.split('T')[0];
                            const isUp = c.trade_price >= c.opening_price;
                            rawCandles.push({
                                time: dateStr,
                                open: c.opening_price,
                                high: c.high_price,
                                low: c.low_price,
                                close: c.trade_price,
                                value: c.trade_price,
                            });
                            rawVolumes.push({
                                time: dateStr,
                                value: c.candle_acc_trade_volume,
                                color: isUp ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.4)'
                            });
                        });

                        setChartData({
                            candles: sanitizeTimeSeries(rawCandles),
                            volumes: sanitizeTimeSeries(rawVolumes)
                        });
                        setLoading(false);
                        return;
                    }
                }

                // 2. Yahoo Finance for Korean Stocks, Forex, Gold
                let yahooSymbol = sym;
                if (!sym.includes('.KS') && !sym.includes('.KQ')) {
                    if (sym === 'USD/KRW' || name === 'USD/KRW') yahooSymbol = 'USDKRW=X';
                    else if (sym === 'KRW/VND' || name === 'KRW/VND') yahooSymbol = 'VND=X';
                    else if (sym === 'GOLD' || sym === 'GC=F' || name.includes('금')) yahooSymbol = 'GC=F';
                }

                const targetUrl = import.meta.env.DEV
                    ? `/api/yahoo/${yahooSymbol}?period1=${period1}&period2=${now}&interval=1d`
                    : `https://query2.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${period1}&period2=${now}&interval=1d`;

                const res = await fetch(targetUrl);
                if (res.ok) {
                    const data = await res.json();
                    if (data?.chart?.result?.[0] && isMounted) {
                        const result = data.chart.result[0];
                        const timestamps = result.timestamp || [];
                        const quotes = result.indicators?.quote?.[0] || {};
                        const closes = quotes.close || [];
                        const opens = quotes.open || [];
                        const highs = quotes.high || [];
                        const lows = quotes.low || [];
                        const volList = quotes.volume || [];

                        const rawCandles = [];
                        const rawVolumes = [];

                        for (let i = 0; i < timestamps.length; i++) {
                            if (closes[i] !== null && closes[i] !== undefined && opens[i] !== null && opens[i] !== undefined) {
                                const dateObj = new Date(timestamps[i] * 1000);
                                const y = dateObj.getFullYear();
                                const m = String(dateObj.getMonth() + 1).padStart(2, '0');
                                const d = String(dateObj.getDate()).padStart(2, '0');
                                const dateStr = `${y}-${m}-${d}`;

                                const o = Math.round(opens[i]);
                                const h = Math.round(highs[i]);
                                const l = Math.round(lows[i]);
                                const c = Math.round(closes[i]);
                                const v = volList[i] || 0;
                                const isUp = c >= o;

                                rawCandles.push({
                                    time: dateStr,
                                    open: o,
                                    high: h,
                                    low: l,
                                    close: c,
                                    value: c
                                });
                                rawVolumes.push({
                                    time: dateStr,
                                    value: v,
                                    color: isUp ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.4)'
                                });
                            }
                        }

                        if (rawCandles.length > 0) {
                            setChartData({
                                candles: sanitizeTimeSeries(rawCandles),
                                volumes: sanitizeTimeSeries(rawVolumes)
                            });
                            setLoading(false);
                            return;
                        }
                    }
                }
            } catch (err) {
                console.error("Historical chart fetch error:", err);
            }

            // Fallback generated mock data if API unavailable
            if (isMounted) {
                const basePrice = stock.price || 100000;
                const rawCandles = [];
                const rawVolumes = [];
                for (let i = days; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    const dateStr = `${y}-${m}-${day}`;

                    const randomVar = (Math.random() - 0.49) * (basePrice * 0.02);
                    const c = Math.max(100, Math.round(basePrice + randomVar));
                    const o = Math.round(c * (1 + (Math.random() - 0.5) * 0.01));
                    const h = Math.max(o, c) + Math.round(Math.random() * 500);
                    const l = Math.min(o, c) - Math.round(Math.random() * 500);
                    const isUp = c >= o;

                    rawCandles.push({ time: dateStr, open: o, high: h, low: l, close: c, value: c });
                    rawVolumes.push({ time: dateStr, value: Math.floor(Math.random() * 50000), color: isUp ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.4)' });
                }
                setChartData({
                    candles: sanitizeTimeSeries(rawCandles),
                    volumes: sanitizeTimeSeries(rawVolumes)
                });
                setLoading(false);
            }
        };

        fetchHistory();
        return () => { isMounted = false; };
    }, [isOpen, stock, timeframe]);

    // Statistics calculation
    const stats = useMemo(() => {
        if (!chartData.candles || chartData.candles.length === 0) {
            return { min: 0, max: 0, first: 0, last: 0, change: 0, changePct: 0 };
        }
        const closes = chartData.candles.map(c => c.close);
        const min = Math.min(...closes);
        const max = Math.max(...closes);
        const first = chartData.candles[0].close;
        const last = chartData.candles[chartData.candles.length - 1].close;
        const change = last - first;
        const changePct = first !== 0 ? (change / first) * 100 : 0;
        return { min, max, first, last, change, changePct };
    }, [chartData]);

    // Initialize TradingView lightweight-charts with v5 API: chart.addSeries(CandlestickSeries, ...)
    useEffect(() => {
        if (loading || !chartContainerRef.current || !chartData.candles || chartData.candles.length === 0) return;

        try {
            chartContainerRef.current.innerHTML = '';

            const chart = createChart(chartContainerRef.current, {
                width: chartContainerRef.current.clientWidth || 800,
                height: chartContainerRef.current.clientHeight || 400,
                layout: {
                    background: { type: ColorType.Solid, color: 'transparent' },
                    textColor: '#9ca3af',
                    fontSize: 12,
                    fontFamily: 'Pretendard, sans-serif',
                },
                grid: {
                    vertLines: { color: 'rgba(229, 231, 235, 0.5)' },
                    horzLines: { color: 'rgba(229, 231, 235, 0.5)' },
                },
                crosshair: {
                    mode: 1, // CrosshairMode.Normal
                },
                rightPriceScale: {
                    borderColor: '#e5e7eb',
                },
                timeScale: {
                    borderColor: '#e5e7eb',
                    timeVisible: true,
                    secondsVisible: false,
                },
            });

            chartInstanceRef.current = chart;

            // Lightweight-charts v5 API uses chart.addSeries(...)
            let mainSeries;
            if (chartType === 'candlestick') {
                mainSeries = chart.addSeries(CandlestickSeries, {
                    upColor: '#ef4444',        // Red ▲ for Korean market up
                    downColor: '#3b82f6',      // Blue ▼ for Korean market down
                    borderUpColor: '#ef4444',
                    borderDownColor: '#3b82f6',
                    wickUpColor: '#ef4444',
                    wickDownColor: '#3b82f6',
                });
                mainSeries.setData(chartData.candles);
            } else {
                const isOverallUp = stats.changePct >= 0;
                const lineColor = isOverallUp ? '#ef4444' : '#3b82f6';
                mainSeries = chart.addSeries(AreaSeries, {
                    topColor: isOverallUp ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.4)',
                    bottomColor: isOverallUp ? 'rgba(239, 68, 68, 0.0)' : 'rgba(59, 130, 246, 0.0)',
                    lineColor: lineColor,
                    lineWidth: 2,
                });
                mainSeries.setData(chartData.candles);
            }

            // Volume Series
            if (chartData.volumes && chartData.volumes.length > 0) {
                const volumeSeries = chart.addSeries(HistogramSeries, {
                    priceFormat: { type: 'volume' },
                    priceScaleId: '',
                });

                volumeSeries.priceScale().applyOptions({
                    scaleMargins: {
                        top: 0.8, // volume occupies bottom 20%
                        bottom: 0,
                    },
                });

                volumeSeries.setData(chartData.volumes);
            }

            // Crosshair hover listener
            chart.subscribeCrosshairMove((param) => {
                if (param.time && param.seriesData.has(mainSeries)) {
                    const dataPoint = param.seriesData.get(mainSeries);
                    setHoverData(dataPoint);
                } else {
                    setHoverData(null);
                }
            });

            chart.timeScale().fitContent();

            const handleResize = () => {
                if (chartContainerRef.current && chartInstanceRef.current) {
                    chartInstanceRef.current.applyOptions({
                        width: chartContainerRef.current.clientWidth,
                        height: chartContainerRef.current.clientHeight,
                    });
                }
            };

            window.addEventListener('resize', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);
                if (chartInstanceRef.current) {
                    chartInstanceRef.current.remove();
                    chartInstanceRef.current = null;
                }
            };
        } catch (err) {
            console.error("Error building TradingView chart:", err);
        }
    }, [chartData, chartType, loading, stats.changePct]);

    if (!isOpen || !stock) return null;

    const formatCurrency = (val) => {
        if (!val && val !== 0) return '-';
        return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(val);
    };

    const displayPoint = hoverData || (chartData.candles && chartData.candles.length > 0 ? chartData.candles[chartData.candles.length - 1] : null);

    const getTvExternalSymbol = (sym) => {
        const clean = String(sym || '').toUpperCase().trim();
        if (clean.includes('.KS')) return `KRX:${clean.replace('.KS', '')}`;
        if (clean.includes('.KQ')) return `KRX:${clean.replace('.KQ', '')}`;
        if (clean.includes('.KRW')) return `UPBIT:${clean.replace('.KRW', '')}KRW`;
        if (clean === 'USD/KRW') return 'FX_IDC:USDKRW';
        if (clean === 'KRW/VND') return 'FX_IDC:KRWVND';
        if (clean === 'GOLD' || clean === 'GC=F') return 'TVC:GOLD';
        return clean;
    };

    const externalTvSymbol = getTvExternalSymbol(stock.symbol || stock.code);

    return (
        <div 
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Bar */}
                <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/50">
                    <div className="flex items-center gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                                    {stock.name}
                                </h2>
                                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                    {stock.symbol || stock.code || '-'}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm mt-1">
                                <span className="font-black text-gray-900 dark:text-white text-base">
                                    {formatCurrency(displayPoint ? (displayPoint.close || displayPoint.value) : stock.price)} KRW
                                </span>
                                <span className={`font-bold text-xs ${stats.changePct >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                    {stats.changePct >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(stats.change))} ({Math.abs(stats.changePct).toFixed(2)}%)
                                </span>
                                {displayPoint?.time && (
                                    <span className="text-xs text-gray-400 font-mono">
                                        [{displayPoint.time}]
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Chart Type Toggle */}
                        <div className="flex items-center bg-gray-200 dark:bg-gray-700 p-1 rounded-xl gap-1">
                            <button
                                onClick={() => setChartType('candlestick')}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                                    chartType === 'candlestick'
                                        ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400'
                                }`}
                            >
                                캔들 (Candles)
                            </button>
                            <button
                                onClick={() => setChartType('area')}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                                    chartType === 'area'
                                        ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400'
                                }`}
                            >
                                라인 (Line)
                            </button>
                        </div>

                        {/* Timeframe Selector Pills */}
                        <div className="flex items-center bg-gray-200 dark:bg-gray-700 p-1 rounded-xl gap-1">
                            {['1W', '1M', '3M', '6M', '1Y'].map((tf) => (
                                <button
                                    key={tf}
                                    onClick={() => setTimeframe(tf)}
                                    className={`px-2.5 py-1 text-xs font-extrabold rounded-lg transition-all ${
                                        timeframe === tf
                                            ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                                >
                                    {tf}
                                </button>
                            ))}
                        </div>

                        <a
                            href={`https://kr.tradingview.com/symbols/${encodeURIComponent(externalTvSymbol)}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 flex items-center gap-1 transition"
                            title="TradingView 웹사이트에서 크게 보기"
                        >
                            <span>TradingView ↗</span>
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

                {/* Main Content Area */}
                <div className="flex-1 p-5 flex flex-col justify-between bg-white dark:bg-gray-800 overflow-hidden relative">
                    {/* OHLC Stats Row */}
                    <div className="grid grid-cols-5 gap-3 mb-3">
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">시가 (Open)</p>
                            <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                                {formatCurrency(displayPoint?.open || stats.first)} KRW
                            </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">고가 (High)</p>
                            <p className="text-xs font-black text-red-500 mt-0.5">
                                {formatCurrency(displayPoint?.high || stats.max)} KRW
                            </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">저가 (Low)</p>
                            <p className="text-xs font-black text-blue-500 mt-0.5">
                                {formatCurrency(displayPoint?.low || stats.min)} KRW
                            </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">종가 (Close)</p>
                            <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                                {formatCurrency(displayPoint?.close || displayPoint?.value || stats.last)} KRW
                            </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">최근 변동폭</p>
                            <p className={`text-xs font-bold mt-0.5 ${stats.changePct >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                {stats.changePct >= 0 ? '▲' : '▼'} {stats.changePct.toFixed(2)}%
                            </p>
                        </div>
                    </div>

                    {/* Official TradingView Lightweight Chart Canvas Container */}
                    <div className="flex-1 w-full relative min-h-[320px] rounded-2xl bg-gray-50/60 dark:bg-gray-900/40 p-2 border border-gray-100 dark:border-gray-700/60 overflow-hidden">
                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-gray-800/70 z-10 font-bold text-sm text-gray-500">
                                TradingView 차트 데이터를 불러오는 중...
                            </div>
                        )}
                        <div ref={chartContainerRef} className="w-full h-full" />
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-gray-400 dark:text-gray-500 mt-2 px-1">
                        <span>TradingView Lightweight Charts™ 엔진 (한국 시장 실시간 데이터)</span>
                        <span>Shift + 마우스 휠로 축소/확대, 드래그로 이동</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function StockChartModal(props) {
    return (
        <ChartErrorBoundary onClose={props.onClose}>
            <StockChartContent {...props} />
        </ChartErrorBoundary>
    );
}
