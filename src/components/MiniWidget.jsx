import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { auth, db, secondaryAuth, secondaryDb, firebaseConfig } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, getAuth } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, getFirestore } from 'firebase/firestore';
import { useLanguage } from '../contexts/LanguageContext';
import Swal from 'sweetalert2';

// 🎨 Taste-Skill Design System Tokens: Harmonized High-Contrast Themes
const PRESET_THEMES = [
    {
        id: 'toss-dark',
        name: '토스 다크 (Toss Dark Navy)',
        category: 'Toss Style',
        bgClass: 'bg-slate-950 text-white',
        headerClass: 'bg-slate-900 border-b border-slate-800 text-white',
        headerBtn: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700',
        cardClass: 'bg-slate-900/90 border-slate-800 hover:border-blue-500/50 text-white',
        inputBg: 'bg-slate-900 border-slate-800 text-white placeholder-slate-500',
        checkboxBg: 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/30',
        accentColor: '#3b82f6',
        accentBg: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20',
        badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        privacyBtn: 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white',
        footerBg: 'bg-slate-950 border-t border-slate-900 text-slate-400',
        isLight: false,
    },
    {
        id: 'kakao-yellow',
        name: '카카오 옐로우 (Kakao Classic)',
        category: 'Kakao Style',
        bgClass: 'bg-[#FAF9F5] text-[#191919]',
        headerClass: 'bg-[#FEE500] border-b border-yellow-400/80 text-[#191919] font-extrabold',
        headerBtn: 'bg-[#191919]/10 hover:bg-[#191919]/20 text-[#191919] border border-[#191919]/20',
        cardClass: 'bg-white border-yellow-300/80 hover:border-yellow-500 shadow-sm text-[#191919]',
        inputBg: 'bg-white border-yellow-300/80 text-[#191919] placeholder-gray-400',
        checkboxBg: 'bg-[#191919] border-[#191919] text-[#FEE500]',
        accentColor: '#191919',
        accentBg: 'bg-[#191919] hover:bg-[#2e2e2e] text-[#FEE500] font-bold shadow-md',
        badgeBg: 'bg-[#FEE500] text-[#191919] font-bold border border-yellow-400',
        privacyBtn: 'bg-white border-yellow-300 text-[#191919] hover:bg-yellow-50',
        footerBg: 'bg-[#FAF9F5] border-t border-yellow-200/80 text-gray-500',
        isLight: true,
    },
    {
        id: 'kakao-dark',
        name: '카카오 다크 (Kakao Charcoal)',
        category: 'Kakao Style',
        bgClass: 'bg-[#181818] text-gray-100',
        headerClass: 'bg-[#222222] border-b border-white/10 text-white',
        headerBtn: 'bg-white/10 hover:bg-white/20 text-gray-200 border border-white/15',
        cardClass: 'bg-[#262626] border-white/10 hover:border-[#FEE500]/60 text-gray-100',
        inputBg: 'bg-[#262626] border-white/15 text-white placeholder-gray-500',
        checkboxBg: 'bg-[#FEE500] border-[#FEE500] text-[#181818]',
        accentColor: '#FEE500',
        accentBg: 'bg-[#FEE500] hover:bg-[#ebd200] text-[#181818] font-bold shadow-yellow-500/10',
        badgeBg: 'bg-[#FEE500]/20 text-[#FEE500] border-[#FEE500]/40',
        privacyBtn: 'bg-[#262626] border-white/15 text-gray-300 hover:text-white',
        footerBg: 'bg-[#181818] border-t border-white/10 text-gray-400',
        isLight: false,
    },
    {
        id: 'toss-light',
        name: '토스 화이트 (Toss Light Blue)',
        category: 'Toss Style',
        bgClass: 'bg-[#F8FAFC] text-slate-900',
        headerClass: 'bg-white border-b border-slate-200 text-slate-900',
        headerBtn: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200',
        cardClass: 'bg-white border-slate-200 hover:border-blue-500 shadow-sm text-slate-900',
        inputBg: 'bg-white border-slate-300 text-slate-900 placeholder-slate-400',
        checkboxBg: 'bg-blue-600 border-blue-600 text-white',
        accentColor: '#2563eb',
        accentBg: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
        privacyBtn: 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
        footerBg: 'bg-[#F8FAFC] border-t border-slate-200 text-slate-500',
        isLight: true,
    },
    {
        id: 'oled-black',
        name: 'OLED 트루 블랙 (Deep Contrast)',
        category: 'Minimal',
        bgClass: 'bg-black text-white',
        headerClass: 'bg-zinc-950 border-b border-zinc-800 text-white',
        headerBtn: 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800',
        cardClass: 'bg-zinc-900 border-zinc-800 hover:border-purple-500/60 text-white',
        inputBg: 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500',
        checkboxBg: 'bg-purple-600 border-purple-600 text-white',
        accentColor: '#a855f7',
        accentBg: 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20',
        badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        privacyBtn: 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white',
        footerBg: 'bg-black border-t border-zinc-900 text-zinc-500',
        isLight: false,
    },
    {
        id: 'cyber-neon',
        name: '네온 사이버 (Neon Magenta)',
        category: 'Vibrant',
        bgClass: 'bg-slate-950 text-white',
        headerClass: 'bg-purple-950/90 border-b border-pink-500/40 text-white',
        headerBtn: 'bg-purple-900/60 hover:bg-purple-800/80 text-pink-200 border border-pink-500/30',
        cardClass: 'bg-indigo-950/60 border-pink-500/30 hover:border-pink-400 text-white',
        inputBg: 'bg-indigo-950/80 border-pink-500/40 text-white placeholder-pink-300/40',
        checkboxBg: 'bg-pink-600 border-pink-600 text-white',
        accentColor: '#ec4899',
        accentBg: 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-pink-500/20',
        badgeBg: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
        privacyBtn: 'bg-indigo-950/80 border-pink-500/40 text-pink-200 hover:text-white',
        footerBg: 'bg-slate-950 border-t border-purple-900/40 text-pink-300/60',
        isLight: false,
    },
    {
        id: 'emerald-mint',
        name: '에메랄드 민트 (Forest Fresh)',
        category: 'Vibrant',
        bgClass: 'bg-slate-950 text-emerald-100',
        headerClass: 'bg-emerald-950/90 border-b border-emerald-500/30 text-emerald-100',
        headerBtn: 'bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-200 border border-emerald-500/30',
        cardClass: 'bg-emerald-950/40 border-emerald-500/30 hover:border-emerald-400 text-emerald-100',
        inputBg: 'bg-emerald-950/60 border-emerald-500/30 text-emerald-100 placeholder-emerald-400/40',
        checkboxBg: 'bg-emerald-500 border-emerald-500 text-slate-950 font-bold',
        accentColor: '#10b981',
        accentBg: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        privacyBtn: 'bg-emerald-950/60 border-emerald-500/30 text-emerald-200 hover:text-white',
        footerBg: 'bg-slate-950 border-t border-emerald-950 text-emerald-400/60',
        isLight: false,
    }
];

