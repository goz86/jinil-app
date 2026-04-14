import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

export default function Header({ searchTerm, setSearchTerm, onOpenAnalytics }) {
    const { t, lang, toggleLanguage } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const isExtension = !!(window.chrome && chrome.identity);

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

            {/* Right: Toggles */}
            <div className="flex items-center gap-3 shrink-0 z-10 min-w-[140px] justify-end">

                {/* Dark Mode Toggle */}
                <button
                    onClick={toggleTheme}
                    className="flex items-center justify-center bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 w-9 h-9 rounded-xl transition-colors shrink-0"
                    title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                >
                    {theme === 'dark' ? (
                        <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                        </svg>
                    )}
                </button>


                {/* Analytics Toggle Button */}
                <button
                    onClick={onOpenAnalytics}
                    className="flex items-center justify-center bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900 border border-gray-200 dark:border-gray-600 w-9 h-9 rounded-xl transition-colors shrink-0 text-blue-500"
                    title={lang === 'vi' ? "Thống kê & Báo cáo" : "통계 및 보고서"}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                </button>

                {/* Mini Widget Toggle (Only visible in Electron) */}
                {window.electronAPI && (
                    <button
                        onClick={() => window.electronAPI.toggleMiniWidget()}
                        className="flex items-center justify-center bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 w-9 h-9 rounded-xl transition-colors shrink-0 text-blue-500"
                        title={lang === 'vi' ? "Mở Cửa sổ Mini" : "미니 창 열기"}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                    </button>
                )}

                {/* Auto-Start Windows Toggle (Only visible in Electron) */}
                {window.electronAPI && (
                    <div className="relative group">
                        <button
                            onClick={async () => {
                                const currentState = await window.electronAPI.getAutoStart();
                                const newState = await window.electronAPI.toggleAutoStart(!currentState);
                                // Local force refresh of the UI would be better, but for now we rely on the next render or a small state
                                window.location.reload(); // Quickest way to refresh the icon state if we don't have a local state wrapper here
                            }}
                            className="flex items-center justify-center bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 w-9 h-9 rounded-xl transition-colors shrink-0"
                            title={lang === 'vi' ? "Cài đặt khởi động cùng Windows" : "Windows 시작 시 자동 실행 설정"}
                        >
                            <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                        <AutostartStatus lang={lang} />
                    </div>
                )}
            </div>
        </header>
    );
}

// Inner component to handle initial state fetch without bloating Header
function AutostartStatus({ lang }) {
    const [isOn, setIsOn] = React.useState(false);

    React.useEffect(() => {
        if (window.electronAPI && window.electronAPI.getAutoStart) {
            window.electronAPI.getAutoStart().then(setIsOn);
        }
    }, []);

    return (
        <div
            className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-800 shadow-sm ${isOn ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            title={isOn
                ? (lang === 'vi' ? 'Đang BẬT khởi động cùng máy' : '자동 시작 켜짐')
                : (lang === 'vi' ? 'Đang TẮT khởi động cùng máy' : '자동 시작 꺼짐')
            }
        />
    );
}
