import React, { useState, useEffect, useCallback } from 'react';
import WeatherIcon from './WeatherIcon';
import WeatherAtmosphere from './effects/WeatherAtmosphere';

// Helper to determine whether it's currently night time (7 PM - 6 AM)
const checkIsNight = (isDayParam) => {
    if (isDayParam !== undefined && isDayParam !== null) {
        return isDayParam === 0;
    }
    const hour = new Date().getHours();
    return hour >= 19 || hour < 6;
};

// Weather code to Pure Korean condition, SVG icon type & dynamic theme tint mapper
const getWeatherInfo = (code, isNight = false) => {
    if (isNight) {
        switch (code) {
            case 0:
                return {
                    label: '맑은 밤',
                    iconType: 'clear-night',
                    bgClass: 'bg-[#1b365d]/95 text-white border-blue-400/30 dark:bg-[#122543]/95 dark:border-blue-500/30 shadow-lg backdrop-blur-xl',
                    bgTint: 'from-[#2b528d]/60 via-[#1b365d]/50 to-[#0e1e38]/40'
                };
            case 1:
            case 2:
                return {
                    label: '구름 조금 (밤)',
                    iconType: 'partly-cloudy-night',
                    bgClass: 'bg-[#1b365d]/90 text-white border-blue-400/25 dark:bg-[#122543]/90 dark:border-blue-500/25 shadow-lg backdrop-blur-xl',
                    bgTint: 'from-[#284c82]/55 via-[#183154]/45 to-[#0d1a30]/35'
                };
            case 3:
                return {
                    label: '흐린 밤',
                    iconType: 'cloudy',
                    bgClass: 'bg-[#192f52]/90 text-white border-blue-400/20 dark:bg-[#101e36]/90 dark:border-blue-500/20 shadow-lg backdrop-blur-xl',
                    bgTint: 'from-[#203a63]/50 via-[#142642]/40 to-[#0b1424]/30'
                };
            case 51:
            case 53:
            case 55:
            case 61:
            case 63:
            case 65:
                return {
                    label: '밤비',
                    iconType: 'rain',
                    bgClass: 'bg-[#16335c]/95 text-white border-blue-400/35 dark:bg-[#0e2240]/95 dark:border-blue-500/35 shadow-lg backdrop-blur-xl',
                    bgTint: 'from-[#1e467d]/65 via-[#122c52]/55 to-[#0a182e]/45'
                };
            default:
                return {
                    label: '맑은 밤',
                    iconType: 'clear-night',
                    bgClass: 'bg-[#1b365d]/95 text-white border-blue-400/30 dark:bg-[#122543]/95 dark:border-blue-500/30 shadow-lg backdrop-blur-xl',
                    bgTint: 'from-[#2b528d]/60 via-[#1b365d]/50 to-[#0e1e38]/40'
                };
        }
    }

    switch (code) {
        case 0:
            return {
                label: '맑음',
                iconType: 'clear-day',
                bgClass: 'bg-amber-50/90 dark:bg-amber-950/50 border-amber-200/80 dark:border-amber-700/60',
                bgTint: 'from-amber-400/35 via-orange-400/25 to-amber-500/15'
            };
        case 1:
            return {
                label: '대체로 맑음',
                iconType: 'partly-cloudy-day',
                bgClass: 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200/70 dark:border-amber-800/50',
                bgTint: 'from-amber-300/30 via-blue-300/20 to-orange-400/15'
            };
        case 2:
            return {
                label: '구름 조금',
                iconType: 'partly-cloudy-day',
                bgClass: 'bg-slate-50/90 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-700/60',
                bgTint: 'from-sky-300/30 via-slate-400/25 to-gray-400/15'
            };
        case 3:
            return {
                label: '흐림',
                iconType: 'cloudy',
                bgClass: 'bg-slate-100/90 dark:bg-slate-900/80 border-slate-300/80 dark:border-slate-700/70',
                bgTint: 'from-slate-500/35 via-gray-500/30 to-slate-600/20'
            };
        case 45:
        case 48:
            return {
                label: '안개',
                iconType: 'fog',
                bgClass: 'bg-zinc-100/90 dark:bg-zinc-900/80 border-zinc-300/80 dark:border-zinc-700/70',
                bgTint: 'from-zinc-400/35 via-slate-400/30 to-gray-500/20'
            };
        case 51:
        case 53:
        case 55:
            return {
                label: '이슬비',
                iconType: 'rain',
                bgClass: 'bg-blue-50/90 dark:bg-blue-950/60 border-blue-200/80 dark:border-blue-700/60',
                bgTint: 'from-cyan-400/35 via-blue-500/30 to-sky-600/20'
            };
        case 61:
        case 63:
        case 65:
            return {
                label: '비',
                iconType: 'rain',
                bgClass: 'bg-blue-100/90 dark:bg-blue-950/80 border-blue-300/80 dark:border-blue-700/80',
                bgTint: 'from-blue-600/40 via-indigo-600/35 to-cyan-600/30'
            };
        case 71:
        case 73:
        case 75:
        case 77:
            return {
                label: '눈',
                iconType: 'snow',
                bgClass: 'bg-cyan-50/90 dark:bg-cyan-950/60 border-cyan-200/80 dark:border-cyan-700/60',
                bgTint: 'from-cyan-300/40 via-sky-300/35 to-blue-400/30'
            };
        case 80:
        case 81:
        case 82:
            return {
                label: '소나기',
                iconType: 'rain',
                bgClass: 'bg-sky-100/90 dark:bg-sky-950/70 border-sky-300/80 dark:border-sky-700/70',
                bgTint: 'from-sky-500/40 via-blue-500/35 to-indigo-500/30'
            };
        case 85:
        case 86:
            return {
                label: '소나기 눈',
                iconType: 'snow',
                bgClass: 'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-200/80 dark:border-indigo-700/60',
                bgTint: 'from-indigo-400/40 via-sky-300/35 to-cyan-300/30'
            };
        case 95:
        case 96:
        case 99:
            return {
                label: '뇌우',
                iconType: 'thunder',
                bgClass: 'bg-purple-100/90 dark:bg-purple-950/80 border-purple-300/80 dark:border-purple-700/80',
                bgTint: 'from-purple-600/40 via-indigo-700/35 to-slate-800/30'
            };
        default:
            return {
                label: '맑음',
                iconType: 'clear-day',
                bgClass: 'bg-amber-50/90 dark:bg-amber-950/50 border-amber-200/80 dark:border-amber-700/60',
                bgTint: 'from-amber-400/35 via-orange-400/25 to-amber-500/15'
            };
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

    if (lat >= 37.4 && lat <= 37.7 && lon >= 126.8 && lon <= 127.2) return '서울특별시';
    if (lat >= 37.3 && lat <= 37.6 && lon >= 126.5 && lon <= 126.8) return '인천광역시';
    if (lat >= 37.1 && lat <= 37.4 && lon >= 126.9 && lon <= 127.2) return '수원시';
    if (lat >= 35.0 && lat <= 35.3 && lon >= 128.9 && lon <= 129.3) return '부산광역시';
    if (lat >= 35.7 && lat <= 36.0 && lon >= 128.4 && lon <= 128.8) return '대구광역시';
    if (lat >= 36.2 && lat <= 36.5 && lon >= 127.3 && lon <= 127.5) return '대전광역시';
    if (lat >= 35.1 && lat <= 35.3 && lon >= 126.7 && lon <= 126.9) return '광주광역시';

    return rawCityName || '서울특별시';
};

// Map text weather descriptions from wttr.in to Open-Meteo codes
const parseWttrConditionCode = (desc) => {
    if (!desc) return 0;
    const lower = desc.toLowerCase();
    if (lower.includes('sunny') || lower.includes('clear')) return 0;
    if (lower.includes('partly cloudy')) return 2;
    if (lower.includes('cloudy') || lower.includes('overcast')) return 3;
    if (lower.includes('fog') || lower.includes('mist')) return 45;
    if (lower.includes('drizzle')) return 51;
    if (lower.includes('heavy rain') || lower.includes('torrential')) return 65;
    if (lower.includes('rain') || lower.includes('shower')) return 61;
    if (lower.includes('snow') || lower.includes('blizzard')) return 71;
    if (lower.includes('thunder')) return 95;
    return 1;
};

// Map MET Norway weather symbol codes to label, iconType & code
const mapMetNoSymbol = (symbol = '', isNight = false) => {
    const s = (symbol || '').toLowerCase();
    if (s.includes('thunder')) {
        return { label: '뇌우', iconType: 'thunder', code: 95 };
    }
    if (s.includes('snow') || s.includes('sleet')) {
        return { label: '눈', iconType: 'snow', code: 71 };
    }
    if (s.includes('rain') || s.includes('drizzle')) {
        return { label: isNight ? '밤비' : '비', iconType: 'rain', code: 61 };
    }
    if (s.includes('fog')) {
        return { label: '안개', iconType: 'fog', code: 45 };
    }
    if (s.includes('cloudy') || s.includes('overcast')) {
        return { 
            label: isNight ? '흐린 밤' : '흐림', 
            iconType: 'cloudy', 
            code: 3 
        };
    }
    if (s.includes('partlycloudy') || s.includes('fair')) {
        return { 
            label: isNight ? '구름 조금 (밤)' : '구름 조금', 
            iconType: isNight ? 'partly-cloudy-night' : 'partly-cloudy-day', 
            code: 2 
        };
    }
    if (s.includes('clearsky') || s.includes('clear')) {
        return { 
            label: isNight ? '맑은 밤' : '맑음', 
            iconType: isNight ? 'clear-night' : 'clear-day', 
            code: 0 
        };
    }
    return {
        label: isNight ? '맑은 밤' : '맑음',
        iconType: isNight ? 'clear-night' : 'clear-day',
        code: 0
    };
};

// Safe seasonal fallback forecast for offline or disconnected situations (Korean climate)
const getSeasonalFallbackForecast = () => {
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const now = new Date();
    const month = now.getMonth(); // 0: Jan, 10: Nov, 11: Dec

    let baseMax = 12, baseMin = 3;
    if (month >= 11 || month <= 1) { // Winter (Dec - Feb)
        baseMax = 3; baseMin = -5;
    } else if (month >= 2 && month <= 4) { // Spring (Mar - May)
        baseMax = 16; baseMin = 6;
    } else if (month >= 5 && month <= 7) { // Summer (Jun - Aug)
        baseMax = 28; baseMin = 21;
    } else { // Autumn (Sep - Nov)
        baseMax = 12; baseMin = 3;
    }

    const forecast = [];
    for (let i = 1; i <= 4; i++) {
        const nextD = new Date(now);
        nextD.setDate(now.getDate() + i);
        forecast.push({
            dayLabel: dayNames[nextD.getDay()],
            iconType: i % 2 === 0 ? 'partly-cloudy-day' : 'clear-day',
            maxTemp: baseMax + (i % 2 === 0 ? -1 : 1),
            minTemp: baseMin + (i % 2 === 0 ? -1 : 0),
            code: i % 2 === 0 ? 2 : 0
        });
    }
    return forecast;
};

// Fetch helper with timeout to avoid lingering hung requests
const fetchWithTimeout = async (url, options = {}, timeoutMs = 4000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (err) {
        clearTimeout(timeoutId);
        throw err;
    }
};

export default function WeatherWidget() {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(() => {
        try {
            const cached = localStorage.getItem('jinil_weather_cache');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed.updatedAt) return `${parsed.updatedAt}`;
            }
        } catch (e) {}
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    });
    const [activeSlide, setActiveSlide] = useState(0); // 0: Live Current Weather, 1: 4-Day Forecast

    const isNightNow = weather ? (weather.isNight !== undefined ? weather.isNight : checkIsNight()) : checkIsNight();
    const weatherInfo = weather ? getWeatherInfo(weather.code, isNightNow) : (isNightNow ? { label: '맑은 밤', iconType: 'clear-night', bgClass: 'bg-slate-900/90 text-slate-100 border-indigo-900/80', bgTint: 'from-indigo-950/90 to-slate-900/90' } : { label: '불러오는 중', iconType: 'partly-cloudy-day', bgClass: 'bg-slate-50/90 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-700/60', bgTint: 'from-blue-500/15 to-indigo-500/15' });

    // Drag / Touch Swipe gesture state
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    const handleTouchStart = (e) => {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        setStartX(clientX);
        setStartY(clientY);
        setIsDragging(true);
    };

    const triggerFullscreenWeather = useCallback(() => {
        window.dispatchEvent(new CustomEvent('jinil:trigger-fullscreen-weather', {
            detail: {
                iconType: weatherInfo.iconType,
                isNight: isNightNow
            }
        }));
    }, [weatherInfo.iconType, isNightNow]);

    const handleTouchEnd = (e) => {
        if (!isDragging) return;
        const endX = e.changedTouches ? e.changedTouches[0].clientX : (e.clientX || startX);
        const endY = e.changedTouches ? e.changedTouches[0].clientY : (e.clientY || startY);
        const diffX = startX - endX;
        const diffY = startY - endY;

        // Horizontal swipe gesture for slide switching
        if (Math.abs(diffX) > 25 && Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX > 25) {
                setActiveSlide(1);
            } else if (diffX < -25) {
                setActiveSlide(0);
            }
        }
        setIsDragging(false);
    };

    const handleCardClick = (e) => {
        // Ignore clicks on buttons or preview triggers
        if (e.target.closest('button') || e.target.closest('[data-no-fullscreen]')) return;
        triggerFullscreenWeather();
    };

    // 5-Minute Auto Slide Toggle Timer (300,000 ms)
    useEffect(() => {
        const slideInterval = setInterval(() => {
            setActiveSlide(prev => (prev === 0 ? 1 : 0));
        }, 300000);
        return () => clearInterval(slideInterval);
    }, []);

    const saveWeatherToCache = (weatherData, timeStr) => {
        try {
            localStorage.setItem('jinil_weather_cache', JSON.stringify({
                data: weatherData,
                updatedAt: timeStr,
                timestamp: Date.now()
            }));
        } catch (e) {}
    };

    const loadWeatherFromCache = () => {
        try {
            const cached = localStorage.getItem('jinil_weather_cache');
            if (cached) {
                const parsed = JSON.parse(cached);
                setWeather(parsed.data);
                setLastUpdated(`${parsed.updatedAt} (저장됨)`);
                return true;
            }
        } catch (e) {}
        return false;
    };

    const fetchWeatherData = useCallback(async (lat, lon) => {
        setLoading(true);
        setError(false);

        const now = new Date();
        const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

        // Reverse Geocode for Korean Place Name
        let placeName = '';
        try {
            const geoRes = await fetchWithTimeout(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ko`,
                {},
                3000
            );
            if (geoRes.ok) {
                const geoData = await geoRes.json();
                placeName = geoData.locality || geoData.city || geoData.principalSubdivision || '';
            }
        } catch (e) {}
        const koreanLocation = getKoreanCityName(lat, lon, placeName);

        // --- PRIMARY PROVIDER: MET Norway (Norwegian Meteorological Institute - Global standard, 100% free, CORS) ---
        try {
            const metRes = await fetchWithTimeout(
                `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`,
                {},
                4000
            );
            if (metRes.ok) {
                const metData = await metRes.json();
                const timeseries = metData?.properties?.timeseries;
                if (timeseries && timeseries.length > 0) {
                    const currentItem = timeseries[0];
                    const instant = currentItem?.data?.instant?.details || {};
                    const currentTemp = Math.round(instant.air_temperature ?? 14);
                    const humidity = Math.round(instant.relative_humidity ?? 60);
                    const windSpeed = instant.wind_speed ? instant.wind_speed.toFixed(1) : '1.5';

                    const nextSummary = currentItem?.data?.next_1_hours?.summary?.symbol_code ||
                                        currentItem?.data?.next_6_hours?.summary?.symbol_code ||
                                        currentItem?.data?.next_12_hours?.summary?.symbol_code || '';
                    const isNight = checkIsNight();
                    const currentMapped = mapMetNoSymbol(nextSummary, isNight);

                    // Aggregate timeseries into daily forecasts (min/max temps & midday symbols)
                    const dailyMap = new Map();
                    for (const item of timeseries) {
                        const dateStr = item.time.slice(0, 10);
                        const temp = item.data?.instant?.details?.air_temperature;
                        const sym = item.data?.next_12_hours?.summary?.symbol_code || 
                                    item.data?.next_6_hours?.summary?.symbol_code || 
                                    item.data?.next_1_hours?.summary?.symbol_code;
                        if (temp === undefined) continue;

                        if (!dailyMap.has(dateStr)) {
                            dailyMap.set(dateStr, { min: temp, max: temp, symbols: [] });
                        }
                        const entry = dailyMap.get(dateStr);
                        if (temp < entry.min) entry.min = temp;
                        if (temp > entry.max) entry.max = temp;
                        if (sym) entry.symbols.push(sym);
                    }

                    const allDaily = [];
                    for (const [dateStr, info] of dailyMap.entries()) {
                        const [y, m, dayNum] = dateStr.split('-').map(Number);
                        const dObj = new Date(y, m - 1, dayNum);
                        const dayLabel = dayNames[dObj.getDay()];
                        const bestSym = info.symbols.find(s => s && s.includes('_day')) || info.symbols[0] || 'clearsky_day';
                        const symInfo = mapMetNoSymbol(bestSym, false);
                        allDaily.push({
                            date: dateStr,
                            dayLabel,
                            maxTemp: Math.round(info.max),
                            minTemp: Math.round(info.min),
                            code: symInfo.code,
                            iconType: symInfo.iconType
                        });
                    }

                    // Compute Tomorrow vs Today temperature comparison string
                    let tempNotice = '내일 기온은 오늘과 비슷합니다';
                    if (allDaily.length >= 2) {
                        const todayAvg = (allDaily[0].maxTemp + allDaily[0].minTemp) / 2;
                        const tomorrowAvg = (allDaily[1].maxTemp + allDaily[1].minTemp) / 2;
                        const diff = Math.round(tomorrowAvg - todayAvg);
                        if (diff <= -2) {
                            tempNotice = '내일 기온은 오늘보다 낮습니다';
                        } else if (diff >= 2) {
                            tempNotice = '내일 기온은 오늘보다 높습니다';
                        }
                    }

                    // Next 4 days forecast
                    const next4Days = allDaily.slice(1, 5);

                    const weatherObj = {
                        location: koreanLocation,
                        temp: currentTemp,
                        feelsLike: currentTemp - (parseFloat(windSpeed) > 3 ? 1 : 0),
                        windSpeed: windSpeed,
                        humidity: humidity,
                        code: currentMapped.code,
                        isNight: isNight,
                        dailyForecast: next4Days,
                        tempNotice: tempNotice,
                        provider: 'met-no'
                    };

                    setWeather(weatherObj);
                    setLastUpdated(timeString);
                    saveWeatherToCache(weatherObj, timeString);
                    setLoading(false);
                    return;
                }
            }
        } catch (err) {
            console.warn('[WeatherWidget] Primary API (MET Norway) failed, trying Open-Meteo...', err);
        }

        // --- SECONDARY PROVIDER: Open-Meteo (Fast 3s timeout) ---
        try {
            const weatherRes = await fetchWithTimeout(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&hourly=relativehumidity_2m,apparent_temperature&timezone=auto`,
                {},
                3000
            );
            if (weatherRes.ok) {
                const data = await weatherRes.json();
                const current = data.current_weather || {};
                const hourly = data.hourly || {};
                const daily = data.daily || {};
                const currentHourIndex = now.getHours();

                const humidity = hourly.relativehumidity_2m ? hourly.relativehumidity_2m[currentHourIndex] || 60 : 60;
                const apparentTemp = hourly.apparent_temperature ? hourly.apparent_temperature[currentHourIndex] : current.temperature;
                const isNight = checkIsNight(current.is_day);

                // Parse 4-Day Forecast
                const dailyForecast = [];
                if (daily.time && daily.time.length > 0) {
                    for (let i = 0; i < Math.min(daily.time.length, 5); i++) {
                        const [year, month, day] = daily.time[i].split('-').map(Number);
                        const d = new Date(year, month - 1, day);
                        const dayLabel = dayNames[d.getDay()];
                        const maxTemp = Math.round(daily.temperature_2m_max[i]);
                        const minTemp = Math.round(daily.temperature_2m_min[i]);
                        const code = daily.weathercode[i];
                        const iconInfo = getWeatherInfo(code, false);
                        dailyForecast.push({
                            dayLabel,
                            maxTemp,
                            minTemp,
                            code,
                            iconType: iconInfo.iconType
                        });
                    }
                }

                // Compute Tomorrow vs Today temperature comparison string
                let tempNotice = '내일 기온은 오늘과 비슷합니다';
                if (dailyForecast.length >= 2) {
                    const todayAvg = (dailyForecast[0].maxTemp + dailyForecast[0].minTemp) / 2;
                    const tomorrowAvg = (dailyForecast[1].maxTemp + dailyForecast[1].minTemp) / 2;
                    const diff = Math.round(tomorrowAvg - todayAvg);
                    if (diff <= -2) {
                        tempNotice = '내일 기온은 오늘보다 낮습니다';
                    } else if (diff >= 2) {
                        tempNotice = '내일 기온은 오늘보다 높습니다';
                    }
                }

                const weatherObj = {
                    location: koreanLocation,
                    temp: Math.round(current.temperature),
                    feelsLike: Math.round(apparentTemp),
                    windSpeed: current.windspeed ? (current.windspeed / 3.6).toFixed(1) : '1.5',
                    humidity: humidity,
                    code: current.weathercode || 0,
                    isNight: isNight,
                    dailyForecast: dailyForecast.slice(1, 5), // Next 4 days
                    tempNotice: tempNotice,
                    provider: 'open-meteo'
                };

                setWeather(weatherObj);
                setLastUpdated(timeString);
                saveWeatherToCache(weatherObj, timeString);
                setLoading(false);
                return;
            }
        } catch (err) {
            console.warn('[WeatherWidget] Open-Meteo failed, attempting wttr.in...', err);
        }

        // --- TERTIARY FALLBACK PROVIDER: wttr.in (With actual parsed weather forecast) ---
        try {
            const wttrRes = await fetchWithTimeout(`https://wttr.in/${lat},${lon}?format=j1`, {}, 4000);
            if (wttrRes.ok) {
                const wttrData = await wttrRes.json();
                const curr = wttrData.current_condition && wttrData.current_condition[0];
                if (curr) {
                    const desc = curr.weatherDesc && curr.weatherDesc[0] ? curr.weatherDesc[0].value : '';
                    const parsedCode = parseWttrConditionCode(desc);
                    const isNight = checkIsNight();

                    // Parse real weather forecast from wttrData.weather
                    const wttrForecast = [];
                    if (wttrData.weather && wttrData.weather.length > 0) {
                        for (let i = 1; i < wttrData.weather.length; i++) {
                            const item = wttrData.weather[i];
                            const [y, m, d] = item.date.split('-').map(Number);
                            const dayLabel = dayNames[new Date(y, m - 1, d).getDay()];
                            const midDesc = item.hourly?.[4]?.weatherDesc?.[0]?.value || item.hourly?.[0]?.weatherDesc?.[0]?.value || '';
                            const code = parseWttrConditionCode(midDesc);
                            wttrForecast.push({
                                dayLabel,
                                maxTemp: Math.round(parseFloat(item.maxtempC)),
                                minTemp: Math.round(parseFloat(item.mintempC)),
                                code,
                                iconType: getWeatherInfo(code, false).iconType
                            });
                        }
                    }

                    // Fill up to 4 days if wttr returns only 2 future days
                    while (wttrForecast.length < 4) {
                        const last = wttrForecast[wttrForecast.length - 1];
                        const nextDate = new Date(now);
                        nextDate.setDate(now.getDate() + wttrForecast.length + 1);
                        const dayLabel = dayNames[nextDate.getDay()];
                        wttrForecast.push({
                            dayLabel,
                            maxTemp: last ? last.maxTemp : Math.round(parseFloat(curr.temp_C)),
                            minTemp: last ? last.minTemp : Math.round(parseFloat(curr.temp_C) - 6),
                            code: last ? last.code : parsedCode,
                            iconType: last ? last.iconType : getWeatherInfo(parsedCode, false).iconType
                        });
                    }

                    let tempNotice = '내일 기온은 오늘과 비슷합니다';
                    if (wttrData.weather && wttrData.weather.length >= 2) {
                        const todayAvg = (parseFloat(wttrData.weather[0].maxtempC) + parseFloat(wttrData.weather[0].mintempC)) / 2;
                        const tomorrowAvg = (parseFloat(wttrData.weather[1].maxtempC) + parseFloat(wttrData.weather[1].mintempC)) / 2;
                        const diff = Math.round(tomorrowAvg - todayAvg);
                        if (diff <= -2) {
                            tempNotice = '내일 기온은 오늘보다 낮습니다';
                        } else if (diff >= 2) {
                            tempNotice = '내일 기온은 오늘보다 높습니다';
                        }
                    }

                    const weatherObj = {
                        location: koreanLocation,
                        temp: Math.round(parseFloat(curr.temp_C)),
                        feelsLike: Math.round(parseFloat(curr.FeelsLikeC || curr.temp_C)),
                        windSpeed: (parseFloat(curr.windspeedKmph || 5) / 3.6).toFixed(1),
                        humidity: parseInt(curr.humidity || 60, 10),
                        code: parsedCode,
                        isNight: isNight,
                        dailyForecast: wttrForecast,
                        tempNotice: tempNotice,
                        provider: 'wttr'
                    };

                    setWeather(weatherObj);
                    setLastUpdated(timeString);
                    saveWeatherToCache(weatherObj, timeString);
                    setLoading(false);
                    return;
                }
            }
        } catch (err) {
            console.warn('[WeatherWidget] Secondary API (wttr.in) failed, checking Offline Cache...', err);
        }

        // --- QUATERNARY FALLBACK: LocalStorage Cache ---
        const loadedCache = loadWeatherFromCache();
        if (!loadedCache) {
            setError(true);
        }
        setLoading(false);
    }, []);

    const getLocationAndFetch = useCallback(() => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    fetchWeatherData(pos.coords.latitude, pos.coords.longitude);
                },
                (err) => {
                    console.warn('Geolocation position access denied/failed, falling back to Seoul IP location', err);
                    fetchWeatherData(37.5665, 126.9780);
                },
                { timeout: 8000, maximumAge: 600000 }
            );
        } else {
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

    const seasonalFallbackForecast = getSeasonalFallbackForecast();

    const forecastList = (weather && weather.dailyForecast && weather.dailyForecast.length > 0)
        ? weather.dailyForecast
        : seasonalFallbackForecast;

    return (
        <div
            onMouseDown={handleTouchStart}
            onMouseUp={handleTouchEnd}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onClick={handleCardClick}
            title="클릭하여 15초간 전체 화면 날씨 감상 (좌우 스와이프로 예보 전환)"
            className={`relative overflow-hidden rounded-2xl p-4 border transition-colors duration-200 shadow-sm backdrop-blur-md w-full select-none cursor-pointer min-h-[175px] flex flex-col justify-between ${weatherInfo.bgClass}`}
        >
            {/* Ambient Background Gradient Tint (Dynamic by Weather) */}
            <div className={`absolute -inset-2 bg-gradient-to-br ${weatherInfo.bgTint} pointer-events-none blur-xl opacity-90 transition-colors duration-200`}></div>

            {/* Realtime Ambient Weather Atmosphere (RealSnow, Rain, Thunder, Mist, Stars, Sun) */}
            <WeatherAtmosphere iconType={weatherInfo.iconType} isNight={isNightNow} />

            <div className="relative z-10 space-y-2 flex-1 flex flex-col justify-between">
                {/* Header Row: Location & Live Status */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <svg className={`w-3.5 h-3.5 ${isNightNow ? 'text-blue-400' : 'text-blue-600 dark:text-blue-400'} shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className={`text-xs font-extrabold truncate tracking-tight ${isNightNow ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                            {weather ? weather.location : '위치 확인 중...'}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            getLocationAndFetch();
                        }}
                        title="10분 주기 실시간 갱신"
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full hover:scale-105 active:scale-95 transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs ${
                            isNightNow
                                ? 'bg-white/15 border border-white/20 text-slate-100'
                                : 'bg-white/80 dark:bg-slate-700/70 border border-white dark:border-slate-600/80 text-slate-700 dark:text-slate-200'
                        }`}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="whitespace-nowrap">{lastUpdated ? `${lastUpdated} 갱신` : '실시간'}</span>
                    </button>
                </div>

                {/* Main Content Carousel View (GPU Hardware Accelerated translate3d) */}
                {loading && !weather ? (
                    <div className={`flex items-center justify-center py-8 text-xs font-semibold animate-pulse ${isNightNow ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                        날씨 정보 업데이트 중...
                    </div>
                ) : error && !weather ? (
                    <div className="flex items-center justify-between py-4">
                        <span className={`text-xs ${isNightNow ? 'text-slate-300' : 'text-slate-500'}`}>날씨 불러오기 실패</span>
                        <button onClick={getLocationAndFetch} className="text-xs text-blue-400 font-bold underline">재시도</button>
                    </div>
                ) : (
                    <div className="overflow-hidden w-full relative">
                        <div
                            className="flex transition-transform duration-300 ease-out"
                            style={{
                                transform: `translate3d(-${activeSlide * 100}%, 0, 0)`,
                                willChange: 'transform'
                            }}
                        >
                            {/* SLIDE 0: Live Current Weather & Micro Metrics */}
                            <div className="w-full shrink-0 space-y-2.5 px-0.5">
                                <div className="grid grid-cols-2 gap-2 items-center px-1">
                                    {/* Column 1 (Left): Temperature & Feels Like */}
                                    <div className="flex flex-col items-start justify-center">
                                        <div className="flex items-baseline gap-1">
                                            <span className={`text-3xl font-black tracking-tighter leading-none ${isNightNow ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                                                {weather.temp}°
                                            </span>
                                            <span className={`text-xs font-extrabold ${isNightNow ? 'text-slate-200' : 'text-slate-700 dark:text-slate-200'}`}>C</span>
                                        </div>
                                        <span className={`text-[11px] font-semibold mt-1.5 whitespace-nowrap ${isNightNow ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                                            체감 {weather.feelsLike}°C
                                        </span>
                                    </div>

                                    {/* Column 2 (Right): Samsung One UI Vector Weather Icon */}
                                    <div className="flex flex-col items-center justify-center text-center">
                                        <div className="mb-0.5 select-none flex items-center justify-center">
                                            <WeatherIcon type={weatherInfo.iconType} className="w-12 h-12" />
                                        </div>
                                        <span className={`text-xs font-bold whitespace-nowrap ${isNightNow ? 'text-slate-100' : 'text-slate-800 dark:text-slate-200'}`}>
                                            {weatherInfo.label}
                                        </span>
                                    </div>
                                </div>

                                {/* Footer Details Pill: Humidity & Wind Speed Centered Grid */}
                                <div className={`grid grid-cols-2 text-[10.5px] font-semibold pt-2 border-t rounded-xl px-2 py-1.5 shadow-2xs items-center ${
                                    isNightNow
                                        ? 'bg-white/10 text-slate-100 border-white/15 divide-x divide-white/20'
                                        : 'bg-white/50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200 border-slate-200/60 dark:border-slate-700/60 divide-x divide-slate-200/80 dark:divide-slate-700/80'
                                }`}>
                                    <div className="flex items-center justify-center gap-1 pr-1">
                                        <svg className={`w-3.5 h-3.5 shrink-0 ${isNightNow ? 'text-cyan-300' : 'text-cyan-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                                        </svg>
                                        <span>습도 {weather.humidity}%</span>
                                    </div>
                                    <div className="flex items-center justify-center gap-1 pl-1">
                                        <svg className={`w-3.5 h-3.5 shrink-0 ${isNightNow ? 'text-blue-300' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                        <span>풍속 {weather.windSpeed}m/s</span>
                                    </div>
                                </div>
                            </div>

                            {/* SLIDE 1: Samsung One UI 4-Day Forecast Card */}
                            <div className="w-full shrink-0 grid grid-cols-12 gap-2 items-center py-1 px-0.5">
                                {/* Left Side: Moon/Sun Icon, Big Temp, Temp Comparison Text */}
                                <div className="col-span-5 flex flex-col justify-between h-full pr-1">
                                    <div>
                                        <div className="mb-0.5 select-none flex items-start justify-start">
                                            <WeatherIcon type={weatherInfo.iconType} className="w-10 h-10" />
                                        </div>
                                        <div className="flex items-baseline gap-1 mt-0.5">
                                            <span className={`text-2xl font-black tracking-tighter leading-none ${isNightNow ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                                                {weather.temp}°
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-1">
                                        <p className={`text-[10px] font-bold leading-tight ${isNightNow ? 'text-blue-100/90' : 'text-slate-600 dark:text-slate-300'}`}>
                                            {weather.tempNotice || '내일 기온은 오늘보다 낮습니다'}
                                        </p>
                                    </div>
                                </div>

                                {/* Right Side: 4-Day Forecast Rows */}
                                <div className={`col-span-7 flex flex-col justify-between divide-y text-[11px] font-semibold ${
                                    isNightNow ? 'divide-white/10 text-slate-100' : 'divide-slate-200 dark:divide-slate-700/80 text-slate-800 dark:text-slate-200'
                                }`}>
                                    {forecastList.slice(0, 4).map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between py-1 px-1">
                                            <span className="w-4 text-left font-bold">{item.dayLabel}</span>
                                            <div className="w-5 h-5 flex items-center justify-center select-none">
                                                <WeatherIcon type={item.iconType || getWeatherInfo(item.code, false).iconType} className="w-5 h-5" />
                                            </div>
                                            <span className="text-[11px] font-bold tracking-tight text-right">
                                                {item.maxTemp}° <span className="opacity-60">{item.minTemp}°</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer Dots & Manual Slide Selector */}
                <div className="flex items-center justify-center gap-1.5 pt-0.5 z-20">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setActiveSlide(0);
                        }}
                        className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                            activeSlide === 0 
                                ? (isNightNow ? 'w-5 bg-white' : 'w-5 bg-blue-600 dark:bg-blue-400') 
                                : (isNightNow ? 'w-1.5 bg-white/30 hover:bg-white/60' : 'w-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400')
                        }`}
                        aria-label="현재 날씨"
                        title="현재 날씨 보기"
                    />
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setActiveSlide(1);
                        }}
                        className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                            activeSlide === 1 
                                ? (isNightNow ? 'w-5 bg-white' : 'w-5 bg-blue-600 dark:bg-blue-400') 
                                : (isNightNow ? 'w-1.5 bg-white/30 hover:bg-white/60' : 'w-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400')
                        }`}
                        aria-label="주간 예보"
                        title="4일 예보 보기"
                    />
                </div>
            </div>
        </div>
    );
}
