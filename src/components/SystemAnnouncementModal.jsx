import React from 'react';

export default function SystemAnnouncementModal({ isOpen, announcement, onClose }) {
  if (!isOpen || !announcement) return null;

  const getTypeStyles = (type) => {
    switch (type) {
      case 'alert':
        return {
          bg: 'bg-red-500/10 text-red-500 border-red-500/30',
          badge: 'bg-red-500 text-white',
          label: '긴급 공지'
        };
      case 'warning':
        return {
          bg: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
          badge: 'bg-amber-500 text-white',
          label: '주요 안내'
        };
      default:
        return {
          bg: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
          badge: 'bg-blue-600 text-white',
          label: '시스템 공지'
        };
    }
  };

  const styles = getTypeStyles(announcement.type);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-slate-800 p-6 flex flex-col gap-5 text-gray-800 dark:text-slate-100">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-gray-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${styles.bg}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${styles.badge} uppercase tracking-wider`}>
                {styles.label}
              </span>
              <h2 className="text-lg font-bold mt-1 text-gray-900 dark:text-white leading-tight">
                {announcement.title || '시스템 공지사항'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Announcement Content */}
        <div className="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-700/60 max-h-60 overflow-y-auto">
          <p className="text-sm leading-relaxed text-gray-700 dark:text-slate-200 whitespace-pre-wrap">
            {announcement.content}
          </p>
        </div>

        {/* Confirm Button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer"
        >
          확인
        </button>
      </div>
    </div>
  );
}
