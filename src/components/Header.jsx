import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { hasAppLockPin, APP_LOCK_CHANGED_EVENT } from '../lib/appLock';

export const WALLPAPERS = [
    { id: 'default', name: '기본', previewBg: 'bg-gray-100 dark:bg-gray-800' },
    { id: 'blue', name: '스카이 블루', previewBg: 'bg-gradient-to-br from-sky-200 to-blue-400' },
    { id: 'yellow', name: '웜 옐로우', previewBg: 'bg-gradient-to-br from-amber-100 to-amber-400' },
    { id: 'green', name: '파스텔 그린', previewBg: 'bg-gradient-to-br from-emerald-100 to-green-400' },
    { id: 'purple', name: '라벤더 퍼플', previewBg: 'bg-gradient-to-br from-purple-100 to-indigo-400' },
    { id: 'pink', name: '로즈 핑크', previewBg: 'bg-gradient-to-br from-rose-100 to-pink-400' },
    { id: 'vietnam', name: '베트남 테마', previewBg: 'bg-gradient-to-br from-red-600 via-yellow-300 to-green-500' },
    { id: 'korea', name: '태극 테마', previewBg: 'bg-gradient-to-br from-slate-100 via-blue-200 to-red-400' },
    { id: 'futureCat', name: '푸른 도라에몽', previewBg: 'bg-gradient-to-br from-sky-400 via-blue-600 to-amber-300' }
];