// 🖼 Wallpaper Effects & Patterns
const PRESET_WALLPAPERS = [
    { id: 'orbs', name: '은은한 오로라', english: 'Aurora Glow', bgPreview: 'bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500', icon: '🌌' },
    { id: 'mesh', name: '입체 메쉬', english: 'Mesh Wave', bgPreview: 'bg-gradient-to-br from-blue-600 via-teal-500 to-emerald-400', icon: '🌈' },
    { id: 'grid', name: '하이테크 그리드', english: 'Tech Grid', bgPreview: 'bg-slate-900 border border-blue-500/40', icon: '⚡' },
    { id: 'dots', name: '미니멀 도트', english: 'Dot Matrix', bgPreview: 'bg-slate-950 border border-slate-700', icon: '⚪' },
    { id: 'vietnam', name: '베트남 에디션', english: 'Vietnam Star', bgPreview: 'bg-gradient-to-br from-red-600 to-red-800', icon: '★' },
    { id: 'korea', name: '한국 에디션', english: 'Korea Taeguk', bgPreview: 'bg-gradient-to-r from-red-500 via-blue-600 to-slate-900', icon: '☯️' },
    { id: 'cyberpunk', name: '네온 사이버', english: 'Cyberpunk HD', bgPreview: 'bg-gradient-to-tr from-fuchsia-600 via-purple-700 to-cyan-500', icon: '🌆' },
    { id: 'solid', name: '플랫 솔리드', english: 'Clean Solid', bgPreview: 'bg-slate-800', icon: '🎨' },
];

