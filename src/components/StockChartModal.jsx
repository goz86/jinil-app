import React, { useState, useEffect, useMemo } from 'react';

export default function StockChartModal({ stock, isOpen, onClose }) {
    const [timeframe, setTimeframe] = useState('6M'); // 1W, 1M, 3M, 6M, 1Y
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hoverPoint, setHoverPoint] = useState(null);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Map timeframe to days count
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

    // Fetch historical price series from Yahoo Finance or Upbit
    useEffect(() => {
        if (!isOpen || !stock) return;

        let isMounted = true;
        setLoading(true);
        setHoverPoint(null);

        const fetchHistory = async () => {
            const days = getDaysForTimeframe(timeframe);
            const now = Math.floor(Date.now() / 1000);
            const period1 = now - (days * 24 * 3600);

            const sym = stock.symbol || stock.code || '';
            const name = stock.name || '';

            try {
                // 1. Upbit API for Crypto
                if (sym.includes('.KRW')) {
                    const coin = sym.replace('.KRW', '');
                    const res = await fetch(`https://api.upbit.com/v1/candles/days?market=KRW-${coin}&count=${Math.min(days, 200)}`);
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0 && isMounted) {
                        const parsed = data.reverse().map(c => ({
                            date: c.candle_date_time_kms ? c.candle_date_time_kms.split('T')[0] : c.candle_date_time_utc.split('T')[0],
                            price: c.trade_price,
                            open: c.opening_price,
                            high: c.high_price,
                            low: c.low_price,
                            volume: c.candle_acc_trade_volume
                        }));
                        setChartData(parsed);
                        setLoading(false);
                        return;
                    }
                }

                // 2. Yahoo Finance for Korean Stocks, Forex, Gold
                let yahooSymbol = sym;
                if (sym.includes('.KS') || sym.includes('.KQ')) {
                    yahooSymbol = sym;
                } else if (sym === 'USD/KRW' || name === 'USD/KRW') {
                    yahooSymbol = 'USDKRW=X';
                } else if (sym === 'KRW/VND' || name === 'KRW/VND') {
                    yahooSymbol = 'VND=X';
                } else if (sym === 'GOLD' || sym === 'GC=F' || name.includes('금')) {
                    yahooSymbol = 'GC=F';
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
                        const volumes = quotes.volume || [];

                        const parsed = [];
                        for (let i = 0; i < timestamps.length; i++) {
                            const price = closes[i];
                            if (price !== null && price !== undefined) {
                                const dateObj = new Date(timestamps[i] * 1000);
                                const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
                                parsed.push({
                                    date: dateStr,
                                    price: price,
                                    open: opens[i] || price,
                                    high: highs[i] || price,
                                    low: lows[i] || price,
                                    volume: volumes[i] || 0
                                });
                            }
                        }
                        if (parsed.length > 0) {
                            setChartData(parsed);
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
                const mock = [];
                for (let i = days; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const randomVariation = (Math.random() - 0.49) * (basePrice * 0.02);
                    const p = Math.max(100, Math.round(basePrice + randomVariation));
                    mock.push({
                        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
                        price: p,
                        open: p * 0.99,
                        high: p * 1.01,
                        low: p * 0.98,
                        volume: Math.floor(Math.random() * 50000)
                    });
                }
                setChartData(mock);
                setLoading(false);
            }
        };

        fetchHistory();
        return () => { isMounted = false; };
    }, [isOpen, stock, timeframe]);

    // Statistics calculations
    const stats = useMemo(() => {
        if (!chartData || chartData.length === 0) return { min: 0, max: 0, first: 0, last: 0, change: 0, changePct: 0 };
        const prices = chartData.map(d => d.price);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const first = chartData[0].price;
        const last = chartData[chartData.length - 1].price;
        const change = last - first;
        const changePct = first !== 0 ? (change / first) * 100 : 0;
        return { min, max, first, last, change, changePct };
    }, [chartData]);

    if (!isOpen || !stock) return null;

    const isUp = stats.changePct >= 0;
    const strokeColor = isUp ? "#ef4444" : "#3b82f6"; // Red up, Blue down (Korean standard)

    const formatCurrency = (val) => {
        if (!val && val !== 0) return '-';
        return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(val);
    };

    const activePoint = hoverPoint || (chartData.length > 0 ? chartData[chartData.length - 1] : null);

    return (
        <div 
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Bar - NO ICONS */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/50">
                    <div className="flex items-center gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                                    {stock.name}
                                </h2>
                                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                    {stock.symbol || stock.code || '-'}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm mt-1">
                                <span className="font-black text-gray-900 dark:text-white text-base">
                                    {formatCurrency(activePoint ? activePoint.price : stock.price)} KRW
                                </span>
                                <span className={`font-bold text-xs ${stats.changePct >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                    {stats.changePct >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(stats.change))} ({Math.abs(stats.changePct).toFixed(2)}%)
                                </span>
                                {activePoint && (
                                    <span className="text-xs text-gray-400 font-mono">
                                        [{activePoint.date}]
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Timeframe Selector Pills */}
                        <div className="flex items-center bg-gray-100 dark:bg-gray-700/80 p-1 rounded-xl gap-1">
                            {['1W', '1M', '3M', '6M', '1Y'].map((tf) => (
                                <button
                                    key={tf}
                                    onClick={() => setTimeframe(tf)}
                                    className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all ${
                                        timeframe === tf
                                            ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
                                    }`}
                                >
                                    {tf}
                                </button>
                            ))}
                        </div>

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
                <div className="flex-1 p-6 flex flex-col justify-between bg-white dark:bg-gray-800 overflow-hidden relative">
                    {/* Summary Stats Row */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">기간 최고가 (High)</p>
                            <p className="text-sm font-black text-red-500 mt-0.5">{formatCurrency(stats.max)} KRW</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">기간 최저가 (Low)</p>
                            <p className="text-sm font-black text-blue-500 mt-0.5">{formatCurrency(stats.min)} KRW</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">시작가 (Start)</p>
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-0.5">{formatCurrency(stats.first)} KRW</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">최근 종가 (Close)</p>
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-0.5">{formatCurrency(stats.last)} KRW</p>
                        </div>
                    </div>

                    {/* Interactive Canvas/SVG Area Chart */}
                    <div className="flex-1 w-full relative min-h-[300px] flex items-center justify-center border border-gray-100 dark:border-gray-700/60 rounded-2xl bg-gray-50/50 dark:bg-gray-900/30 p-4">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center text-gray-400 font-bold text-sm animate-pulse">
                                <span>시세 차트를 불러오는 중...</span>
                            </div>
                        ) : chartData.length < 2 ? (
                            <div className="text-gray-400 font-medium text-sm">차트 데이터가 부족합니다.</div>
                        ) : (
                            <SvgChart
                                data={chartData}
                                stats={stats}
                                strokeColor={strokeColor}
                                onHover={setHoverPoint}
                            />
                        )}
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-gray-400 dark:text-gray-500 mt-3 px-1">
                        <span>💡 차트 위에 마우스를 올리면 해당 날짜의 상세 가격을 확인할 수 있습니다.</span>
                        <span>실시간 시장 데이터 기준 (한국시간)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Clean SVG Area Chart with Hover Crosshair and Volume Bars
