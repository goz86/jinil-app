import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { auth, db, secondaryAuth, secondaryDb, firebaseConfig } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, getAuth } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, getFirestore } from 'firebase/firestore';
import { useLanguage } from '../contexts/LanguageContext';
import Swal from 'sweetalert2';

// 🎨 Curated Modern Themes (Toss, Kakao, OLED, Neon, Mint)
const PRESET_THEMES = [
    {
        id: 'toss-dark',
        name: '토스 다크 (Toss Dark Navy)',
        category: 'Toss Style',
        bgClass: 'bg-slate-950/90 text-white',
        headerClass: 'bg-slate-900/90 border-b border-slate-700/60 text-white',
        cardClass: 'bg-slate-900/70 border-slate-700/50 hover:border-blue-500/50 text-white',
        inputBg: 'bg-slate-900/80 border-slate-700 text-white placeholder-slate-400',
        accentColor: '#3b82f6',
        accentBg: 'bg-blue-600 hover:bg-blue-500 text-white',
        badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        subTextColor: 'text-slate-400',
        isLight: false,
    },
    {
        id: 'kakao-dark',
        name: '카카오 다크 (Kakao Charcoal)',
        category: 'Kakao Style',
        bgClass: 'bg-[#181818]/95 text-gray-100',
        headerClass: 'bg-[#222222]/95 border-b border-white/10 text-white',
        cardClass: 'bg-[#282828]/90 border-white/10 hover:border-[#fee500]/50 text-gray-100',
        inputBg: 'bg-[#282828] border-white/15 text-white placeholder-gray-400',
        accentColor: '#fee500',
        accentBg: 'bg-[#fee500] hover:bg-[#ebd200] text-slate-950 font-bold',
        badgeBg: 'bg-[#fee500]/20 text-[#fee500] border-[#fee500]/40',
        subTextColor: 'text-gray-400',
        isLight: false,
    },
    {
        id: 'kakao-yellow',
        name: '카카오 옐로우 (Kakao Classic)',
        category: 'Kakao Style',
        bgClass: 'bg-[#fffde7] text-slate-900',
        headerClass: 'bg-[#fee500] border-b border-yellow-300 text-slate-950 font-extrabold',
        cardClass: 'bg-white border-yellow-200/90 hover:border-yellow-400 shadow-sm text-slate-900',
        inputBg: 'bg-white border-yellow-300 text-slate-900 placeholder-slate-400',
        accentColor: '#ca8a04',
        accentBg: 'bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold',
        badgeBg: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        subTextColor: 'text-slate-500',
        isLight: true,
    },
    {
        id: 'toss-light',
        name: '토스 화이트 (Toss Light Blue)',
        category: 'Toss Style',
        bgClass: 'bg-[#f8fafc] text-slate-900',
        headerClass: 'bg-white border-b border-slate-200 text-slate-900',
        cardClass: 'bg-white border-slate-200 hover:border-blue-400 shadow-sm text-slate-900',
        inputBg: 'bg-white border-slate-300 text-slate-900 placeholder-slate-400',
        accentColor: '#2563eb',
        accentBg: 'bg-blue-600 hover:bg-blue-500 text-white',
        badgeBg: 'bg-blue-100 text-blue-700 border-blue-300',
        subTextColor: 'text-slate-500',
        isLight: true,
    },
    {
        id: 'oled-black',
        name: 'OLED 트루 블랙 (Deep Contrast)',
        category: 'Minimal',
        bgClass: 'bg-black text-white',
        headerClass: 'bg-zinc-950 border-b border-zinc-800 text-white',
        cardClass: 'bg-zinc-900/90 border-zinc-800 hover:border-purple-500/50 text-white',
        inputBg: 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500',
        accentColor: '#a855f7',
        accentBg: 'bg-purple-600 hover:bg-purple-500 text-white',
        badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        subTextColor: 'text-zinc-400',
        isLight: false,
    },
    {
        id: 'cyber-neon',
        name: '네온 사이버 (Neon Magenta)',
        category: 'Vibrant',
        bgClass: 'bg-gradient-to-b from-indigo-950 via-slate-950 to-purple-950 text-white',
        headerClass: 'bg-purple-950/80 border-b border-pink-500/30 text-white',
        cardClass: 'bg-indigo-950/40 border-pink-500/30 hover:border-pink-400/60 text-white',
        inputBg: 'bg-indigo-950/60 border-pink-500/30 text-white placeholder-pink-200/40',
        accentColor: '#ec4899',
        accentBg: 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white',
        badgeBg: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
        subTextColor: 'text-pink-200/70',
        isLight: false,
    },
    {
        id: 'emerald-mint',
        name: '에메랄드 민트 (Forest Fresh)',
        category: 'Vibrant',
        bgClass: 'bg-gradient-to-b from-slate-950 via-emerald-950/60 to-slate-950 text-emerald-100',
        headerClass: 'bg-emerald-950/90 border-b border-emerald-500/20 text-emerald-100',
        cardClass: 'bg-emerald-950/40 border-emerald-500/30 hover:border-emerald-400/60 text-emerald-100',
        inputBg: 'bg-emerald-950/60 border-emerald-500/30 text-emerald-100 placeholder-emerald-300/40',
        accentColor: '#10b981',
        accentBg: 'bg-emerald-600 hover:bg-emerald-500 text-white',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        subTextColor: 'text-emerald-200/60',
        isLight: false,
    }
];