export default function Header({ searchTerm, setSearchTerm, onOpenAnalytics, wallpaper = 'default', setWallpaper = () => {}, onOpenAppLock, user, userRole, onOpenAdminDashboard }) {
    const { t, lang, setLang } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAutoStart, setIsAutoStart] = useState(false);
    const [hasPin, setHasPin] = useState(() => hasAppLockPin());
    const settingsRef = useRef(null);

    // Sync PIN status
    useEffect(() => {
        const syncPin = () => setHasPin(hasAppLockPin());
        window.addEventListener(APP_LOCK_CHANGED_EVENT, syncPin);
        return () => window.removeEventListener(APP_LOCK_CHANGED_EVENT, syncPin);
    }, []);

    // Check Windows auto-start state on load
    useEffect(() => {
        if (window.electronAPI && window.electronAPI.getAutoStart) {
            window.electronAPI.getAutoStart().then(setIsAutoStart);
        }
    }, []);

    // Close settings popover on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (settingsRef.current && !settingsRef.current.contains(event.target)) {
                setIsSettingsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleAutoStartSetting = async () => {
        if (window.electronAPI && window.electronAPI.toggleAutoStart) {
            const newState = await window.electronAPI.toggleAutoStart(!isAutoStart);
            setIsAutoStart(newState);
        }
    };

    return (
        <header className="flex items-center justify-between py-4 mb-6 relative gap-4">
            {/* Left: Logo */}
            <div className="flex items-center space-x-2 shrink-0 whitespace-nowrap z-10 min-w-[140px]">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white transition-all">{t('appTitle')}</h1>
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    {t('pro')}
                </span>
            </div>

            {/* Center: Search Bar */}
            <div className="flex-1 hidden md:flex justify-center z-0">
                <div className="relative w-full max-w-md">
                    <input
                        type="text"
                        placeholder={t('searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white text-sm transition-shadow shadow-sm hover:shadow-md"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            {/* Right: Sleek Floating Glass Dock Capsule */}
            <div className="flex items-center gap-1.5 shrink-0 z-10 justify-end relative" ref={settingsRef}>
                <div className="flex items-center gap-1 p-1 bg-white/75 dark:bg-slate-800/80 backdrop-blur-xl border border-white/80 dark:border-slate-700/80 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">

                    {/* Dark Mode Quick Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="w-8.5 h-8.5 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-indigo-400 hover:bg-amber-50 dark:hover:bg-indigo-950/40 active:scale-95 transition-all duration-200 cursor-pointer group"
                        title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
                    >
                        {theme === 'dark' ? (
                            <svg className="w-4.5 h-4.5 group-hover:rotate-45 transition-transform duration-300 text-amber-400 fill-amber-400/20" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="5" fill="currentColor" />
                                <path strokeLinecap="round" d="M12 1v2m0 18v2m11-11h-2M3 12H1m17.07-7.07l-1.41 1.41M6.34 17.66l-1.41 1.41m14.14 0l-1.41-1.41M6.34 6.34L4.93 4.93" />
                            </svg>
                        ) : (
                            <svg className="w-4.5 h-4.5 group-hover:-rotate-12 transition-transform duration-300 text-slate-700 dark:text-slate-200 fill-slate-700/10" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                            </svg>
                        )}
                    </button>

                    {/* Analytics Toggle Button */}
                    <button
                        onClick={onOpenAnalytics}
                        className="w-8.5 h-8.5 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 active:scale-95 transition-all duration-200 cursor-pointer group"
                        title={lang === 'vi' ? "Thống kê & Báo cáo" : "통계 및 보고서"}
                    >
                        <svg className="w-4.5 h-4.5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </button>

                    {/* Mini Widget Toggle (Only visible in Electron) */}
                    {window.electronAPI && (
                        <button
                            onClick={() => window.electronAPI.toggleMiniWidget()}
                            className="w-8.5 h-8.5 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 active:scale-95 transition-all duration-200 cursor-pointer group"
                            title={lang === 'vi' ? "Mở Cửa sổ Mini" : "미니 창 열기"}
                        >
                            <svg className="w-4.5 h-4.5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                        </button>
                    )}

                    {/* Settings Gear Dropdown Button */}
                    <div className="relative">
                        <button
                            onClick={() => setIsSettingsOpen(prev => !prev)}
                            className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer relative group ${
                                isSettingsOpen 
                                    ? 'bg-blue-600 text-white shadow-xs' 
                                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                            }`}
                            title="시스템 설정"
                        >
                            <svg className={`w-4.5 h-4.5 transition-transform duration-300 ${isSettingsOpen ? 'rotate-90 text-white' : 'group-hover:rotate-45'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>

                            {/* Status Green Dot for Windows Autostart */}
                            {window.electronAPI && (
                                <div 
                                    className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-800 ${isAutoStart ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                    title={isAutoStart ? "Windows 시작 시 자동 실행: 켜짐" : "Windows 시작 시 자동 실행: 꺼짐"}
                                />
                            )}
                        </button>

                        {/* Settings Popover Dropdown Menu */}
                        {isSettingsOpen && (
                            <div className="absolute right-0 top-full mt-2.5 w-80 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl p-3.5 shadow-2xl border border-gray-100 dark:border-slate-700 z-50 animate-in fade-in zoom-in-95 duration-150 text-gray-800 dark:text-gray-100 max-h-[85vh] overflow-y-auto custom-scrollbar">
                            
                            {/* Header */}
                            <div className="flex items-center justify-between px-2 pb-2.5 mb-2 border-b border-gray-100 dark:border-slate-700/80">
                                <span className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                    시스템 설정
                                </span>
                            </div>

                            {/* Section 1: Appearance / 테마 설정 */}
                            <div className="mb-3.5 px-1">
                                <label className="text-[11px] font-bold text-gray-400 dark:text-slate-400 block mb-1.5 uppercase tracking-wide">
                                    테마 설정
                                </label>
                                <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 dark:bg-slate-900/60 rounded-xl border border-gray-200/50 dark:border-slate-700/60">
                                    <button
                                        onClick={() => { if (theme !== 'light') toggleTheme(); }}
                                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                            theme === 'light'
                                                ? 'bg-white text-blue-600 shadow-xs font-bold'
                                                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                                        }`}
                                    >
                                        <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                                        </svg>
                                        <span>라이트 모드</span>
                                    </button>
                                    <button
                                        onClick={() => { if (theme !== 'dark') toggleTheme(); }}
                                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                            theme === 'dark'
                                                ? 'bg-blue-600 text-white shadow-xs font-bold'
                                                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                                        }`}
                                    >
                                        <svg className="w-3.5 h-3.5 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                        </svg>
                                        <span>다크 모드</span>
                                    </button>
                                </div>
                            </div>

                            {/* Section 2: Wallpaper Selection */}
                            <div className="mb-3.5 px-1 pt-2 border-t border-gray-100 dark:border-slate-700/80">
                                <label className="text-[11px] font-bold text-gray-400 dark:text-slate-400 block mb-2 uppercase tracking-wide flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    배경화면 선택
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {WALLPAPERS.map((wp) => {
                                        const isActive = wallpaper === wp.id;
                                        return (
                                            <button
                                                key={wp.id}
                                                onClick={() => setWallpaper(wp.id)}
                                                className={`flex flex-col items-center gap-1 p-1.5 rounded-xl border transition-all cursor-pointer ${
                                                    isActive
                                                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-900/40 shadow-xs'
                                                        : 'border-gray-200/80 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 bg-transparent'
                                                }`}
                                            >
                                                <div className={`w-full aspect-[4/3] rounded-lg ${wp.previewBg} relative shadow-xs overflow-hidden flex items-center justify-center border border-white/20`}>
                                                    {wp.id === 'vietnam' && (
                                                        <span className="text-yellow-300 text-xs font-black drop-shadow">★</span>
                                                    )}
                                                    {wp.id === 'korea' && (
                                                        <div className="w-4 h-4 rounded-full bg-gradient-to-r from-red-500 to-blue-600 flex items-center justify-center text-[7px] text-white font-bold shadow-xs">
                                                            ☯
                                                        </div>
                                                    )}
                                                    {wp.id === 'futureCat' && (
                                                        <span className="text-xs drop-shadow">😸</span>
                                                    )}
                                                    {isActive && (
                                                        <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                                                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-700 dark:text-slate-200 truncate max-w-[72px]">
                                                    {wp.name}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="mt-2.5">
                                    <label className="flex items-center justify-center gap-1.5 p-2 rounded-xl border border-dashed border-blue-400/50 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-[11px] font-bold cursor-pointer hover:bg-blue-100/50 dark:hover:bg-blue-900/40 transition-all">
                                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                        <span>내 컴퓨터에서 이미지 업로드</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files && e.target.files[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onload = (evt) => {
                                                        if (evt.target?.result) setWallpaper(evt.target.result);
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Section 3: 숨김 비밀번호 (Khoá app) */}
                            <div className="mb-3.5 px-1 pt-2 border-t border-gray-100 dark:border-slate-700/80">
                                <div 
                                    onClick={() => { setIsSettingsOpen(false); if (onOpenAppLock) onOpenAppLock(); }}
                                    className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold block text-gray-800 dark:text-slate-100">
                                                숨김 비밀번호
                                            </span>
                                            <span className="text-[10px] text-gray-400 dark:text-slate-400 block">
                                                {hasPin ? 'PIN 4자리 설정됨' : '비활성화됨 (클릭하여 설정)'}
                                            </span>
                                        </div>
                                    </div>
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>

                            {/* Section: Admin Dashboard (for pc5@gmail.com & admins) */}
                            {(user?.email === 'pc5@gmail.com' || userRole === 'admin') && (
                                <div className="mb-3.5 px-1 pt-2 border-t border-gray-100 dark:border-slate-700/80">
                                    <div 
                                        onClick={() => { setIsSettingsOpen(false); if (onOpenAdminDashboard) onOpenAdminDashboard(); }}
                                        className="flex items-center justify-between p-2 rounded-xl bg-red-50/80 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 cursor-pointer transition-colors border border-red-200/80 dark:border-red-800/60"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center shadow-xs">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <span className="text-xs font-extrabold block text-red-600 dark:text-red-400">
                                                    관리자 대시보드
                                                </span>
                                                <span className="text-[10px] text-red-500/80 dark:text-red-300 block font-semibold">
                                                    실시간 차단 & 유료 승인
                                                </span>
                                            </div>
                                        </div>
                                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            )}

                            {/* Section 4: Windows Auto-start */}
                            {window.electronAPI && (
                                <div className="mb-3.5 px-1 pt-2 border-t border-gray-100 dark:border-slate-700/80">
                                    <div 
                                        onClick={toggleAutoStartSetting}
                                        className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold block text-gray-800 dark:text-slate-100">
                                                    Windows 시작 시 자동 실행
                                                </span>
                                                <span className="text-[10px] text-gray-400 dark:text-slate-400 block">
                                                    {isAutoStart ? '자동 실행 활성화됨' : '비활성화됨'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* iOS Style Switch */}
                                        <div className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${isAutoStart ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'}`}>
                                            <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${isAutoStart ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Section 5: 언어 선택 */}
                            <div className="px-1 pt-2 border-t border-gray-100 dark:border-slate-700/80">
                                <label className="text-[11px] font-bold text-gray-400 dark:text-slate-400 block mb-1.5 uppercase tracking-wide">
                                    언어 선택
                                </label>
                                <div className="space-y-1">
                                    {[
                                        { code: 'ko', label: '한국어', flag: '🌐' },
                                        { code: 'vi', label: 'Tiếng Việt', flag: '🌐' },
                                        { code: 'en', label: 'English', flag: '🌐' }
                                    ].map((item) => (
                                        <button
                                            key={item.code}
                                            onClick={() => setLang(item.code)}
                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                lang === item.code
                                                    ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-700/60 shadow-xs font-bold'
                                                    : 'hover:bg-gray-100 dark:hover:bg-slate-700/60 text-gray-700 dark:text-slate-300 border border-transparent'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">{item.flag}</span>
                                                <span>{item.label}</span>
                                            </div>
                                            {lang === item.code && (
                                                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
    </header>
);
}