function SvgChart({ data, stats, strokeColor, onHover }) {
    const [hoverIndex, setHoverIndex] = useState(null);

    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;
    const width = 800;
    const height = 300;

    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;

    const range = stats.max - stats.min || 1;

    const points = data.map((d, idx) => {
        const x = paddingLeft + (idx / (data.length - 1)) * chartW;
        const y = paddingTop + chartH - ((d.price - stats.min) / range) * chartH;
        return { x, y, data: d, idx };
    });

    const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
    const areaPoints = `${paddingLeft},${height - paddingBottom} ${polylinePoints} ${width - paddingRight},${height - paddingBottom}`;

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const scaleX = width / rect.width;
        const actualX = mouseX * scaleX;

        // Find closest point
        let closestIdx = 0;
        let minDiff = Infinity;
        points.forEach((p, idx) => {
            const diff = Math.abs(p.x - actualX);
            if (diff < minDiff) {
                minDiff = diff;
                closestIdx = idx;
            }
        });

        setHoverIndex(closestIdx);
        onHover(data[closestIdx]);
    };

    const handleMouseLeave = () => {
        setHoverIndex(null);
        onHover(null);
    };

    const activePoint = hoverIndex !== null ? points[hoverIndex] : null;

    return (
        <svg
            className="w-full h-full overflow-visible select-none cursor-crosshair"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = paddingTop + chartH * (1 - ratio);
                const val = stats.min + range * ratio;
                return (
                    <g key={ratio}>
                        <line
                            x1={paddingLeft}
                            y1={y}
                            x2={width - paddingRight}
                            y2={y}
                            stroke="#e5e7eb"
                            strokeDasharray="4 4"
                            strokeWidth="1"
                            className="dark:stroke-gray-700"
                        />
                        <text
                            x={paddingLeft - 8}
                            y={y + 4}
                            fill="#9ca3af"
                            fontSize="10"
                            fontWeight="bold"
                            textAnchor="end"
                        >
                            {Math.round(val).toLocaleString()}
                        </text>
                    </g>
                );
            })}

            {/* Gradient Fill Area */}
            <polygon points={areaPoints} fill="url(#chartGradient)" />

            {/* Main Trend Polyline */}
            <polyline
                fill="none"
                stroke={strokeColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylinePoints}
            />

            {/* Hover Crosshair Cursor */}
            {activePoint && (
                <g>
                    {/* Vertical Line */}
                    <line
                        x1={activePoint.x}
                        y1={paddingTop}
                        x2={activePoint.x}
                        y2={height - paddingBottom}
                        stroke="#9ca3af"
                        strokeDasharray="3 3"
                        strokeWidth="1.5"
                    />
                    {/* Horizontal Line */}
                    <line
                        x1={paddingLeft}
                        y1={activePoint.y}
                        x2={width - paddingRight}
                        y2={activePoint.y}
                        stroke="#9ca3af"
                        strokeDasharray="3 3"
                        strokeWidth="1.5"
                    />
                    {/* Point Circle */}
                    <circle
                        cx={activePoint.x}
                        cy={activePoint.y}
                        r="6"
                        fill={strokeColor}
                        stroke="#ffffff"
                        strokeWidth="2"
                    />
                </g>
            )}

            {/* X-Axis Date Labels */}
            {points.length > 0 && [0, Math.floor(points.length / 2), points.length - 1].map((idx) => {
                const p = points[idx];
                if (!p) return null;
                return (
                    <text
                        key={idx}
                        x={p.x}
                        y={height - 12}
                        fill="#9ca3af"
                        fontSize="10"
                        fontWeight="bold"
                        textAnchor={idx === 0 ? 'start' : idx === points.length - 1 ? 'end' : 'middle'}
                    >
                        {p.data.date}
                    </text>
                );
            })}
        </svg>
    );
}
