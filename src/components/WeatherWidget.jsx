import React, { useState, useEffect, useCallback } from 'react';

// Weather code to Pure Korean condition & SVG icon mapper
const getWeatherInfo = (code) => {
    switch (code) {
        case 0:
            return { label: '맑음', icon: '☀️', bgTint: 'from-amber-500/10 to-orange-500/10' };
        case 1:
            return { label: '대체로 맑음', icon: '🌤️', bgTint: 'from-amber-400/10 to-blue-400/10' };
        case 2:
            return { label: '구름 조금', icon: '⛅', bgTint: 'from-blue-400/10 to-slate-400/10' };
        case 3:
            return { label: '흐림', icon: '☁️', bgTint: 'from-slate-500/10 to-gray-500/10' };
        case 45:
        case 48:
            return { label: '안개', icon: '🌫️', bgTint: 'from-slate-400/10 to-zinc-500/10' };
        case 51:
        case 53:
        case 55:
            return { label: '이슬비', icon: '🌧️', bgTint: 'from-blue-500/10 to-cyan-500/10' };
        case 61:
        case 63:
        case 65:
            return { label: '비', icon: '🌧️', bgTint: 'from-blue-600/10 to-indigo-600/10' };
        case 71:
        case 73:
        case 75:
        case 77:
            return { label: '눈', icon: '❄️', bgTint: 'from-cyan-300/10 to-blue-300/10' };
        case 80:
        case 81:
        case 82:
            return { label: '소나기', icon: '🌦️', bgTint: 'from-blue-500/10 to-sky-500/10' };
        case 85:
        case 86:
            return { label: '소나기 눈', icon: '🌨️', bgTint: 'from-sky-300/10 to-indigo-300/10' };
        case 95:
        case 96:
        case 99:
            return { label: '뇌우', icon: '🌩️', bgTint: 'from-purple-600/10 to-indigo-700/10' };
        default:
            return { label: '맑음', icon: '🌤️', bgTint: 'from-blue-500/10 to-indigo-500/10' };
    }
};

// Fallback reverse geocoder for major Korean coordinates
const getKoreanCityName = (lat, lon, rawCityName) => {
    if (rawCityName && typeof rawCityName === 'string') {
        const clean = rawCityName.trim();
        if (clean.includes('Seoul') || clean.includes('서울')) return '서울특별시';
        if (clean.includes('Incheon') || clean.includes('인천')) return '인천광역시';
        if (clean.includes('Busan') || clean.includes('부산')) return '부산광역시';
        if (clean.includes('Daegu') || clean.includes('대구')) return '대구광역시';
        if (clean.includes('Daejeon') || clean.includes('대전')) return '대전광역시';
        if (clean.includes('Gwangju') || clean.includes('광주')) return '광주광역시';
        if (clean.includes('Ulsan') || clean.includes('울산')) return '울산광역시';
        if (clean.includes('Suwon') || clean.includes('수원')) return '수원시';
        if (clean.includes('Seongnam') || clean.includes('성남')) return '성남시';
        if (clean.includes('Goyang') || clean.includes('고양')) return '고양시';
        if (clean.includes('Yongin') || clean.includes('용인')) return '용인시';
        if (clean.includes('Bucheon') || clean.includes('부천')) return '부천시';
        if (clean.includes('Ansan') || clean.includes('안산')) return '안산시';
        if (clean.includes('Hwaseong') || clean.includes('화성')) return '화성시';
        if (clean.includes('Cheongju') || clean.includes('청주')) return '청주시';
        if (clean.includes('Jeonju') || clean.includes('전주')) return '전주시';
        if (clean.includes('Jeju') || clean.includes('제주')) return '제주특별자치도';
    }

    // Latitude / Longitude fallback box check for South Korea regions
    if (lat >= 37.4 && lat <= 37.7 && lon >= 126.8 && lon <= 127.2) return '서울특별시';
    if (lat >= 37.3 && lat <= 37.6 && lon >= 126.5 && lon <= 126.8) return '인천광역시';
    if (lat >= 37.1 && lat <= 37.4 && lon >= 126.9 && lon <= 127.2) return '수원시';
    if (lat >= 35.0 && lat <= 35.3 && lon >= 128.9 && lon <= 129.3) return '부산광역시';
    if (lat >= 35.7 && lat <= 36.0 && lon >= 128.4 && lon <= 128.8) return '대구광역시';
    if (lat >= 36.2 && lat <= 36.5 && lon >= 127.3 && lon <= 127.5) return '대전광역시';
    if (lat >= 35.1 && lat <= 35.3 && lon >= 126.7 && lon <= 127.0) return '광주광역시';

    return rawCityName || '내 위치';
};

