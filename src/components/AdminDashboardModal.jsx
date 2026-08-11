import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, onSnapshot, updateDoc } from 'firebase/firestore';
import Swal from 'sweetalert2';

export default function AdminDashboardModal({ isOpen, onClose, currentUser }) {
  const [activeTab, setActiveTab] = useState('security'); // 'security' | 'users' | 'announcements' | 'alarms'
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
  const [annId, setAnnId] = useState('');

  // Daily Alarms State
  const DEFAULT_ALARMS = [
    { id: 'alarm_12', time: '12:00', title: '점심 식사 시간입니다! 🍱', active: true },
    { id: 'alarm_17', time: '17:00', title: '택배 발송 시간입니다! 📦', active: true }
  ];
  const [alarmsList, setAlarmsList] = useState(DEFAULT_ALARMS);
  const [newAlarmTime, setNewAlarmTime] = useState('12:00');
  const [newAlarmTitle, setNewAlarmTitle] = useState('');

  // Load Configs from Firestore & Local Storage
  useEffect(() => {
    if (!isOpen) return;

    // Listen for System Control & Announcement Config
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
          setAnnId(data.announcement.id || '');
        }
      }
    });

    // Listen for Daily Scheduled Alarms
    const unsubAlarms = onSnapshot(doc(db, "system_config", "daily_alarms"), (docSnap) => {
      if (docSnap.exists() && Array.isArray(docSnap.data().alarms)) {
        setAlarmsList(docSnap.data().alarms);
      } else {
        try {
          const saved = localStorage.getItem('jinil_daily_alarms');
          if (saved) setAlarmsList(JSON.parse(saved));
        } catch (e) {
          setAlarmsList(DEFAULT_ALARMS);
        }
      }
    });

    // Load & Combine Saved Local Accounts + Firestore Users
    const loadMergedUsers = (firestoreDocs = []) => {
      const map = new Map();

      // 1. Root admin
      map.set('pc5@gmail.com', {
        uid: 'root_pc5',
        email: 'pc5@gmail.com',
        alias: 'Root Admin',
        role: 'admin',
        isPaid: true,
        status: 'active'
      });

      // 2. Local saved accounts
      try {
        const localAccs = JSON.parse(localStorage.getItem('jinil_saved_accounts') || '[]');
        localAccs.forEach(acc => {
          if (acc.email || acc.alias) {
            const key = (acc.email || acc.alias).toLowerCase();
            map.set(key, {
              uid: acc.uid || key,
              email: acc.email || acc.alias,
              alias: acc.alias || '',
              role: acc.email === 'pc5@gmail.com' ? 'admin' : 'user',
              isPaid: acc.email === 'pc5@gmail.com' ? true : Boolean(acc.isPaid),
              status: acc.status || 'active'
            });
          }
        });
      } catch (e) {
        console.warn("Error reading local accounts:", e);
      }

      // 3. Remote Firestore users
      firestoreDocs.forEach(d => {
        const data = d.data ? d.data() : d;
        const validEmail = data.email && typeof data.email === 'string' && data.email.includes('@') ? data.email.trim().toLowerCase() : null;
        const validAlias = data.alias && typeof data.alias === 'string' && data.alias.trim() && !data.alias.includes(' ') && data.alias.length < 30 ? data.alias.trim() : null;

        // Only include if there is a valid email or valid human alias (ignore raw 28-char Firestore UIDs)
        if (validEmail || validAlias) {
          const key = validEmail || validAlias.toLowerCase();
          const existing = map.get(key) || {};
          map.set(key, {
            uid: d.id || existing.uid,
            email: validEmail || existing.email || validAlias,
            alias: validAlias || existing.alias || '',
            role: key === 'pc5@gmail.com' ? 'admin' : (data.role || existing.role || 'user'),
            isPaid: data.isPaid !== undefined ? Boolean(data.isPaid) : (key === 'pc5@gmail.com' ? true : Boolean(existing.isPaid)),
            status: data.status || existing.status || 'active'
          });
        }
      });

      setUsersList(Array.from(map.values()));
    };

    loadMergedUsers();

    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      loadMergedUsers(snapshot.docs);
    }, (err) => {
      console.warn("Firestore users read error:", err);
      loadMergedUsers();
    });

    return () => {
      unsubConfig();
      unsubAlarms();
      unsubUsers();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const showPermissionRulesModal = () => {
    const rulesSnippet = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;

    Swal.fire({
      icon: 'warning',
      title: 'Firebase Console 권한 설정 필요',
      html: `
        <div style="text-align: left; font-size: 12.5px; line-height: 1.5; color: #334155;">
          <p style="margin-bottom: 8px;">Firebase Security Rules에 컬렉션 쓰기 권한이 허용되어 있지 않습니다.</p>
          <p style="margin-bottom: 8px; font-weight: 800; color: #d97706;">현재 PC 로컬 설정에는 즉시 적용되었습니다.</p>
          <p style="margin-bottom: 6px;">원격 전체 기기 연동을 위해 <a href="https://console.firebase.google.com/project/gozkr-6d7ac/firestore/rules" target="_blank" rel="noreferrer" style="color: #2563eb; text-decoration: underline; font-weight: bold;">Firebase Console Rules</a>에 아래 규칙을 붙여넣고 <strong>[게시(Publish)]</strong>하세요:</p>
          <pre style="background: #0f172a; color: #f8fafc; padding: 12px; border-radius: 10px; font-size: 11px; overflow-x: auto; margin-top: 6px;">${rulesSnippet}</pre>
        </div>
      `,
      confirmButtonText: '보안 규칙 복사하기',
      showCancelButton: true,
      cancelButtonText: '닫기'
    }).then((result) => {
      if (result.isConfirmed) {
        navigator.clipboard.writeText(rulesSnippet);
        Swal.fire({
          icon: 'success',
          title: '보안 규칙이 클립보드에 복사되었습니다!',
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
      }
    });
  };

  // Save Security Settings
  const handleSaveSecurity = async () => {
    setLoading(true);
    const securityData = {
      globalLock,
      globalLockMessage,
      requirePaidAccess,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.email || 'pc5@gmail.com'
    };

    try {
      const localConfig = JSON.parse(localStorage.getItem('jinil_app_control') || '{}');
      localStorage.setItem('jinil_app_control', JSON.stringify({ ...localConfig, ...securityData }));
      window.dispatchEvent(new Event('jinil_config_updated'));
    } catch (e) {}

    try {
      await setDoc(doc(db, "system_config", "app_control"), securityData, { merge: true });
      Swal.fire({
        icon: 'success',
        title: '보안 설정이 저장되었습니다.',
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    } catch (e) {
      if (e.code === 'permission-denied' || e.message?.includes('permission') || e.message?.includes('Missing')) {
        showPermissionRulesModal();
      } else {
        Swal.fire({ icon: 'error', title: '저장 실패', text: e.message });
      }
    } finally {
      setLoading(false);
    }
  };

  // Save Announcement Settings with Unique ID & 24h TTL Timestamp
  const handleSaveAnnouncement = async () => {
    setLoading(true);

    // Generate fresh announcement ID & 24h creation timestamp
    const nowIso = new Date().toISOString();
    const newAnnId = 'ann_' + Date.now();

    const annData = {
      id: newAnnId,
      active: annActive,
      title: annTitle,
      content: annContent,
      type: annType,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    try {
      const localConfig = JSON.parse(localStorage.getItem('jinil_app_control') || '{}');
      localConfig.announcement = annData;
      localStorage.setItem('jinil_app_control', JSON.stringify(localConfig));
      window.dispatchEvent(new Event('jinil_config_updated'));
    } catch (e) {}

    try {
      await setDoc(doc(db, "system_config", "app_control"), {
        announcement: annData
      }, { merge: true });

      setAnnId(newAnnId);

      Swal.fire({
        icon: 'success',
        title: '공지사항이 발송되었습니다.',
        text: '유효기간: 24시간 | 1회 수신 후 자동 숨김 처리됩니다.',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    } catch (e) {
      if (e.code === 'permission-denied' || e.message?.includes('permission') || e.message?.includes('Missing')) {
        showPermissionRulesModal();
      } else {
        Swal.fire({ icon: 'error', title: '발송 실패', text: e.message });
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Daily Alarms Management
  const handleAddAlarm = () => {
    if (!newAlarmTitle.trim()) {
      Swal.fire({ icon: 'warning', title: '알림 내용을 입력하세요.', toast: true, position: 'top-end', timer: 1500, showConfirmButton: false });
      return;
    }
    const newAlarm = {
      id: 'alarm_' + Date.now(),
      time: newAlarmTime,
      title: newAlarmTitle.trim(),
      active: true
    };
    const updated = [...alarmsList, newAlarm];
    setAlarmsList(updated);
    setNewAlarmTitle('');
    saveAlarmsToStore(updated);
  };

  const handleDeleteAlarm = (id) => {
    const updated = alarmsList.filter(a => a.id !== id);
    setAlarmsList(updated);
    saveAlarmsToStore(updated);
  };

  const handleToggleAlarm = (id) => {
    const updated = alarmsList.map(a => a.id === id ? { ...a, active: !a.active } : a);
    setAlarmsList(updated);
    saveAlarmsToStore(updated);
  };

  const saveAlarmsToStore = async (list) => {
    try {
      localStorage.setItem('jinil_daily_alarms', JSON.stringify(list));
      window.dispatchEvent(new Event('jinil_alarms_updated'));
    } catch (e) {}

    try {
      await setDoc(doc(db, "system_config", "daily_alarms"), {
        alarms: list,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.email || 'pc5@gmail.com'
      }, { merge: true });
    } catch (e) {
      if (e.code === 'permission-denied' || e.message?.includes('permission') || e.message?.includes('Missing')) {
        showPermissionRulesModal();
      }
    }
  };

  // Toggle User Paid Status
  const handleToggleUserPaid = async (targetUser) => {
    try {
      const nextState = !targetUser.isPaid;
      await updateDoc(doc(db, "users", targetUser.uid), { isPaid: nextState });
      Swal.fire({
        icon: 'success',
        title: nextState ? '유료 회원으로 승인되었습니다.' : '무료 회원으로 변경되었습니다.',
        timer: 1200,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    } catch (e) {
      if (e.code === 'permission-denied' || e.message?.includes('permission') || e.message?.includes('Missing')) {
        showPermissionRulesModal();
      } else {
        Swal.fire({ icon: 'error', title: '변경 실패', text: e.message });
      }
    }
  };

  // Toggle User Blocked Status
  const handleToggleUserBlock = async (targetUser) => {
    try {
      const nextStatus = targetUser.status === 'blocked' ? 'active' : 'blocked';
      await updateDoc(doc(db, "users", targetUser.uid), { status: nextStatus });
      Swal.fire({
        icon: nextStatus === 'blocked' ? 'warning' : 'success',
        title: nextStatus === 'blocked' ? '해당 계정이 차단되었습니다.' : '차단이 해제되었습니다.',
        timer: 1200,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    } catch (e) {
      if (e.code === 'permission-denied' || e.message?.includes('permission') || e.message?.includes('Missing')) {
        showPermissionRulesModal();
      } else {
        Swal.fire({ icon: 'error', title: '변경 실패', text: e.message });
      }
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
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
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
                원격 실시간 차단, 회원 승인, 팝업 공지 및 정기 일일 알림 설정
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

        {/* Tab Navigation - 4 Clean Segmented Controls */}
        <div className="px-6 pt-4 pb-2 bg-slate-50/30 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-4 gap-2 bg-slate-100 dark:bg-slate-800/70 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 text-xs">
            <button
              onClick={() => setActiveTab('security')}
              className={`py-2.5 px-3 font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'security'
                  ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>차단 & 보안</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`py-2.5 px-3 font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'users'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>회원 관리 ({usersList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('announcements')}
              className={`py-2.5 px-3 font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'announcements'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 58h2m-1-5v5m0-40A10 10 0 002 18v8l-2 4v2h24v-2l-2-4v-8a10 10 0 00-10-10z" />
              </svg>
              <span>팝업 공지</span>
            </button>

            <button
              onClick={() => setActiveTab('alarms')}
              className={`py-2.5 px-3 font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'alarms'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>정기 알림 ({alarmsList.length})</span>
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
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>{u.email || u.alias || u.name || '사용자 계정'}</span>
                                {u.email === 'pc5@gmail.com' && (
                                  <span className="px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-black rounded uppercase shrink-0">
                                    ROOT ADMIN
                                  </span>
                                )}
                              </div>
                              {u.alias && u.email && u.alias !== u.email && (
                                <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                  별칭: {u.alias}
                                </div>
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

          {/* TAB 3: System Announcements (Single-Show & 24h TTL) */}
          {activeTab === 'announcements' && (
            <div className="space-y-5">
              
              <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-amber-900 dark:text-amber-200">
                      실시간 팝업 공지사항 켜기 / 끄기
                    </h3>
                    <span className="px-2 py-0.5 bg-amber-600 text-white text-[9px] font-black rounded-md">
                      1회 수신 & 24시간 후 자동 발만
                    </span>
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    사용자가 팝업을 확인하면 1회만 표시되며, 발송 24시간 후 자동으로 완전히 소멸됩니다.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
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
                  <span>{loading ? '발송 중...' : '새 팝업 공지 발송 (24시간 유효)'}</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 4: Daily Scheduled Alarms Management */}
          {activeTab === 'alarms' && (
            <div className="space-y-6">

              <div className="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/30">
                <h3 className="text-sm font-extrabold text-emerald-900 dark:text-emerald-200">
                  정기 일일 알림 시간 및 내용 설정
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                  원하는 시간에 자동으로 시스템 및 데스크톱 Notification 알림이 발송되도록 설정합니다.
                </p>
              </div>

              {/* Add New Alarm Form */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  새 정기 알림 추가
                </h4>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="time"
                    value={newAlarmTime}
                    onChange={(e) => setNewAlarmTime(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-extrabold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="알림 문구 입력 (예: 점심 식사 시간입니다! 🍱)"
                    value={newAlarmTitle}
                    onChange={(e) => setNewAlarmTitle(e.target.value)}
                    className="flex-1 min-w-[200px] px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={handleAddAlarm}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>추가</span>
                  </button>
                </div>
              </div>

              {/* Alarms List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  등록된 정기 알림 목록 ({alarmsList.length})
                </h4>

                {alarmsList.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-semibold text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    등록된 정기 알림이 없습니다.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {alarmsList.map((alarm) => (
                      <div
                        key={alarm.id}
                        className="p-3.5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3 hover:border-emerald-500/40 transition-all shadow-2xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300 font-black text-sm rounded-xl border border-emerald-500/30">
                            ⏰ {alarm.time}
                          </span>
                          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                            {alarm.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(alarm.active)}
                              onChange={() => handleToggleAlarm(alarm.id)}
                              className="sr-only peer"
                            />
                            <div className="w-10 h-5.5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-emerald-600"></div>
                          </label>

                          <button
                            onClick={() => handleDeleteAlarm(alarm.id)}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-500 rounded-xl transition-colors cursor-pointer"
                            title="삭제"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
