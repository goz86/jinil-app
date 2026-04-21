import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function AuthWidget({ user, onLogin, onLogout, email, setEmail, password, setPassword, onEmailLogin, loginLoading, loginError, onSwitchAccount }) {
    const { t } = useLanguage();
    const isExtension = !!(window.chrome && chrome.identity);
    const [savedAccounts, setSavedAccounts] = React.useState([]);

    React.useEffect(() => {
        try {
            const accs = JSON.parse(localStorage.getItem('jinil_saved_accounts') || '[]');
            setSavedAccounts(accs);
        } catch (e) { setSavedAccounts([]); }
    }, [user, loginLoading]);

    const handleRemoveAccount = (e, emailToRemove) => {
        e.stopPropagation();
        const accs = savedAccounts.filter(a => a.email !== emailToRemove);
        localStorage.setItem('jinil_saved_accounts', JSON.stringify(accs));
        setSavedAccounts(accs);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-4 flex flex-col gap-3">
            {user ? (
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between w-full">
                        {/* Active Account */}
                        <div className="flex items-center gap-3 shrink-0">
                            {user.photoURL ? (
                                <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-full shadow-sm border border-blue-100 dark:border-blue-900 object-cover" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-[0_0_10px_rgba(59,130,246,0.3)] ring-2 ring-blue-100 dark:ring-blue-900">
                                    {(user.email || '?')[0].toUpperCase()}
                                </div>
                            )}
                            <div className="flex flex-col max-w-[90px]">
                                <span className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">
                                    {(user.email || 'User').split('@')[0]}
                                </span>
                                <span className="text-[10px] text-green-500 font-medium">사용 중</span>
                            </div>
                        </div>

                        {/* Quick Switch Accounts - Directly visible inline */}
                        {savedAccounts.filter(a => a.email !== user.email).length > 0 && (
                            <div className="flex items-center justify-end flex-wrap gap-1.5 flex-1 pl-2">
                                {savedAccounts.filter(a => a.email !== user.email).map(acc => (
                                    <div 
                                        key={acc.email} 
                                        className="relative group flex items-center gap-1.5 px-2 py-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-600 rounded-lg cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-500 transition-all shadow-sm"
                                        onClick={() => onSwitchAccount(acc.email, atob(acc.p))}
                                        title={`계정 전환: ${acc.email}`}
                                    >
                                        <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                            {acc.email[0].toUpperCase()}
                                        </div>
                                        <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 max-w-[60px] truncate">
                                            {acc.email.split('@')[0]}
                                        </span>
                                        <button 
                                            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-400 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                            onClick={(e) => handleRemoveAccount(e, acc.email)}
                                            title="계정 삭제"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {/* Bottom Actions */}
                    <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex items-center justify-between">
                        <button 
                            onClick={onLogout} 
                            className="text-[11px] font-medium text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            새 계정 추가
                        </button>
                        <button 
                            onClick={onLogout} 
                            className="text-[11px] font-medium text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                            로그아웃
                        </button>
                    </div>
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
