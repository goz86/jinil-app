import React from 'react';

export default function RealtimeLockOverlay({ isLocked, lockReason, message, userEmail, onOpenAdminDashboard }) {
  if (!isLocked) return null;

  const isAdmin = userEmail === 'pc5@gmail.com';

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/90 backdrop-blur-2xl p-4 select-none animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl flex flex-col items-center gap-6 relative overflow-hidden">
        {/* Glowing Ambient Background Effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-600/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Lock Shield Icon */}
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center shadow-lg animate-pulse">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        {/* Lock Title */}
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-full border border-red-500/30 uppercase tracking-widest">
            {lockReason || '실시간 앱 차단됨'}
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight">
            앱 사용이 제한되었습니다
          </h2>
        </div>

        {/* Lock Reason & Admin Message */}
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 w-full text-left space-y-2">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">차단 안내 메세지</p>
          <p className="text-sm font-semibold text-slate-200 leading-relaxed whitespace-pre-wrap">
            {message || '승인되지 않은 앱 사용이 원격으로 차단되었습니다. 관리자에게 문의하세요.'}
          </p>
        </div>

        {/* Logged in User Badge */}
        {userEmail && (
          <div className="text-xs font-semibold text-slate-400">
            접속 계정: <span className="text-slate-200 font-bold">{userEmail}</span>
          </div>
        )}

        {/* Admin Unlock Button */}
        {isAdmin && onOpenAdminDashboard && (
          <button
            onClick={onOpenAdminDashboard}
            className="w-full py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>관리자 대시보드 열기 (잠금 설정 변경)</span>
          </button>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 w-full pt-1">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>상태 새로고침</span>
          </button>

          <a
            href="mailto:pc5@gmail.com?subject=APP%20JINIL%20사용%20승인%20요청"
            className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>관리자 문의</span>
          </a>
        </div>
      </div>
    </div>
  );
}
