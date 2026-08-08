import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { getAppLockConfig, enableAppLock, disableAppLock, verifyAppLockPin } from '../lib/appLock';
import { notify } from '../lib/notify';
import Swal from 'sweetalert2';

export default function AppLockModal({ isOpen, onClose }) {
  const { t } = useLanguage();
  const [isEnabled, setIsEnabled] = useState(false);
  const [mode, setMode] = useState('view'); // 'view' | 'create' | 'change' | 'remove'
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const config = getAppLockConfig();
      setIsEnabled(Boolean(config?.enabled));
      setMode('view');
      setPin('');
      setConfirmPin('');
      setCurrentPin('');
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreatePin = async (e) => {
    e.preventDefault();
    if (pin.length < 4) {
      setErrorMsg('PIN 번호는 4자리 숫자여야 합니다.');
      return;
    }
    if (pin !== confirmPin) {
      setErrorMsg('확인 PIN 번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      await enableAppLock(pin);
      setIsEnabled(true);
      setMode('view');
      setPin('');
      setConfirmPin('');
      setErrorMsg('');
      notify.alert({ icon: 'success', title: '비밀번호가 설정되었습니다.' });
    } catch {
      setErrorMsg('비밀번호 설정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisablePin = async (e) => {
    e.preventDefault();
    if (!currentPin) {
      setErrorMsg('현재 PIN 번호를 입력하세요.');
      return;
    }

    setLoading(true);
    try {
      const ok = await disableAppLock(currentPin);
      if (ok) {
        setIsEnabled(false);
        setMode('view');
        setCurrentPin('');
        setErrorMsg('');
        notify.alert({ icon: 'success', title: '비밀번호가 해제되었습니다.' });
      } else {
        setErrorMsg('현재 PIN 번호가 올바르지 않습니다.');
      }
    } catch {
      setErrorMsg('오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePin = async (e) => {
    e.preventDefault();
    if (!currentPin) {
      setErrorMsg('현재 PIN 번호를 입력하세요.');
      return;
    }
    const isValidCurrent = await verifyAppLockPin(currentPin);
    if (!isValidCurrent) {
      setErrorMsg('현재 PIN 번호가 올바르지 않습니다.');
      return;
    }
    if (pin.length < 4) {
      setErrorMsg('새 PIN 번호는 4자리 숫자여야 합니다.');
      return;
    }
    if (pin !== confirmPin) {
      setErrorMsg('새 PIN 확인 번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      await enableAppLock(pin);
      setIsEnabled(true);
      setMode('view');
      setPin('');
      setConfirmPin('');
      setCurrentPin('');
      setErrorMsg('');
      notify.alert({ icon: 'success', title: 'PIN 번호가 변경되었습니다.' });
    } catch {
      setErrorMsg('PIN 변경 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-slate-700/80 p-6 flex flex-col gap-5 text-gray-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">숨김 비밀번호</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">작업 목록 숨김 해제 시 4자리 PIN 설정</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Status Card */}
        <div className={`p-4 rounded-2xl border flex items-center gap-3.5 ${
          isEnabled 
            ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-200'
            : 'bg-gray-50 dark:bg-slate-800/60 border-gray-200 dark:border-slate-700/60 text-gray-700 dark:text-slate-300'
        }`}>
          <div className={`p-3 rounded-2xl flex items-center justify-center shrink-0 ${
            isEnabled ? 'bg-blue-500 text-white shadow-xs' : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
          }`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold">
              {isEnabled ? '이 기기에서 활성화됨' : '이 기기에서 비활성화됨'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              PIN 번호는 이 기기에만 안전하게 저장되며 서버로 전송되지 않습니다.
            </p>
          </div>
        </div>

        {/* Dynamic Modes */}
        {mode === 'view' && (
          <div className="flex flex-col gap-3 pt-1">
            {!isEnabled ? (
              <button
                onClick={() => { setMode('create'); setErrorMsg(''); }}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>비밀번호 설정</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setMode('change'); setErrorMsg(''); }}
                  className="py-3 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 font-bold rounded-xl transition-all cursor-pointer"
                >
                  PIN 번호 변경
                </button>
                <button
                  onClick={() => { setMode('remove'); setErrorMsg(''); }}
                  className="py-3 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800/50 font-bold rounded-xl transition-all cursor-pointer"
                >
                  비밀번호 해제
                </button>
              </div>
            )}
          </div>
        )}

        {mode === 'create' && (
          <form onSubmit={handleCreatePin} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                PIN 번호 입력 (4자리)
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="4자리 숫자 입력"
                autoFocus
                required
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-center text-lg font-bold tracking-widest text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                PIN 번호 확인
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                required
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-center text-lg font-bold tracking-widest text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>

            {errorMsg && (
              <p className="text-xs font-semibold text-red-500 text-center animate-shake">{errorMsg}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setMode('view'); setErrorMsg(''); }}
                className="flex-1 py-3 text-gray-500 dark:text-slate-300 font-bold border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={pin.length < 4 || confirmPin.length < 4 || loading}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>비밀번호 저장</span>
              </button>
            </div>
          </form>
        )}

        {mode === 'remove' && (
          <form onSubmit={handleDisablePin} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                현재 PIN 번호 입력
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                autoFocus
                required
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-center text-lg font-bold tracking-widest text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>

            {errorMsg && (
              <p className="text-xs font-semibold text-red-500 text-center animate-shake">{errorMsg}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setMode('view'); setErrorMsg(''); }}
                className="flex-1 py-3 text-gray-500 dark:text-slate-300 font-bold border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={currentPin.length < 4 || loading}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                비밀번호 해제
              </button>
            </div>
          </form>
        )}

        {mode === 'change' && (
          <form onSubmit={handleChangePin} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                현재 PIN 번호
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                autoFocus
                required
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-center text-lg font-bold tracking-widest text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                새 PIN 번호 입력
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="4자리 숫자"
                required
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-center text-lg font-bold tracking-widest text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                새 PIN 번호 확인
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                required
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-center text-lg font-bold tracking-widest text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>

            {errorMsg && (
              <p className="text-xs font-semibold text-red-500 text-center animate-shake">{errorMsg}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setMode('view'); setErrorMsg(''); }}
                className="flex-1 py-3 text-gray-500 dark:text-slate-300 font-bold border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={currentPin.length < 4 || pin.length < 4 || confirmPin.length < 4 || loading}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                PIN 변경 완료
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