// 🖼 Wallpaper Effects & Patterns
const PRESET_WALLPAPERS = [
    { id: 'orbs', name: '은은한 오로라 글로우 (Aurora Orbs)', style: 'orbs' },
    { id: 'mesh', name: '입체 메쉬 그라디언트 (Mesh Wave)', style: 'mesh' },
    { id: 'grid', name: '하이테크 그리드 (Tech Grid)', style: 'grid' },
    { id: 'dots', name: '미니멀 도트 매트릭스 (Dot Matrix)', style: 'dots' },
    { id: 'solid', name: '깔끔한 플랫 솔리드 (Clean Solid)', style: 'solid' },
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
        <div className={`group p-3 rounded-2xl border transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
            task.completed
                ? isLight
                    ? 'bg-slate-200/50 border-slate-300/60 opacity-60'
                    : 'bg-white/[0.03] border-white/5 opacity-60 hover:opacity-90'
                : isLight
                    ? 'bg-white hover:bg-slate-50 border-slate-200/90 hover:border-blue-400 shadow-sm'
                    : theme?.cardClass || 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10'
        } ${isHighContrast ? 'border-2 font-bold shadow-md' : ''}`}>
            <div className="flex flex-col gap-1.5">
                <div className="flex items-start gap-3">
                    <button
                        onClick={() => toggleTask(task.id)}
                        className={`mt-0.5 w-5 h-5 rounded-lg border-2 flex-shrink-0 transition-all flex items-center justify-center group-active:scale-90 ${
                            task.completed
                                ? 'bg-blue-500 border-blue-500 text-white shadow-sm shadow-blue-500/30'
                                : isLight
                                    ? 'border-slate-400 hover:border-blue-500'
                                    : 'border-white/30 hover:border-blue-500'
                        }`}
                    >
                        {task.completed ? (
                            <svg className="w-3.5 h-3.5 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <div className="w-2 h-2 bg-blue-500 rounded-sm opacity-0 group-hover:opacity-40 transition-opacity"></div>
                        )}
                    </button>
                    <span
                        className={`text-[13px] leading-snug cursor-default flex-1 transition-all ${
                            isHighContrast ? 'font-black tracking-tight' : 'font-semibold'
                        } ${
                            task.completed
                                ? isLight ? 'line-through text-slate-400 select-none' : 'line-through text-gray-400/70 select-none'
                                : isLight ? 'text-slate-900 group-hover:text-blue-600' : 'text-gray-100 group-hover:text-white'
                        }`}
                        title={task.title}
                    >
                        {task.title}
                    </span>
                    {task.priority === 'urgent' && <span className={`w-2.5 h-2.5 rounded-full bg-red-500 mt-1 shrink-0 ${task.completed ? 'opacity-40' : ''}`} title="급급급" />}
                    {task.priority === 'high' && <span className={`w-2.5 h-2.5 rounded-full bg-orange-400 mt-1 shrink-0 ${task.completed ? 'opacity-40' : ''}`} title="급" />}
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
    const [patrolledTasks, setPatrolledTasks] = useState({}); // { [uid]: Task[] }
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

    // 🎨 Theme & Wallpaper & Side-Hide State
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
    const [isEdgeDocked, setIsEdgeDocked] = useState(false);
    const [showThemeModal, setShowThemeModal] = useState(false);

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

    const handleClose = () => {
        if (window.electronAPI && window.electronAPI.hideMiniWidget) {
            window.electronAPI.hideMiniWidget();
        } else {
            window.close();
        }
    };

    const handleSideHide = () => {
        setIsEdgeDocked(true);
        if (window.electronAPI && window.electronAPI.hideMiniWidget) {
            window.electronAPI.hideMiniWidget();
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

    // 📌 Edge Docked View (Collapses into a sleek vertical handle docked to side)
    if (isEdgeDocked) {
        return (
            <div 
                onClick={() => setIsEdgeDocked(false)}
                title="클릭하여 진일 미니 펼치기 (Click to expand Jinil Mini)"
                className={`h-screen w-full cursor-pointer flex flex-col items-center justify-between py-4 select-none animate-in fade-in slide-in-from-left duration-300 border-r shadow-2xl transition-all ${
                    currentTheme.isLight 
                        ? 'bg-white/95 border-yellow-400 text-slate-900 shadow-yellow-500/10' 
                        : 'bg-slate-950/95 border-blue-500/40 text-white shadow-blue-500/20'
                }`}
            >
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg animate-pulse">
                        <img src="/logo.png" alt="" className="w-5 h-5 invert brightness-0" onError={(e) => e.target.style.display = 'none'} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest pt-2 [writing-mode:vertical-lr] rotate-180 opacity-90">
                        진일 미니
                    </span>
                </div>

                <div className="flex flex-col items-center gap-1">
                    <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-md border border-white/20">
                        {activeTasksCount}
                    </span>
                    <span className="text-[8px] font-bold text-blue-400 uppercase">Tasks</span>
                </div>

                <div className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all border border-white/10">
                    <svg className="w-4 h-4 text-blue-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                </div>
            </div>
        );
    }

    return (
        <div className={`h-screen w-screen ${currentTheme.bgClass} rounded-3xl overflow-hidden flex flex-col border shadow-3xl backdrop-blur-2xl relative transition-all duration-300 ${
            isHighContrast ? 'border-white/30 font-semibold' : 'border-white/10'
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
                        radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.2) 0px, transparent 50%),
                        radial-gradient(at 100% 0%, rgba(236, 72, 153, 0.2) 0px, transparent 50%),
                        radial-gradient(at 100% 100%, rgba(16, 185, 129, 0.2) 0px, transparent 50%);
                }
                .mini-bg-grid {
                    position: absolute; inset: 0; pointer-events: none;
                    background-image: linear-gradient(to right, rgba(255, 255, 255, 0.06) 1px, transparent 1px),
                                      linear-gradient(to bottom, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
                    background-size: 24px 24px;
                }
                .mini-bg-dots {
                    position: absolute; inset: 0; pointer-events: none;
                    background-image: radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px);
                    background-size: 16px 16px;
                }
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
                    <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shrink-0">
                        <img src="/logo.png" alt="" className="w-3.5 h-3.5 invert brightness-0" onError={(e) => e.target.style.display = 'none'} />
                    </div>
                    <span className="text-[11px] font-black tracking-[0.1em] uppercase">진일 미니</span>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' }}>
                    {/* Theme & Wallpaper Switcher Button */}
                    <button
                        type="button"
                        onClick={() => setShowThemeModal(true)}
                        title="테마 및 배경화면 설정"
                        className="px-2 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 border border-white/15"
                    >
                        <span className="text-xs">🎨</span>
                        <span className="hidden sm:inline">테마</span>
                    </button>

                    {/* Edge Dock / Side Hide Button */}
                    <button
                        type="button"
                        onClick={handleSideHide}
                        title="cạnh 숨기기 (사이드 사이드 숨기기)"
                        className="px-2 py-1 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 border border-blue-500/30"
                    >
                        <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        </svg>
                        <span>숨기기</span>
                    </button>

                    {/* Close Window Button */}
                    <button
                        onClick={handleClose}
                        className="w-7 h-7 rounded-xl hover:bg-red-500 flex items-center justify-center text-white/50 hover:text-white transition-all active:scale-90"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar relative z-10">
                <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] flex items-center gap-2" style={{ color: currentTheme.accentColor }}>
                        <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: currentTheme.accentColor }}></span>
                        {t('today')}
                    </h3>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => togglePrivacyHidden()}
                            title={isTasksHidden ? "작업 목록 보기" : "작업 목록 숨기기"}
                            className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                currentTheme.isLight
                                    ? 'bg-white/80 border-slate-300 text-slate-700 hover:bg-slate-100'
                                    : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                            }`}
                        >
                            <svg className="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isTasksHidden ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                )}
                            </svg>
                            <span>{isTasksHidden ? "숨김 해제" : "숨기기"}</span>
                        </button>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${currentTheme.badgeBg}`}>
                            {activeTasksCount}
                        </span>
                    </div>
                </div>

                {isTasksHidden ? (
                    <div 
                        onClick={() => togglePrivacyHidden(false)}
                        className={`group rounded-2xl p-6 border flex flex-col items-center justify-center text-center min-h-[220px] animate-in fade-in duration-300 cursor-pointer hover:scale-[1.01] transition-all my-2 relative overflow-hidden ${
                            currentTheme.isLight
                                ? 'bg-white/80 border-slate-300 hover:border-blue-400 shadow-md'
                                : 'bg-white/5 backdrop-blur-xl border-white/10 hover:border-blue-500/40 hover:bg-white/10'
                        }`}
                    >
                        {/* 3D Glowing Security Shield Icon */}
                        <div className="relative mb-4">
                            <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 opacity-30 blur-lg group-hover:opacity-60 transition-opacity duration-500"></div>
                            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-[0_8px_20px_-4px_rgba(59,130,246,0.5)] border border-white/30 group-hover:scale-110 transition-transform duration-300">
                                <svg className="w-6 h-6 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                        </div>

                        <h3 className={`text-xs font-black mb-1 tracking-tight ${currentTheme.isLight ? 'text-slate-900' : 'text-white'}`}>
                            작업 목록이 가려져 있습니다
                        </h3>
                        <p className={`text-[10px] max-w-[180px] mb-4 leading-relaxed ${currentTheme.subTextColor}`}>
                            보안을 위해 가려졌습니다. 클릭하여 내용을 확인하세요.
                        </p>

                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); togglePrivacyHidden(false); }}
                            className={`relative group/btn overflow-hidden rounded-xl px-4 py-2 font-bold text-[10px] shadow-lg active:scale-95 transition-all duration-200 cursor-pointer flex items-center gap-2 border border-white/20 ${currentTheme.accentBg}`}
                        >
                            <div className="w-4 h-4 rounded-md bg-white/20 flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <span className="tracking-wide">작업 목록 보기</span>
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
            <div className={`p-3 border-t shrink-0 space-y-2 relative z-30 ${
                currentTheme.isLight ? 'bg-white/90 border-slate-200' : 'bg-black/40 border-white/10'
            }`} style={{ WebkitAppRegion: 'no-drag' }}>
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
                        className={`w-8 h-8 disabled:opacity-40 rounded-xl flex items-center justify-center transition-all active:scale-95 shrink-0 shadow-lg ${currentTheme.accentBg}`}
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
                                    ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                                    : currentTheme.isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
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
                                    ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                                    : currentTheme.isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
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
                                    ? 'bg-red-500/20 border-red-500/50 text-red-400'
                                    : currentTheme.isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
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
                                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                                    : currentTheme.isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
                            }`}
                        >
                            <svg className="w-3 h-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {time || '--:--'}
                            {time && (
                                <span
                                    onClick={(e) => { e.stopPropagation(); setTime(''); }}
                                    className="ml-0.5 text-blue-400 hover:text-red-400"
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
                                        <div className="h-28 overflow-y-auto custom-scrollbar bg-black/30 rounded-lg p-1 space-y-0.5">
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
                                        <div className="h-28 overflow-y-auto custom-scrollbar bg-black/30 rounded-lg p-1 space-y-0.5">
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
                                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                                        : currentTheme.isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
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
            <div className={`h-10 border-t flex justify-between items-center px-4 shrink-0 relative z-10 ${
                currentTheme.isLight ? 'bg-slate-100/90 border-slate-200 text-slate-600' : 'bg-black/40 border-white/5 text-gray-400'
            }`}>
                <span className="text-[10px] font-black tracking-tighter opacity-80">{today}</span>
                <div className="flex items-center gap-1.5 bg-green-500/10 px-2 py-0.5 rounded-lg border border-green-500/20">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-[9px] font-bold text-green-500 uppercase">Live</span>
                </div>
            </div>

            {/* 🎨 Toss / Kakao Modern High Contrast Theme & Wallpaper Modal */}
            {showThemeModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-3 animate-in fade-in duration-200" style={{ WebkitAppRegion: 'no-drag' }}>
                    <div className="w-full max-w-sm max-h-[85vh] overflow-y-auto bg-slate-900 border border-white/20 rounded-3xl shadow-2xl p-4 text-white flex flex-col gap-4 custom-scrollbar animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                                    🎨
                                </div>
                                <div>
                                    <h3 className="text-xs font-black text-white">테마 및 배경화면 설정</h3>
                                    <p className="text-[9px] text-gray-400">Kakao & Toss 고대비 팝업 디자인</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowThemeModal(false)}
                                className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-all"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Section 1: Themes Selection */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-blue-400 mb-2 block flex items-center gap-1">
                                <span>🎨</span> UI 테마 선택 (Themes)
                            </label>
                            <div className="grid grid-cols-1 gap-2">
                                {PRESET_THEMES.map((theme) => {
                                    const isSelected = themeId === theme.id;
                                    return (
                                        <div
                                            key={theme.id}
                                            onClick={() => setThemeId(theme.id)}
                                            className={`p-2.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                                                isSelected 
                                                    ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500' 
                                                    : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div 
                                                    className="w-5 h-5 rounded-full border border-white/30 shrink-0 shadow-inner flex items-center justify-center text-[10px]"
                                                    style={{ backgroundColor: theme.accentColor }}
                                                >
                                                    {isSelected && <span className="text-white drop-shadow font-black">✓</span>}
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-bold text-white">{theme.name}</p>
                                                    <p className="text-[9px] text-gray-400">{theme.category}</p>
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500 text-white">
                                                    선택됨
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Section 2: Wallpaper Effects Selection */}
                        <div className="border-t border-white/10 pt-3">
                            <label className="text-[10px] font-black uppercase tracking-wider text-purple-400 mb-2 block flex items-center gap-1">
                                <span>🖼</span> 배경화면 그래픽 효과 (Wallpapers)
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {PRESET_WALLPAPERS.map((wp) => {
                                    const isSelected = wallpaperId === wp.id && !customBgUrl;
                                    return (
                                        <button
                                            key={wp.id}
                                            type="button"
                                            onClick={() => { setWallpaperId(wp.id); setCustomBgUrl(''); }}
                                            className={`p-2 rounded-xl border text-left transition-all ${
                                                isSelected
                                                    ? 'border-purple-500 bg-purple-500/20 text-white font-bold ring-1 ring-purple-500'
                                                    : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                                            }`}
                                        >
                                            <p className="text-[10px] truncate">{wp.name}</p>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Custom Image URL input */}
                            <div className="mt-2.5">
                                <label className="text-[9px] text-gray-400 mb-1 block">커스텀 배경 이미지 URL (선택)</label>
                                <input
                                    type="text"
                                    value={customBgUrl}
                                    onChange={(e) => setCustomBgUrl(e.target.value)}
                                    placeholder="https://example.com/wallpaper.jpg"
                                    className="w-full px-2.5 py-1.5 bg-black/40 border border-white/15 rounded-xl text-[10px] text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                                />
                            </div>
                        </div>

                        {/* Section 3: High Contrast & Readability Mode */}
                        <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                            <div>
                                <h4 className="text-[11px] font-bold text-white">선명한 고대비 모드 (High Contrast)</h4>
                                <p className="text-[9px] text-gray-400">카카오/토스 팝업처럼 폰트와 테두리를 강조합니다.</p>
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

                        {/* Apply & Close Button */}
                        <button
                            type="button"
                            onClick={() => setShowThemeModal(false)}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[11px] font-extrabold shadow-lg active:scale-95 transition-all mt-1"
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
