import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function AuthWidget({ user, onLogin, onLogout, email, setEmail, password, setPassword, onEmailLogin, loginLoading, loginError }) {
    const { t } = useLanguage();
    const isExtension = !!(window.chrome && chrome.identity);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-4 flex flex-col gap-3">
            {user ? (
                <div className="flex items-center justify-between gap-3 px-1 py-1">
                    <div className="flex items-center gap-3">
                        {user.photoURL ? (
                            <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-full shadow-sm border border-gray-100 dark:border-gray-600 object-cover" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                {(user.email || '?')[0].toUpperCase()}
                            </div>
                        )}
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate max-w-[120px]">
                            {(user.email || 'User').split('@')[0]}
                        </span>
                    </div>
                    <button 
                        onClick={onLogout} 
                        className="text-[10px] font-bold text-red-500 hover:text-white hover:bg-red-500 bg-red-50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-500 px-2 py-1.5 rounded-lg border border-red-100 dark:border-red-900/50 transition-all"
                    >
                        {t('logout')}
                    </button>
                </div>
            ) : isExtension ? (
                <button onClick={onLogin} className="flex items-center justify-center space-x-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-3 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-shadow font-medium text-gray-700 dark:text-gray-200 text-sm w-full">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span>{t('loginGoogle')}</span>
                </button>
            ) : (
                <div className="flex flex-col gap-2">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        onKeyDown={(e) => e.key === 'Enter' && onEmailLogin()}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
                    />
                    <button
                        onClick={onEmailLogin}
                        disabled={loginLoading}
                        className="w-full px-3 py-2 mt-1 text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        {loginLoading ? t('loadingShort') : t('login')}
                    </button>
                    {loginError && <p className="text-xs text-red-500 text-center mt-1">{loginError}</p>}
                </div>
            )}
        </div>
    );
}