export default function WeatherWidget() {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [lastUpdated, setLastUpdated] = useState('');

    const fetchWeatherData = useCallback(async (lat, lon) => {
        try {
            setLoading(true);
            setError(false);

            // Fetch Realtime Weather from Open-Meteo
            const weatherRes = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m,apparent_temperature&timezone=auto`
            );
            if (!weatherRes.ok) throw new Error('Weather API error');
            const data = await weatherRes.json();

            // Reverse Geocode for Korean Place Name
            let placeName = '';
            try {
                const geoRes = await fetch(
                    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ko`
                );
                if (geoRes.ok) {
                    const geoData = await geoRes.json();
                    placeName = geoData.locality || geoData.city || geoData.principalSubdivision || '';
                }
            } catch (e) {
                console.warn('Reverse geocode failed, using fallback mapper', e);
            }

            const koreanLocation = getKoreanCityName(lat, lon, placeName);
            const current = data.current_weather || {};
            const hourly = data.hourly || {};

            // Humidity & Apparent temp extraction
            const currentHourIndex = new Date().getHours();
            const humidity = hourly.relativehumidity_2m ? hourly.relativehumidity_2m[currentHourIndex] || 60 : 60;
            const apparentTemp = hourly.apparent_temperature ? hourly.apparent_temperature[currentHourIndex] : current.temperature;

            setWeather({
                location: koreanLocation,
                temp: Math.round(current.temperature),
                feelsLike: Math.round(apparentTemp),
                windSpeed: current.windspeed ? (current.windspeed / 3.6).toFixed(1) : '1.5', // km/h to m/s
                humidity: humidity,
                code: current.weathercode || 0,
            });

            const now = new Date();
            setLastUpdated(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
        } catch (err) {
            console.error('Weather fetch error:', err);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    const getLocationAndFetch = useCallback(() => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    fetchWeatherData(pos.coords.latitude, pos.coords.longitude);
                },
                (err) => {
                    console.warn('Geolocation position access denied/failed, falling back to IP location', err);
                    // Fallback to Seoul coordinates (37.5665, 126.9780)
                    fetchWeatherData(37.5665, 126.9780);
                },
                { timeout: 8000, maximumAge: 600000 }
            );
        } else {
            // Fallback for environments without geolocation
            fetchWeatherData(37.5665, 126.9780);
        }
    }, [fetchWeatherData]);

    useEffect(() => {
        getLocationAndFetch();

        // 10-Minute Auto Refresh Timer (600,000 ms)
        const interval = setInterval(() => {
            getLocationAndFetch();
        }, 600000);

        return () => clearInterval(interval);
    }, [getLocationAndFetch]);

    const weatherInfo = weather ? getWeatherInfo(weather.code) : { label: '불러오는 중', icon: '🌤️', bgTint: 'from-blue-500/10 to-indigo-500/10' };

    return (
        <div className={`relative overflow-hidden rounded-2xl p-3.5 border transition-all duration-300 shadow-md backdrop-blur-md ${
            'bg-white/40 dark:bg-slate-800/40 border-white/50 dark:border-slate-700/60 shadow-black/5 hover:border-white/70 dark:hover:border-slate-600'
        }`}>
            {/* Ambient Background Gradient Tint */}
            <div className={`absolute -inset-2 bg-gradient-to-br ${weatherInfo.bgTint} pointer-events-none blur-xl opacity-70`}></div>

            <div className="relative z-10 flex flex-col justify-between h-full min-h-[105px]">
                {/* Header: Location & Live Status Refresh */}
                <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate tracking-tight">
                            {weather ? weather.location : '위치 확인 중...'}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={getLocationAndFetch}
                        title="10분 주기 실시간 갱신"
                        className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full bg-white/50 dark:bg-slate-700/50 border border-white/60 dark:border-slate-600/60 text-slate-600 dark:text-slate-300 hover:scale-105 active:scale-95 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>{lastUpdated ? `${lastUpdated} 갱신` : '실시간'}</span>
                    </button>
                </div>

                {/* Body: Temperature & Large Weather Icon */}
                {loading && !weather ? (
                    <div className="flex items-center justify-center py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 animate-pulse">
                        날씨 정보 업데이트 중...
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-between py-2">
                        <span className="text-xs text-slate-500">날씨 불러오기 실패</span>
                        <button onClick={getLocationAndFetch} className="text-xs text-blue-600 font-bold underline">재시도</button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between my-1">
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                                    {weather.temp}°
                                </span>
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                                    C
                                </span>
                                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 ml-1.5">
                                    (체감 {weather.feelsLike}°)
                                </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <span className="text-2xl drop-shadow-sm select-none" role="img" aria-label={weatherInfo.label}>
                                    {weatherInfo.icon}
                                </span>
                                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                                    {weatherInfo.label}
                                </span>
                            </div>
                        </div>

                        {/* Footer Details Pill: Humidity & Wind */}
                        <div className="flex items-center justify-between text-[9.5px] font-semibold text-slate-600 dark:text-slate-300 pt-1.5 border-t border-slate-200/40 dark:border-slate-700/40">
                            <span className="flex items-center gap-1">
                                <svg className="w-3 h-3 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                                </svg>
                                습도 {weather.humidity}%
                            </span>
                            <span className="flex items-center gap-1">
                                <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                                풍속 {weather.windSpeed}m/s
                            </span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
