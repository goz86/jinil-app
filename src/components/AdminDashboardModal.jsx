import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, collection, onSnapshot, updateDoc } from 'firebase/firestore';
import Swal from 'sweetalert2';

export default function AdminDashboardModal({ isOpen, onClose, currentUser }) {
  const [activeTab, setActiveTab] = useState('security'); // 'security' | 'users' | 'announcements'
  const [loading, setLoading] = useState(false);

  // Security Controls State
  const [globalLock, setGlobalLock] = useState(false);
  const [globalLockMessage, setGlobalLockMessage] = useState('정식 승인되지 않은 앱 사용이 원격 차단되었습니다. pc5@gmail.com 관리자에게 문의하세요.');
  const [requirePaidAccess, setRequirePaidAccess] = useState(false);

  // User Management State
  const [usersList, setUsersList] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('all'); // 'all' | 'paid' | 'unpaid' | 'blocked'

  // Announcement State
  const [annActive, setAnnActive] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annType, setAnnType] = useState('info'); // 'info' | 'warning' | 'alert'

  // Load Security & Announcement Config from Firestore
  useEffect(() => {
    if (!isOpen) return;

    // Listen for System Config
    const unsubConfig = onSnapshot(doc(db, "system_config", "app_control"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGlobalLock(Boolean(data.globalLock));
        if (data.globalLockMessage) setGlobalLockMessage(data.globalLockMessage);
        setRequirePaidAccess(Boolean(data.requirePaidAccess));

        if (data.announcement) {
          setAnnActive(Boolean(data.announcement.active));
          setAnnTitle(data.announcement.title || '');
          setAnnContent(data.announcement.content || '');
          setAnnType(data.announcement.type || 'info');
        }
      }
    });

    // Listen for All Users
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const list = snapshot.docs.map(d => ({ uid: d.id, ...d.data() }));
      setUsersList(list);
    });

    return () => {
      unsubConfig();
      unsubUsers();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Save Security Settings to Firestore
  const handleSaveSecurity = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, "system_config", "app_control"), {
        globalLock,
        globalLockMessage,
        requirePaidAccess,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.email || 'pc5@gmail.com'
      }, { merge: true });

      Swal.fire({
        icon: 'success',
        title: '보안 설정이 저장되었습니다.',
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    } catch (e) {
      console.error("Save security error:", e);
      Swal.fire({ icon: 'error', title: '저장 실패', text: e.message });
    } finally {
      setLoading(false);
    }
  };

  // Save Announcement Settings to Firestore
  const handleSaveAnnouncement = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, "system_config", "app_control"), {
        announcement: {
          active: annActive,
          title: annTitle,
          content: annContent,
          type: annType,
          updatedAt: new Date().toISOString()
        }
      }, { merge: true });

      Swal.fire({
        icon: 'success',
        title: '공지사항이 발송/저장되었습니다.',
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    } catch (e) {
      console.error("Save announcement error:", e);
      Swal.fire({ icon: 'error', title: '발송 실패', text: e.message });
    } finally {
      setLoading(false);
    }
  };

  // Toggle User Paid Status
  const handleToggleUserPaid = async (targetUser) => {
    try {
      const nextState = !targetUser.isPaid;
      await updateDoc(doc(db, "users", targetUser.uid), {
        isPaid: nextState
      });
      Swal.fire({
        icon: 'success',
        title: nextState ? '유료 회원으로 승인되었습니다.' : '무료 회원으로 변경되었습니다.',
        timer: 1200,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    } catch (e) {
      Swal.fire({ icon: 'error', title: '변경 실패', text: e.message });
    }
  };

  // Toggle User Blocked Status
  const handleToggleUserBlock = async (targetUser) => {
    try {
      const nextStatus = targetUser.status === 'blocked' ? 'active' : 'blocked';
      await updateDoc(doc(db, "users", targetUser.uid), {
        status: nextStatus
      });
      Swal.fire({
        icon: nextStatus === 'blocked' ? 'warning' : 'success',
        title: nextStatus === 'blocked' ? '해당 계정이 차단되었습니다.' : '차단이 해제되었습니다.',
        timer: 1200,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    } catch (e) {
      Swal.fire({ icon: 'error', title: '변경 실패', text: e.message });
    }
  };

  // Filter Users List
  const filteredUsers = usersList.filter(u => {
    const term = userSearchTerm.toLowerCase().trim();
    const matchSearch = (u.email && u.email.toLowerCase().includes(term)) || (u.uid && u.uid.toLowerCase().includes(term));
    if (!matchSearch) return false;

    if (userFilter === 'paid') return Boolean(u.isPaid);
    if (userFilter === 'unpaid') return !u.isPaid;
    if (userFilter === 'blocked') return u.status === 'blocked';
    return true;
  });

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-200/80 dark:border-slate-800 flex flex-col text-slate-800 dark:text-slate-100">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex justify-between items-center bg-slate-50/70 dark:bg-slate-900/50">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-2xl border border-red-500/20 flex items-center justify-center shadow-xs">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  관리자 제어 대시보드
                </h2>
                <span className="px-2.5 py-0.5 bg-red-600 text-white text-[10px] font-black rounded-full uppercase tracking-wider shadow-xs">
                  ROOT ADMIN (pc5@gmail.com)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                원격 실시간 앱 차단, 유료 사용자 접근 승인 및 팝업 공지 관리
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation - Pure Minimalist Segmented Pill Control */}
        <div className="px-6 pt-4 pb-2 bg-slate-50/30 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-800/70 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/50">
            <button
              onClick={() => setActiveTab('security')}
              className={`py-2.5 px-4 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'security'
                  ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>실시간 차단 & 보안</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`py-2.5 px-4 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'users'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>회원 승인 & 권한 ({usersList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('announcements')}
              className={`py-2.5 px-4 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'announcements'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 58h2m-1-5v5m0-40A10 10 0 002 18v8l-2 4v2h24v-2l-2-4v-8a10 10 0 00-10-10z" />
              </svg>
              <span>팝업 공지 관리</span>
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: Security Controls */}
          {activeTab === 'security' && (
            <div className="space-y-6">

              {/* Global Lock Card */}
              <div className={`p-5 rounded-2xl border flex items-start justify-between gap-4 transition-all ${
                globalLock
                  ? 'bg-red-500/10 border-red-500/30 text-red-900 dark:text-red-200'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60'
              }`}>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-md uppercase border ${
                      globalLock
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400'
                    }`}>
                      {globalLock ? '전체 차단 활성화됨' : '정상 작동 중'}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      글로벌 실시간 원격 앱 차단 (Global Remote App Lock)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    스위치를 ON으로 변경하면 설치된 PC `.exe` 및 웹을 포함한 모든 앱 클라이언트에 즉시 전체 화면 차단 팝업이 전송되어 앱 사용을 원격 금지합니다.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={globalLock}
                    onChange={(e) => setGlobalLock(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6.5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5.5 after:w-5.5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              {/* Lock Message Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  앱 차단 시 사용자에게 표시할 메시지
                </label>
                <textarea
                  rows={3}
                  value={globalLockMessage}
                  onChange={(e) => setGlobalLockMessage(e.target.value)}
                  placeholder="차단 사유 및 문의처 입력..."
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-red-500 transition-all"
                />
              </div>

              {/* Require Paid Access Switch */}
              <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/40 flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    유료 승인 회원 전용 사용 모드 (Require Paid Access)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    활성화 시 Admin이 [유료 회원 승인] 처리한 사용자만 앱을 사용할 수 있으며, 미승인/무료 사용자는 자동으로 화면이 제한됩니다.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={requirePaidAccess}
                    onChange={(e) => setRequirePaidAccess(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6.5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5.5 after:w-5.5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveSecurity}
                  disabled={loading}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{loading ? '저장 중...' : '보안 설정 저장하기'}</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: User Management */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              
              {/* Search & Filter Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
                <div className="relative flex-1 min-w-[220px]">
                  <input
                    type="text"
                    placeholder="이메일 또는 UID 검색..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <svg className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <button
                    onClick={() => setUserFilter('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${userFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'}`}
                  >
                    전체 ({usersList.length})
                  </button>
                  <button
                    onClick={() => setUserFilter('paid')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${userFilter === 'paid' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'}`}
                  >
                    유료 승인 ({usersList.filter(u => u.isPaid).length})
                  </button>
                  <button
                    onClick={() => setUserFilter('unpaid')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${userFilter === 'unpaid' ? 'bg-amber-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'}`}
                  >
                    미승인 ({usersList.filter(u => !u.isPaid).length})
                  </button>
                  <button
                    onClick={() => setUserFilter('blocked')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${userFilter === 'blocked' ? 'bg-red-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'}`}
                  >
                    차단됨 ({usersList.filter(u => u.status === 'blocked').length})
                  </button>
                </div>
              </div>

              {/* Users Table */}
              <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-3">이메일 계정</th>
                        <th className="px-4 py-3">권한</th>
                        <th className="px-4 py-3">유료 승인</th>
                        <th className="px-4 py-3">계정 상태</th>
                        <th className="px-4 py-3 text-right">원격 제어</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-semibold">
                            등록된 회원이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => (
                          <tr key={u.uid} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-white">
                              {u.email}
                              {u.email === 'pc5@gmail.com' && (
                                <span className="ml-1.5 px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-black rounded uppercase">
                                  ROOT
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] border ${
                                u.role === 'admin' 
                                  ? 'bg-purple-500/15 text-purple-600 border-purple-500/30 dark:bg-purple-950/60 dark:text-purple-300' 
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                              }`}>
                                {u.role === 'admin' ? '관리자' : '일반 유저'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] border ${
                                u.isPaid 
                                  ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:bg-emerald-950/60 dark:text-emerald-300' 
                                  : 'bg-amber-500/15 text-amber-600 border-amber-500/30 dark:bg-amber-950/60 dark:text-amber-300'
                              }`}>
                                {u.isPaid ? '✓ 유료 승인됨' : '미승인 (무료)'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] border ${
                                u.status === 'blocked' 
                                  ? 'bg-red-500/15 text-red-600 border-red-500/30 dark:bg-red-950/60 dark:text-red-300' 
                                  : 'bg-blue-500/15 text-blue-600 border-blue-500/30 dark:bg-blue-950/60 dark:text-blue-300'
                              }`}>
                                {u.status === 'blocked' ? '차단됨' : '정상 사용'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleToggleUserPaid(u)}
                                  className={`px-3 py-1 rounded-lg font-bold text-[10px] transition-all cursor-pointer ${
                                    u.isPaid 
                                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' 
                                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                  }`}
                                >
                                  {u.isPaid ? '승인 취소' : '유료 승인'}
                                </button>
                                <button
                                  onClick={() => handleToggleUserBlock(u)}
                                  className={`px-3 py-1 rounded-lg font-bold text-[10px] transition-all cursor-pointer ${
                                    u.status === 'blocked' 
                                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs' 
                                      : 'bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                  }`}
                                >
                                  {u.status === 'blocked' ? '차단 해제' : '계정 차단'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: System Announcements */}
          {activeTab === 'announcements' && (
            <div className="space-y-5">
              
              <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-amber-900 dark:text-amber-200">
                    실시간 팝업 공지사항 켜기 / 끄기
                  </h3>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    활성화 시 앱에 접속 중인 모든 사용자에게 공지사항 팝업이 즉시 노출됩니다.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={annActive}
                    onChange={(e) => setAnnActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6.5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5.5 after:w-5.5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    공지 유형
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'info', name: '일반 공지', color: 'bg-blue-600 text-white' },
                      { id: 'warning', name: '주요 안내', color: 'bg-amber-600 text-white' },
                      { id: 'alert', name: '긴급 공지', color: 'bg-red-600 text-white' }
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setAnnType(t.id)}
                        className={`py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                          annType === t.id
                            ? `${t.color} border-transparent shadow-xs`
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    공지 제목
                  </label>
                  <input
                    type="text"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="예: 시스템 점검 안내 (02:00 ~ 04:00)"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    공지 내용
                  </label>
                  <textarea
                    rows={4}
                    value={annContent}
                    onChange={(e) => setAnnContent(e.target.value)}
                    placeholder="사용자들에게 전달할 세부 내용을 입력하세요..."
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveAnnouncement}
                  disabled={loading}
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 58h2m-1-5v5m0-40A10 10 0 002 18v8l-2 4v2h24v-2l-2-4v-8a10 10 0 00-10-10z" />
                  </svg>
                  <span>{loading ? '저장 중...' : '공지사항 저장 및 즉시 발송'}</span>
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
