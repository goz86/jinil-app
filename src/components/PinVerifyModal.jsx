import React, { useState, useEffect } from 'react';
import { verifyAppLockPin } from '../lib/appLock';

export default function PinVerifyModal({ isOpen, onClose, onSuccess }) {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMsg('');
      setBusy(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (pin.length < 4 || busy) return;

    setBusy(true);
    setErrorMsg('');

    try {
      const ok = await verifyAppLockPin(pin);
      setBusy(false);
      if (ok) {
        setPin('');
        setErrorMsg('');
        onSuccess();
      } else {
              setErrorMsg('비밀번호가 올바르지 않습니다');
        setPin('');
      }
    } catch {
      setBusy(false);
      setErrorMsg('오류가 발생했습니다.');
    }
  };

  const handleKeyPadClick = (digit) => {
    if (pin.length < 4) {
      const next = pin + digit;
      setPin(next);
      if (next.length === 4) {
        // Auto verify when 4 digits are entered
        setTimeout(() => {
          verifyAppLockPin(next).then((ok) => {
            if (ok) {
              setPin('');
              setErrorMsg('');
              onSuccess();
            } else {
                    setErrorMsg('비밀번호가 올바르지 않습니다');
              setPin('');
            }
          });
        }, 100);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 dark:border-slate-700/80 p-7 flex flex-col items-center text-center text-gray-800 dark:text-slate-100">
        
        {/* Close Button */}
        <div className="w-full flex justify-end">
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-full text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Lock Icon */}
        <div className="w-16 h-16 rounded-3xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 ring-8 ring-blue-50 dark:ring-blue-950/30">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h2 className="text-xl font-black tracking-tight mb-1">숨김 해제 비밀번호</h2>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-6">
          작업 목록을 확인하려면 4자리 PIN을 입력하세요.
        </p>

        {/* 4 Digit Display Dots */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-blue-600 dark:bg-blue-400 scale-125 ring-4 ring-blue-100 dark:ring-blue-900/50'
                    : 'bg-gray-200 dark:bg-slate-700'
                }`}
              />
            );
          })}
        </div>

        {errorMsg && (
          <div className="mb-4 text-xs font-bold text-red-500 bg-red-50 dark:bg-red-950/40 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-800/40 animate-bounce">
            {errorMsg}
          </div>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[240px] mb-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPadClick(num)}
              className="w-full h-14 rounded-2xl bg-gray-50 hover:bg-gray-100 dark:bg-slate-800/80 dark:hover:bg-slate-700 border border-gray-100 dark:border-slate-700/60 text-xl font-bold text-gray-800 dark:text-slate-100 transition-all active:scale-95 cursor-pointer flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPin('')}
            className="w-full h-14 rounded-2xl bg-gray-50 hover:bg-gray-100 dark:bg-slate-800/80 dark:hover:bg-slate-700 border border-gray-100 dark:border-slate-700/60 text-xs font-bold text-gray-500 dark:text-slate-400 transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          >
            초기화
          </button>
          <button
            type="button"
            onClick={() => handleKeyPadClick('0')}
            className="w-full h-14 rounded-2xl bg-gray-50 hover:bg-gray-100 dark:bg-slate-800/80 dark:hover:bg-slate-700 border border-gray-100 dark:border-slate-700/60 text-xl font-bold text-gray-800 dark:text-slate-100 transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="w-full h-14 rounded-2xl bg-gray-50 hover:bg-gray-100 dark:bg-slate-800/80 dark:hover:bg-slate-700 border border-gray-100 dark:border-slate-700/60 text-gray-600 dark:text-slate-300 transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414a2 2 0 011.414-.586H19a2 2 0 012 2v12a2 2 0 01-2 2H10.828a2 2 0 01-1.414-.586L3 12z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