const MiniTaskItem = ({ task, toggleTask, savedAccounts = [], theme, isHighContrast }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        if (task.completed || !task.time || !task.date) {
            setTimeLeft('');
            return;
        }

        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        
        if (task.date !== todayStr) {
            setTimeLeft('');
            return;
        }

        const [hours, minutes] = task.time.split(':').map(Number);
        const target = new Date(now);
        target.setHours(hours, minutes, 0, 0);

        const updateTimer = () => {
            const currentTime = new Date();
            const diff = target - currentTime;
            
            if (diff > 0) {
                const h = Math.floor(diff / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diff % (1000 * 60)) / 1000);
                
                const parts = [];
                if (h > 0) parts.push(`${h}시간`);
                if (m > 0 || h > 0) parts.push(`${m}분`);
                parts.push(`${s}초 남음`);
                
                setTimeLeft(parts.join(' '));
            } else {
                setTimeLeft('시간 지남');
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [task]);

    const isLight = theme?.isLight;

    return (
        <div className={`group p-3 rounded-2xl border transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 hover:scale-[1.01] ${
            task.completed
                ? isLight
                    ? 'bg-slate-200/50 border-slate-300/60 opacity-60'
                    : 'bg-white/[0.03] border-white/5 opacity-60 hover:opacity-90'
                : isLight
                    ? theme?.cardClass || 'bg-white border-slate-200 hover:border-blue-400 shadow-sm'
                    : theme?.cardClass || 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10'
        } ${isHighContrast ? 'border-2 font-bold shadow-md' : ''}`}>
            <div className="flex flex-col gap-1.5">
                <div className="flex items-start gap-3">
                    <button
                        onClick={() => toggleTask(task.id)}
                        className={`mt-0.5 w-5 h-5 rounded-lg border-2 flex-shrink-0 transition-all flex items-center justify-center group-active:scale-90 ${
                            task.completed
                                ? theme?.checkboxBg || 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                : isLight
                                    ? 'border-slate-400 hover:border-slate-600 bg-white'
                                    : 'border-white/30 hover:border-white/60 bg-transparent'
                        }`}
                    >
                        {task.completed ? (
                            <svg className="w-3.5 h-3.5 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <div className="w-2 h-2 rounded-sm opacity-0 group-hover:opacity-40 transition-opacity bg-current"></div>
                        )}
                    </button>
                    <span
                        className={`text-[13px] leading-snug cursor-default flex-1 transition-all ${
                            isHighContrast ? 'font-black tracking-tight' : 'font-semibold'
                        } ${
                            task.completed
                                ? isLight ? 'line-through text-slate-400 select-none' : 'line-through text-gray-400/70 select-none'
                                : isLight ? 'text-slate-900 group-hover:opacity-80' : 'text-gray-100 group-hover:text-white'
                        }`}
                        title={task.title}
                    >
                        {task.title}
                    </span>
                    {task.priority === 'urgent' && <span className={`w-2.5 h-2.5 rounded-full bg-red-500 mt-1 shrink-0 shadow-sm shadow-red-500/50 ${task.completed ? 'opacity-40' : ''}`} title="급급급" />}
                    {task.priority === 'high' && <span className={`w-2.5 h-2.5 rounded-full bg-orange-400 mt-1 shrink-0 shadow-sm shadow-orange-400/50 ${task.completed ? 'opacity-40' : ''}`} title="급" />}
                    {task.priority === 'normal' && <span className={`w-2.5 h-2.5 rounded-full bg-yellow-400 mt-1 shrink-0 ${task.completed ? 'opacity-30' : 'opacity-60'}`} title="보통" />}
                </div>
                {task.assigneeName && (
                    <div className="pl-8 -mt-0.5">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            task.completed
                                ? isLight ? 'bg-slate-200 text-slate-500' : 'bg-white/5 text-white/30'
                                : isLight ? 'bg-purple-100 text-purple-800' : 'bg-purple-500/20 text-purple-300'
                        }`}>
                            {(() => {
                                const acc = savedAccounts.find(a => (a.uid && a.uid === task.assignedByUid) || (a.email && a.email === task.assignedByUid) || (a.email && a.email.split('@')[0] === task.assignedByName));
                                return acc?.alias || task.assignedByName || '나';
                            })()}
                            <svg className="w-2.5 h-2.5 mx-0.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                            {(() => {
                                const acc = savedAccounts.find(a => (a.uid && a.uid === task.assigneeUid) || (a.email && a.email === task.assigneeUid) || (a.email && a.email.split('@')[0] === task.assigneeName));
                                return acc?.alias || task.assigneeName;
                            })()}
                        </span>
                    </div>
                )}
                {timeLeft && !task.completed && (
                    <div className="pl-8">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide ${timeLeft === '시간 지남' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500 animate-pulse'}`}>
                            {timeLeft}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default function MiniWidget() {
    const { t } = useLanguage();
    const [tasks, setTasks] = useState([]);
    const [patrolledTasks, setPatrolledTasks] = useState({});
    const [user, setUser] = useState(null);

    // Form inputs state
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState('normal');
    const [time, setTime] = useState('');
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [tempHour, setTempHour] = useState('');
    const [tempMinute, setTempMinute] = useState('');
    const [savedAccounts, setSavedAccounts] = useState([]);
    const [assigneeUid, setAssigneeUid] = useState(null);
    const [showAssignee, setShowAssignee] = useState(false);
    const [isTasksHidden, setIsTasksHidden] = useState(true);
    const assigneeRef = useRef(null);

    // 🎨 Theme & Wallpaper State
    const [themeId, setThemeId] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('jinil_mini_theme') || '{}');
            return saved.themeId || 'toss-dark';
        } catch (e) { return 'toss-dark'; }
    });
    const [wallpaperId, setWallpaperId] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('jinil_mini_theme') || '{}');
            return saved.wallpaperId || 'orbs';
        } catch (e) { return 'orbs'; }
    });
    const [customBgUrl, setCustomBgUrl] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('jinil_mini_theme') || '{}');
            return saved.customBgUrl || '';
        } catch (e) { return ''; }
    });
    const [isHighContrast, setIsHighContrast] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('jinil_mini_theme') || '{}');
            return saved.isHighContrast ?? true;
        } catch (e) { return true; }
    });
    const [showThemeModal, setShowThemeModal] = useState(false);
    const [themeModalTab, setThemeModalTab] = useState('themes'); // 'themes' or 'wallpapers'

    const handleLocalFileUpload = (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                if (evt.target?.result) {
                    setCustomBgUrl(evt.target.result);
                    setWallpaperId('custom');
                }
            };
            reader.readAsDataURL(file);
        }
    };

    // Save Theme preferences to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('jinil_mini_theme', JSON.stringify({
                themeId, wallpaperId, customBgUrl, isHighContrast
            }));
        } catch (e) {}
    }, [themeId, wallpaperId, customBgUrl, isHighContrast]);

    const currentTheme = useMemo(() => {
        return PRESET_THEMES.find(t => t.id === themeId) || PRESET_THEMES[0];
    }, [themeId]);

    // Get today's date in YYYY-MM-DD
    const getLocalDateString = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const today = getLocalDateString();

    useEffect(() => {
        const reloadAccounts = () => {
            try {
                const accs = JSON.parse(localStorage.getItem('jinil_saved_accounts') || '[]');
                setSavedAccounts(accs);
            } catch (e) {
                setSavedAccounts([]);
            }
        };

        reloadAccounts();
        window.addEventListener('jinil_accounts_updated', reloadAccounts);
        window.addEventListener('storage', reloadAccounts);

        const handleClickOutside = (e) => {
            if (assigneeRef.current && !assigneeRef.current.contains(e.target)) {
                setShowAssignee(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            window.removeEventListener('jinil_accounts_updated', reloadAccounts);
            window.removeEventListener('storage', reloadAccounts);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                const unsubStore = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
                    if (docSnap.exists()) {
                        setTasks(docSnap.data().tasks || []);
                    }
                });
                return () => unsubStore();
            } else {
                const saved = localStorage.getItem('todos');
                if (saved) {
                    setTasks(JSON.parse(saved));
                }
            }
        });

        return () => {
            unsubscribe();
        };
    }, []);

    // Effect for Automatic Patrol
    useEffect(() => {
        if (!user || !savedAccounts.length) return;

        const unsubscribers = {};
        const dynamicApps = {};

        savedAccounts.forEach(acc => {
            if (acc.uid && acc.p && acc.uid !== user.uid) {
                const appName = `mini_patrol_${acc.uid}`;
                try {
                    let patrolApp;
                    try {
                        patrolApp = initializeApp(firebaseConfig, appName);
                    } catch (e) {
                        patrolApp = initializeApp(firebaseConfig, `${appName}_${Date.now()}`);
                    }
                    const patrolAuth = getAuth(patrolApp);
                    const patrolDb = getFirestore(patrolApp);

                    signInWithEmailAndPassword(patrolAuth, acc.email, atob(acc.p)).then(() => {
                        const unsub = onSnapshot(doc(patrolDb, "users", acc.uid), (docSnap) => {
                            if (docSnap.exists()) {
                                const accTasks = docSnap.data().tasks || [];
                                const assignedTasks = accTasks.filter(t => t.assignedByUid === user.uid);
                                setPatrolledTasks(prev => ({ ...prev, [acc.uid]: assignedTasks }));
                            }
                        });
                        unsubscribers[appName] = unsub;
                    }).catch(err => console.error(`Mini patrol auth failed for ${acc.email}`, err));
                    
                    dynamicApps[appName] = patrolApp;
                } catch (e) {
                    console.error(`Failed to initialize mini patrol app for ${acc.email}`, e);
                }
            }
        });

        return () => {
            Object.values(unsubscribers).forEach(unsub => unsub && unsub());
        };
    }, [user?.uid, savedAccounts]);

    // BroadcastChannel listener for instant zero-latency sync between Main App & Jinil Mini window
    useEffect(() => {
        let channel;
        try {
            channel = new BroadcastChannel('jinil_task_sync');
            channel.onmessage = (event) => {
                if (event.data && event.data.type === 'TASKS_UPDATED') {
                    if (event.data.uid === user?.uid && Array.isArray(event.data.tasks)) {
                        setTasks(event.data.tasks);
                    }
                }
            };
        } catch (e) {}
        return () => {
            if (channel) channel.close();
        };
    }, [user?.uid]);

    // Sync privacy hidden state across Main App and Jinil Mini window
    useEffect(() => {
        let channel;
        try {
            channel = new BroadcastChannel('jinil_privacy_sync');
            channel.onmessage = (event) => {
                if (event.data && typeof event.data.isHidden === 'boolean') {
                    setIsTasksHidden(event.data.isHidden);
                }
            };
        } catch (e) {}
        return () => {
            if (channel) channel.close();
        };
    }, []);

    const togglePrivacyHidden = (targetState) => {
        const newState = typeof targetState === 'boolean' ? targetState : !isTasksHidden;
        setIsTasksHidden(newState);
        try {
            const channel = new BroadcastChannel('jinil_privacy_sync');
            channel.postMessage({ isHidden: newState });
            channel.close();
        } catch (e) {}
    };

    const saveTasks = async (newTasks) => {
        setTasks(newTasks);
        if (user) {
            const userTodoKey = `todos_${user.uid}`;
            localStorage.setItem(userTodoKey, JSON.stringify(newTasks));
            await setDoc(doc(db, "users", user.uid), { tasks: newTasks }, { merge: true });
        } else {
            localStorage.setItem('todos', JSON.stringify(newTasks));
        }
        try {
            const channel = new BroadcastChannel('jinil_task_sync');
            channel.postMessage({ type: 'TASKS_UPDATED', tasks: newTasks, uid: user?.uid });
            channel.close();
        } catch (e) {}
    };

    const modifyCrossUserTask = async (taskId, modifierFunc) => {
        let targetUid = null;
        let targetEmail = null;

        for (const [uid, pTasks] of Object.entries(patrolledTasks)) {
            const found = pTasks.find(t => t.id === taskId);
            if (found) {
                targetUid = uid;
                targetEmail = found.assigneeEmail || savedAccounts.find(a => a.uid === uid)?.email;
                break;
            }
        }
        if (!targetUid && !targetEmail) return false;
        
        const targetAcc = savedAccounts.find(a => (a.uid && a.uid === targetUid) || (a.email && a.email === targetEmail));
        if (!targetAcc?.p) return true;

        try {
            const userCred = await signInWithEmailAndPassword(secondaryAuth, targetAcc.email, atob(targetAcc.p));
            const realTargetUid = userCred.user.uid;

            const userDocRef = doc(secondaryDb, "users", realTargetUid);
            const userDocSnap = await getDoc(userDocRef);
            
            if (userDocSnap.exists()) {
                const existingTasks = userDocSnap.data().tasks || [];
                const newTasks = modifierFunc(existingTasks);
                await setDoc(userDocRef, { tasks: newTasks });
            }
            await signOut(secondaryAuth);
        } catch (err) {
            console.error("Mini cross-user modification failed:", err);
        }
        return true;
    };

    const toggleTask = async (id) => {
        const isPatrolled = await modifyCrossUserTask(id, (existingTasks) => 
            existingTasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
        );
        if (!isPatrolled) {
            const newTasks = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
            await saveTasks(newTasks);
        }
    };

    const handleAddTask = async (e) => {
        if (e) e.preventDefault();
        if (!title.trim()) return;

        const newTask = {
            id: Date.now().toString(),
            title: title.trim(),
            priority: priority || 'normal',
            time: time || '',
            date: today,
            completed: false,
            reminded: false,
        };

        if (assigneeUid && user) {
            const targetAcc = savedAccounts.find(a => (a.uid && a.uid === assigneeUid) || a.email === assigneeUid);
            const targetName = targetAcc?.alias || targetAcc?.email?.split('@')[0] || '직원';
            const myName = user?.email?.split('@')[0] || '나';

            Swal.fire({
                title: `${targetName}에게 배정 중...`,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                didOpen: () => { Swal.showLoading(); }
            });

            try {
                if (!targetAcc?.p) throw new Error('No credentials for target user');
                
                const userCred = await signInWithEmailAndPassword(secondaryAuth, targetAcc.email, atob(targetAcc.p));
                const realTargetUid = userCred.user.uid;

                if (!targetAcc.uid) {
                    targetAcc.uid = realTargetUid;
                    try {
                        const accs = JSON.parse(localStorage.getItem('jinil_saved_accounts') || '[]');
                        const updatedAccs = accs.map(a => a.email === targetAcc.email ? { ...a, uid: realTargetUid } : a);
                        localStorage.setItem('jinil_saved_accounts', JSON.stringify(updatedAccs));
                        setSavedAccounts(updatedAccs);
                    } catch (e) {}
                }

                const enhancedTask = {
                    ...newTask,
                    assignedByUid: user.uid,
                    assignedByName: myName,
                    assigneeUid: realTargetUid,
                    assigneeName: targetName,
                    assigneeEmail: targetAcc.email
                };

                const userDocRef = doc(secondaryDb, "users", realTargetUid);
                const userDocSnap = await getDoc(userDocRef);
                const existingTasks = userDocSnap.exists() ? (userDocSnap.data().tasks || []) : [];
                await setDoc(userDocRef, { tasks: [enhancedTask, ...existingTasks] });
                await signOut(secondaryAuth);

                // Also save to current user's task list so it persists in owner's doc
                await saveTasks([enhancedTask, ...tasks]);

                Swal.fire({
                    icon: 'success',
                    title: '작업 배정 완료',
                    text: `"${enhancedTask.title}" → ${targetName}`,
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            } catch (error) {
                console.error("Error assigning task:", error);
                Swal.fire({
                    icon: 'error',
                    title: '오류',
                    text: '작업 배정에 실패했습니다.',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            }
        } else {
            const newTasks = [newTask, ...tasks];
            await saveTasks(newTasks);
        }

        setTitle('');
        setPriority('normal');
        setTime('');
        setShowTimePicker(false);
        setAssigneeUid(null);
    };

    const allMergedTasks = useMemo(() => {
        const taskMap = new Map();
        const addOrMergeTask = (t) => {
            if (!t || !t.id) return;
            if (taskMap.has(t.id)) {
                const existing = taskMap.get(t.id);
                taskMap.set(t.id, {
                    ...existing,
                    ...t,
                    completed: existing.completed || t.completed
                });
            } else {
                taskMap.set(t.id, t);
            }
        };

        tasks.forEach(addOrMergeTask);
        Object.values(patrolledTasks).flat().forEach(addOrMergeTask);

        return Array.from(taskMap.values());
    }, [tasks, patrolledTasks]);
    const todayTasks = allMergedTasks.filter(t => t.date === today);

    // Sort tasks: active (uncompleted) tasks first, completed tasks moved to the bottom
    const sortedTasks = [...todayTasks].sort((a, b) => {
        if (a.completed === b.completed) return 0;
        return a.completed ? 1 : -1;
    });

    const activeTasksCount = todayTasks.filter(t => !t.completed).length;
    const completedTasksCount = todayTasks.filter(t => t.completed).length;
    const completionPercentage = todayTasks.length > 0 ? Math.round((completedTasksCount / todayTasks.length) * 100) : 0;

    const handleClose = () => {
        if (window.electronAPI && window.electronAPI.hideMiniWidget) {
            window.electronAPI.hideMiniWidget();
        } else {
            window.close();
        }
    };

    // Drag resize handlers
    const handleMouseDown = (e, direction) => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = window.innerWidth;
        const startHeight = window.innerHeight;

        const handleMouseMove = (moveEvent) => {
            let newWidth = startWidth;
            let newHeight = startHeight;

            if (direction === 'bottom' || direction === 'corner') {
                const deltaY = moveEvent.clientY - startY;
                newHeight = Math.max(250, Math.min(1200, startHeight + deltaY));
            }
            if (direction === 'corner') {
                const deltaX = moveEvent.clientX - startX;
                newWidth = Math.max(200, Math.min(800, startWidth + deltaX));
            }

            if (window.resizeTo) {
                window.resizeTo(newWidth, newHeight);
            }
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <div className={`h-screen w-screen ${currentTheme.bgClass} rounded-3xl overflow-hidden flex flex-col border shadow-3xl backdrop-blur-2xl relative transition-all duration-300 ${
            isHighContrast ? (currentTheme.isLight ? 'border-slate-300 font-semibold' : 'border-white/30 font-semibold') : (currentTheme.isLight ? 'border-slate-200' : 'border-white/10')
        }`}>
            {/* Custom Embedded Background Wallpaper Styles & FX */}
            <style>{`
                @keyframes floatOrb1 { 0%, 100% { transform: translate(0px, 0px) scale(1); } 50% { transform: translate(30px, -20px) scale(1.15); } }
                @keyframes floatOrb2 { 0%, 100% { transform: translate(0px, 0px) scale(1); } 50% { transform: translate(-25px, 25px) scale(1.1); } }
                .mini-bg-orbs .orb-1 {
                    position: absolute; top: -10%; left: -10%; width: 260px; height: 260px; border-radius: 50%;
                    background: radial-gradient(circle, rgba(59, 130, 246, 0.35) 0%, rgba(59, 130, 246, 0) 70%);
                    animation: floatOrb1 10s ease-in-out infinite; filter: blur(25px); pointer-events: none;
                }
                .mini-bg-orbs .orb-2 {
                    position: absolute; bottom: -10%; right: -10%; width: 240px; height: 240px; border-radius: 50%;
                    background: radial-gradient(circle, rgba(168, 85, 247, 0.35) 0%, rgba(168, 85, 247, 0) 70%);
                    animation: floatOrb2 12s ease-in-out infinite; filter: blur(25px); pointer-events: none;
                }
                .mini-bg-mesh {
                    position: absolute; inset: 0; pointer-events: none;
                    background-image: 
                        radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.15) 0px, transparent 50%),
                        radial-gradient(at 100% 0%, rgba(236, 72, 153, 0.15) 0px, transparent 50%),
                        radial-gradient(at 100% 100%, rgba(16, 185, 129, 0.15) 0px, transparent 50%);
                }
                .mini-bg-grid {
                    position: absolute; inset: 0; pointer-events: none;
                    background-image: linear-gradient(to right, rgba(150, 150, 150, 0.08) 1px, transparent 1px),
                                      linear-gradient(to bottom, rgba(150, 150, 150, 0.08) 1px, transparent 1px);
                    background-size: 24px 24px;
                }
                .mini-bg-dots {
                    position: absolute; inset: 0; pointer-events: none;
                    background-image: radial-gradient(rgba(150, 150, 150, 0.18) 1px, transparent 1px);
                    background-size: 16px 16px;
                }
                /* Hide native scrollbar for modal popups */
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {/* Custom Background Graphic Overlays */}
            {customBgUrl ? (
                <div 
                    className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-30 mix-blend-overlay"
                    style={{ backgroundImage: `url(${customBgUrl})` }}
                />
            ) : wallpaperId === 'orbs' ? (
                <div className="mini-bg-orbs absolute inset-0 pointer-events-none">
                    <div className="orb-1"></div>
                    <div className="orb-2"></div>
                </div>
            ) : wallpaperId === 'mesh' ? (
                <div className="mini-bg-mesh"></div>
            ) : wallpaperId === 'grid' ? (
                <div className="mini-bg-grid"></div>
            ) : wallpaperId === 'dots' ? (
                <div className="mini-bg-dots"></div>
            ) : null}

            {/* Draggable Header */}
            <div
                className={`h-10 ${currentTheme.headerClass} flex justify-between items-center px-3 select-none shrink-0 relative z-20`}
                style={{ WebkitAppRegion: 'drag' }}
            >
                <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center shadow-md shrink-0 ${
                        currentTheme.id === 'kakao-yellow' ? 'bg-[#191919] text-[#FEE500]' : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                    }`}>
                        <img src="/logo.png" alt="" className={`w-3.5 h-3.5 ${currentTheme.id === 'kakao-yellow' ? 'brightness-200' : 'invert brightness-0'}`} onError={(e) => e.target.style.display = 'none'} />
                    </div>
                    <span className="text-[11px] font-black tracking-[0.1em] uppercase">진일 미니</span>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: 'no-drag' }}>
                    {/* Theme & Wallpaper Switcher Button */}
                    <button
                        type="button"
                        onClick={() => setShowThemeModal(true)}
                        title="테마 및 배경화면 설정"
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm ${currentTheme.headerBtn}`}
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                        <span className="hidden sm:inline">테마</span>
                    </button>

                    {/* Close Window Button */}
                    <button
                        type="button"
                        onClick={handleClose}
                        title="닫기"
                        className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
                            currentTheme.id === 'kakao-yellow' 
                                ? 'text-[#191919] hover:bg-red-500 hover:text-white bg-[#191919]/10' 
                                : currentTheme.isLight
                                    ? 'text-slate-700 hover:bg-red-500 hover:text-white bg-slate-100/90 hover:border-transparent border border-slate-200/80'
                                    : 'text-slate-200 hover:bg-red-500 hover:text-white bg-white/10 hover:border-transparent border border-white/10'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar relative z-10">
                {/* Header & Status Section */}
                <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.1em] flex items-center gap-2" style={{ color: currentTheme.accentColor }}>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentTheme.accentColor }}></span>
                        {t('today')}
                    </h3>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => togglePrivacyHidden()}
                            title={isTasksHidden ? "작업 목록 보기" : "작업 목록 숨기기"}
                            className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${currentTheme.privacyBtn}`}
                        >
                            <svg className="w-3 h-3 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isTasksHidden ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                )}
                            </svg>
                            <span>{isTasksHidden ? "숨김 해제" : "숨기기"}</span>
                        </button>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${currentTheme.badgeBg}`}>
                            {activeTasksCount}
                        </span>
                    </div>
                </div>

                {/* Sleek Mini Progress Bar Dashboard Pill */}
                {!isTasksHidden && todayTasks.length > 0 && (
                    <div className={`mb-3.5 p-2.5 rounded-2xl border transition-all ${
                        currentTheme.isLight ? 'bg-white/80 border-slate-200/80' : 'bg-white/5 border-white/10'
                    }`}>
                        <div className="flex items-center justify-between text-[10px] font-bold mb-1.5 opacity-80">
                            <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                완료율 ({completionPercentage}%)
                            </span>
                            <span>{completedTasksCount} / {todayTasks.length} 완료</span>
                        </div>
                        <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                            <div 
                                className="h-full rounded-full transition-all duration-500" 
                                style={{ 
                                    width: `${completionPercentage}%`, 
                                    backgroundColor: currentTheme.accentColor 
                                }}
                            ></div>
                        </div>
                    </div>
                )}

                {isTasksHidden ? (
                    <div 
                        onClick={() => togglePrivacyHidden(false)}
                        className={`group rounded-2xl p-6 border flex flex-col items-center justify-center text-center min-h-[220px] animate-in fade-in duration-300 cursor-pointer hover:scale-[1.01] transition-all my-2 relative overflow-hidden ${
                            currentTheme.isLight
                                ? 'bg-white/90 border-slate-200/80 hover:border-slate-300 shadow-sm'
                                : 'bg-slate-900/80 backdrop-blur-xl border-slate-800 hover:border-slate-700'
                        }`}
                    >
                        <div className="mb-3.5">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 ${
                                currentTheme.id === 'kakao-yellow'
                                    ? 'bg-[#191919] text-[#FEE500] border border-yellow-400/50 shadow-sm'
                                    : currentTheme.isLight
                                        ? 'bg-slate-100 text-slate-700 border border-slate-200/80 shadow-sm'
                                        : 'bg-slate-800 text-slate-200 border border-slate-700/80'
                            }`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                        </div>

                        <h3 className={`text-xs font-bold mb-1 tracking-tight ${currentTheme.isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                            작업 목록이 가려져 있습니다
                        </h3>
                        <p className={`text-[10.5px] max-w-[200px] mb-4 leading-relaxed ${currentTheme.isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            보안을 위해 가려졌습니다. 클릭하여 내용을 확인하세요.
                        </p>

                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); togglePrivacyHidden(false); }}
                            className={`rounded-xl px-4 py-2 font-bold text-[11px] active:scale-95 transition-all duration-200 cursor-pointer flex items-center gap-2 shadow-sm ${
                                currentTheme.id === 'kakao-yellow' 
                                    ? 'bg-[#191919] text-[#FEE500] hover:bg-[#2e2e2e]' 
                                    : currentTheme.isLight
                                        ? 'bg-blue-600 text-white hover:bg-blue-500'
                                        : 'bg-blue-600 text-white hover:bg-blue-500'
                            }`}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                            </svg>
                            <span className="tracking-tight">작업 목록 보기</span>
                        </button>
                    </div>
                ) : sortedTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 opacity-40">
                        <div className="w-12 h-12 mb-3 bg-white/5 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <p className="text-[11px] text-center font-medium">{t('noTasks')}</p>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {sortedTasks.map(task => (
                            <MiniTaskItem 
                                key={task.id} 
                                task={task} 
                                toggleTask={toggleTask} 
                                savedAccounts={savedAccounts}
                                theme={currentTheme}
                                isHighContrast={isHighContrast}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Task Input Section at the Bottom */}
            <div className={`p-3 shrink-0 space-y-2 relative z-30 ${currentTheme.footerBg}`} style={{ WebkitAppRegion: 'no-drag' }}>
                <form onSubmit={handleAddTask} className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('addTaskPlaceholder') || '새 작업 추가...'}
                            className={`w-full pl-3 pr-3 py-2 rounded-xl text-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${currentTheme.inputBg}`}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!title.trim()}
                        className={`w-8 h-8 disabled:opacity-40 rounded-xl flex items-center justify-center transition-all active:scale-95 shrink-0 shadow-md ${currentTheme.accentBg}`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </form>

                {/* Priorities & Time picker row */}
                <div className="flex items-center justify-between gap-1 text-[11px] select-none">
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setPriority('normal')}
                            className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold transition-all flex items-center gap-1 ${
                                priority === 'normal'
                                    ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500'
                                    : currentTheme.isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                            보통
                        </button>

                        <button
                            type="button"
                            onClick={() => setPriority('high')}
                            className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold transition-all flex items-center gap-1 ${
                                priority === 'high'
                                    ? 'bg-orange-500/20 border-orange-500/50 text-orange-500'
                                    : currentTheme.isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                            급
                        </button>

                        <button
                            type="button"
                            onClick={() => setPriority('urgent')}
                            className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold transition-all flex items-center gap-1 ${
                                priority === 'urgent'
                                    ? 'bg-red-500/20 border-red-500/50 text-red-500'
                                    : currentTheme.isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            급급급
                        </button>
                    </div>

                    {/* Time picker button */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => {
                                if (!showTimePicker) {
                                    const now = new Date();
                                    const h = String(now.getHours()).padStart(2, '0');
                                    const m = String(Math.round(now.getMinutes() / 5) * 5 % 60).padStart(2, '0');
                                    setTempHour(h);
                                    setTempMinute(m);
                                }
                                setShowTimePicker(!showTimePicker);
                            }}
                            className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold transition-all flex items-center gap-1 ${
                                time
                                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-500'
                                    : currentTheme.isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
                            }`}
                        >
                            <svg className="w-3 h-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {time || '--:--'}
                            {time && (
                                <span
                                    onClick={(e) => { e.stopPropagation(); setTime(''); }}
                                    className="ml-0.5 text-blue-500 hover:text-red-500"
                                >
                                    ×
                                </span>
                            )}
                        </button>

                        {/* Compact Time Picker Dropdown */}
                        {showTimePicker && (
                            <div className="absolute bottom-full right-0 mb-2 bg-slate-900 border border-white/15 rounded-xl shadow-2xl p-2.5 z-50 w-44 animate-in fade-in slide-in-from-bottom-2 text-white">
                                <div className="flex gap-1.5 text-center">
                                    <div className="flex-1">
                                        <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">시</p>
                                        <div className="h-28 overflow-y-auto no-scrollbar bg-black/30 rounded-lg p-1 space-y-0.5">
                                            {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(h => (
                                                <button
                                                    key={h}
                                                    type="button"
                                                    onClick={() => setTempHour(h)}
                                                    className={`w-full py-0.5 text-[11px] font-bold rounded ${tempHour === h ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-white/10'}`}
                                                >
                                                    {h}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center text-gray-500 font-bold pt-3">:</div>
                                    <div className="flex-1">
                                        <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">분</p>
                                        <div className="h-28 overflow-y-auto no-scrollbar bg-black/30 rounded-lg p-1 space-y-0.5">
                                            {Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')).map(m => (
                                                <button
                                                    key={m}
                                                    type="button"
                                                    onClick={() => setTempMinute(m)}
                                                    className={`w-full py-0.5 text-[11px] font-bold rounded ${tempMinute === m ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-white/10'}`}
                                                >
                                                    {m}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => { setTime(''); setShowTimePicker(false); }}
                                        className="text-[10px] text-gray-400 hover:text-red-400"
                                    >
                                        취소
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (tempHour && tempMinute) {
                                                setTime(`${tempHour}:${tempMinute}`);
                                            }
                                            setShowTimePicker(false);
                                        }}
                                        className="px-2 py-0.5 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-md"
                                    >
                                        확인
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Assignee selector */}
                    {savedAccounts.filter(a => a.email !== user?.email && (a.uid || a.email)).length > 0 && (
                        <div className="relative" ref={assigneeRef}>
                            <button
                                type="button"
                                onClick={() => setShowAssignee(!showAssignee)}
                                className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold transition-all flex items-center gap-1 ${
                                    assigneeUid
                                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-500'
                                        : currentTheme.isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
                                }`}
                            >
                                <svg className="w-3 h-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                {assigneeUid
                                    ? (savedAccounts.find(a => (a.uid && a.uid === assigneeUid) || a.email === assigneeUid)?.alias || savedAccounts.find(a => (a.uid && a.uid === assigneeUid) || a.email === assigneeUid)?.email?.split('@')[0] || '?')
                                    : '나'}
                                <svg className="w-2.5 h-2.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Assignee Dropdown */}
                            {showAssignee && (
                                <div className="absolute bottom-full right-0 mb-2 bg-slate-900 border border-white/15 rounded-xl shadow-2xl py-1 z-50 w-32 animate-in fade-in slide-in-from-bottom-2 text-white">
                                    <button
                                        type="button"
                                        onClick={() => { setAssigneeUid(null); setShowAssignee(false); }}
                                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] transition-colors
                                            ${!assigneeUid ? 'text-blue-400 font-bold bg-white/5' : 'text-gray-300 hover:bg-white/10'}`}
                                    >
                                        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-[8px] font-bold shrink-0">
                                            {(user?.email || '?')[0].toUpperCase()}
                                        </div>
                                        <span className="flex-1 text-left">나</span>
                                        {!assigneeUid && (
                                            <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </button>
                                    
                                    <div className="h-px bg-white/10 mx-2 my-0.5"></div>
                                    
                                    {savedAccounts.filter(a => a.email !== user?.email && (a.uid || a.email)).map(acc => {
                                        const key = acc.uid || acc.email;
                                        return (
                                            <button
                                                key={acc.email}
                                                type="button"
                                                onClick={() => { setAssigneeUid(key); setShowAssignee(false); }}
                                                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] transition-colors
                                                    ${assigneeUid === key ? 'text-purple-400 font-bold bg-white/5' : 'text-gray-300 hover:bg-white/10'}`}
                                            >
                                                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 ${assigneeUid === key ? 'bg-purple-500 text-white' : 'bg-white/10 text-gray-300'}`}>
                                                    {acc.email[0].toUpperCase()}
                                                </div>
                                                <span className="flex-1 text-left truncate">{acc.alias || acc.email.split('@')[0]}</span>
                                                {assigneeUid === key && (
                                                    <svg className="w-3 h-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className={`h-9 flex justify-between items-center px-4 shrink-0 relative z-10 ${currentTheme.footerBg}`}>
                <span className="text-[10px] font-black tracking-tighter opacity-80">{today}</span>
                <div className="flex items-center gap-1.5 bg-green-500/10 px-2 py-0.5 rounded-lg border border-green-500/20">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-[9px] font-bold text-green-500 uppercase">Live</span>
                </div>
            </div>

            {/* 🎨 Toss / Kakao Modern High Contrast Theme & Wallpaper Modal */}
            {showThemeModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-3 animate-in fade-in duration-200" style={{ WebkitAppRegion: 'no-drag' }}>
                    <div className="w-full max-w-sm max-h-[85vh] overflow-y-auto no-scrollbar bg-slate-900/95 border border-white/20 rounded-3xl shadow-2xl p-4 text-white flex flex-col gap-4 animate-in zoom-in-95 duration-200 relative">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xs font-black text-white">테마 및 배경화면 설정</h3>
                                    <p className="text-[9px] text-gray-400">Toss & Kakao 프리미엄 디자인</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowThemeModal(false)}
                                className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Tab Switcher */}
                        <div className="grid grid-cols-2 p-1 bg-white/10 rounded-2xl gap-1">
                            <button
                                type="button"
                                onClick={() => setThemeModalTab('themes')}
                                className={`py-2 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
                                    themeModalTab === 'themes'
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                🎨 UI 테마 (Themes)
                            </button>
                            <button
                                type="button"
                                onClick={() => setThemeModalTab('wallpapers')}
                                className={`py-2 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
                                    themeModalTab === 'wallpapers'
                                        ? 'bg-purple-600 text-white shadow-md'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                🖼️ 배경화면 (Wallpapers)
                            </button>
                        </div>

                        {/* TAB 1: UI 테마 (Color Themes) */}
                        {themeModalTab === 'themes' && (
                            <div className="flex flex-col gap-3">
                                <div className="grid grid-cols-1 gap-2">
                                    {PRESET_THEMES.map((theme) => {
                                        const isSelected = themeId === theme.id;
                                        return (
                                            <div
                                                key={theme.id}
                                                onClick={() => setThemeId(theme.id)}
                                                className={`p-2.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                                                    isSelected 
                                                        ? 'border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500 scale-[1.01]' 
                                                        : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {/* Mini Theme Thumbnail Card Preview */}
                                                    <div className="w-9 h-9 rounded-xl border border-white/20 shrink-0 overflow-hidden flex flex-col shadow-inner bg-slate-950">
                                                        <div className="h-3 w-full" style={{ backgroundColor: theme.id === 'kakao-yellow' ? '#FEE500' : theme.accentColor }}></div>
                                                        <div className="flex-1 p-1 flex items-center justify-center">
                                                            <div className="w-5 h-2.5 rounded-sm border border-white/30" style={{ backgroundColor: theme.isLight ? '#FFFFFF' : '#222222' }}></div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-bold text-white flex items-center gap-1.5">
                                                            {theme.name}
                                                        </p>
                                                        <p className="text-[9px] text-gray-400">{theme.category}</p>
                                                    </div>
                                                </div>
                                                {isSelected ? (
                                                    <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-black shadow-md">
                                                        ✓
                                                    </span>
                                                ) : (
                                                    <div className="w-4 h-4 rounded-full border border-white/20"></div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* High Contrast Mode Toggle */}
                                <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                                    <div>
                                        <h4 className="text-[11px] font-bold text-white">선명한 고대비 모드 (High Contrast)</h4>
                                        <p className="text-[9px] text-gray-400">폰트와 테두리의 명암비를 극대화합니다.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsHighContrast(!isHighContrast)}
                                        className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                                            isHighContrast ? 'bg-blue-600' : 'bg-gray-700'
                                        }`}
                                    >
                                        <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                                            isHighContrast ? 'translate-x-5' : 'translate-x-0'
                                        }`} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: 배경화면 & 그래픽 효과 (Wallpapers & Upload) */}
                        {themeModalTab === 'wallpapers' && (
                            <div className="flex flex-col gap-3">
                                {/* Visual Thumbnail Grid */}
                                <div className="grid grid-cols-2 gap-2">
                                    {PRESET_WALLPAPERS.map((wp) => {
                                        const isSelected = wallpaperId === wp.id && !customBgUrl;
                                        return (
                                            <div
                                                key={wp.id}
                                                onClick={() => { setWallpaperId(wp.id); setCustomBgUrl(''); }}
                                                className={`p-2 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between h-20 relative overflow-hidden group ${
                                                    isSelected
                                                        ? 'border-purple-500 bg-purple-500/25 ring-1 ring-purple-500 shadow-md'
                                                        : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                                                }`}
                                            >
                                                {/* Visual Gradient Background Preview */}
                                                <div className={`absolute inset-0 ${wp.bgPreview} opacity-40 group-hover:opacity-60 transition-opacity`}></div>

                                                <div className="relative z-10 flex items-center justify-between">
                                                    <span className="text-base drop-shadow">{wp.icon}</span>
                                                    {isSelected && (
                                                        <span className="w-4 h-4 rounded-full bg-purple-500 text-white flex items-center justify-center text-[9px] font-bold">
                                                            ✓
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="relative z-10">
                                                    <p className="text-[11px] font-bold text-white leading-tight">{wp.name}</p>
                                                    <p className="text-[8.5px] text-gray-300 font-medium">{wp.english}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Local File Upload Button */}
                                <div className="border-t border-white/10 pt-3 space-y-2">
                                    <label className="flex items-center justify-center gap-2 p-2.5 rounded-2xl border border-dashed border-purple-400/60 bg-purple-500/10 hover:bg-purple-500/20 text-purple-200 text-xs font-bold cursor-pointer transition-all shadow-xs">
                                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                        <span>📂 내 컴퓨터에서 이미지 업로드</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleLocalFileUpload}
                                            className="hidden"
                                        />
                                    </label>

                                    {/* Custom URL Input */}
                                    <div>
                                        <label className="text-[9px] text-gray-400 mb-1 block">또는 커스텀 이미지 URL 입력</label>
                                        <input
                                            type="text"
                                            value={customBgUrl}
                                            onChange={(e) => { setCustomBgUrl(e.target.value); setWallpaperId('custom'); }}
                                            placeholder="https://example.com/wallpaper.jpg"
                                            className="w-full px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-[10.5px] text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Apply & Close Button */}
                        <button
                            type="button"
                            onClick={() => setShowThemeModal(false)}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[11px] font-extrabold shadow-lg active:scale-95 transition-all mt-1 cursor-pointer"
                        >
                            설정 완료 (Apply Theme)
                        </button>
                    </div>
                </div>
            )}

            {/* Bottom Edge Drag Resize Handle */}
            <div 
                onMouseDown={(e) => handleMouseDown(e, 'bottom')}
                className="absolute bottom-0 left-0 right-6 h-2 cursor-ns-resize hover:bg-blue-500/40 transition-colors z-40 flex items-center justify-center"
                style={{ WebkitAppRegion: 'no-drag' }}
                title="길이 조절 (위아래 드래그)"
            >
                <div className="w-10 h-1 bg-white/20 rounded-full"></div>
            </div>

            {/* Bottom Right Corner Resize Handle */}
            <div 
                onMouseDown={(e) => handleMouseDown(e, 'corner')}
                className="absolute bottom-1 right-1 w-5 h-5 cursor-nwse-resize opacity-40 hover:opacity-100 transition-opacity flex items-end justify-end p-0.5 z-50 hover:bg-blue-500/30 rounded-lg"
                style={{ WebkitAppRegion: 'no-drag' }}
                title="크기 조절 (드래그)"
            >
                <svg className="w-3 h-3 text-white/70 hover:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <line x1="22" y1="6" x2="6" y2="22" />
                    <line x1="22" y1="14" x2="14" y2="22" />
                </svg>
            </div>
        </div>
    );
}
