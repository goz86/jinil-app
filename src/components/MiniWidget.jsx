import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { auth, db, secondaryAuth, secondaryDb, firebaseConfig } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, getAuth } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, getFirestore } from 'firebase/firestore';
import { useLanguage } from '../contexts/LanguageContext';
import Swal from 'sweetalert2';

const MiniTaskItem = ({ task, toggleTask }) => {
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

    return (
        <div className={`group p-3 rounded-2xl border transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
            task.completed
                ? 'bg-white/[0.03] border-white/5 opacity-60 hover:opacity-90'
                : 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10'
        }`}>
            <div className="flex flex-col gap-1.5">
                <div className="flex items-start gap-3">
                    <button
                        onClick={() => toggleTask(task.id)}
                        className={`mt-0.5 w-5 h-5 rounded-lg border-2 flex-shrink-0 transition-all flex items-center justify-center group-active:scale-90 ${
                            task.completed
                                ? 'bg-blue-500 border-blue-500 text-white shadow-sm shadow-blue-500/30'
                                : 'border-white/20 hover:border-blue-500'
                        }`}
                    >
                        {task.completed ? (
                            <svg className="w-3.5 h-3.5 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <div className="w-2 h-2 bg-blue-500 rounded-sm opacity-0 group-hover:opacity-30 transition-opacity"></div>
                        )}
                    </button>
                    <span
                        className={`text-[13px] leading-snug cursor-default flex-1 font-semibold transition-all ${
                            task.completed
                                ? 'line-through text-gray-400/70 select-none'
                                : 'text-gray-200 group-hover:text-white'
                        }`}
                        title={task.title}
                    >
                        {task.title}
                    </span>
                    {task.priority === 'urgent' && <span className={`w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0 ${task.completed ? 'opacity-40' : ''}`} title="급급급" />}
                    {task.priority === 'high' && <span className={`w-2 h-2 rounded-full bg-orange-400 mt-1.5 shrink-0 ${task.completed ? 'opacity-40' : ''}`} title="급" />}
                    {task.priority === 'normal' && <span className={`w-2 h-2 rounded-full bg-yellow-400 mt-1.5 shrink-0 ${task.completed ? 'opacity-30' : 'opacity-60'}`} title="보통" />}
                </div>
                {task.assigneeName && task.assignedByName && (
                    <div className="pl-8 -mt-0.5">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${task.completed ? 'bg-white/5 text-white/30' : 'bg-purple-500/20 text-purple-300'}`}>
                            {task.assignedByName}
                            <svg className="w-2.5 h-2.5 mx-0.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                            {task.assigneeName}
                        </span>
                    </div>
                )}
                {timeLeft && !task.completed && (
                    <div className="pl-8">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide ${timeLeft === '시간 지남' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400 animate-pulse'}`}>
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
    const assigneeRef = useRef(null);

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
        try {
            const accs = JSON.parse(localStorage.getItem('jinil_saved_accounts') || '[]');
            setSavedAccounts(accs);
        } catch (e) {
            setSavedAccounts([]);
        }

        const handleClickOutside = (e) => {
            if (assigneeRef.current && !assigneeRef.current.contains(e.target)) {
                setShowAssignee(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
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

    const saveTasks = async (newTasks) => {
        setTasks(newTasks);
        if (user) {
            const userTodoKey = `todos_${user.uid}`;
            localStorage.setItem(userTodoKey, JSON.stringify(newTasks));
            await setDoc(doc(db, "users", user.uid), { tasks: newTasks }, { merge: true });
        } else {
            localStorage.setItem('todos', JSON.stringify(newTasks));
        }
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
                    text: `"${enhancedTask.title}" \u2192 ${targetName}`,
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
        tasks.forEach(t => {
            if (t && t.id) taskMap.set(t.id, t);
        });
        Object.values(patrolledTasks).flat().forEach(t => {
            if (t && t.id) taskMap.set(t.id, t);
        });
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
        <div className="h-screen w-screen bg-slate-950/80 text-white rounded-3xl overflow-hidden flex flex-col border border-white/10 shadow-3xl backdrop-blur-2xl relative">
            {/* Draggable Header */}
            <div
                className="h-10 bg-white/5 flex justify-between items-center px-4 select-none shrink-0"
                style={{ WebkitAppRegion: 'drag' }}
            >
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                        <img src="/logo.png" alt="" className="w-3.5 h-3.5 invert brightness-0" onError={(e) => e.target.style.display = 'none'} />
                    </div>
                    <span className="text-[11px] font-black text-white tracking-[0.1em] uppercase">진일 미니</span>
                </div>
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="w-7 h-7 rounded-xl hover:bg-red-500 flex items-center justify-center text-white/50 hover:text-white transition-all active:scale-90"
                    style={{ WebkitAppRegion: 'no-drag' }}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-[11px] font-bold text-blue-400 uppercase tracking-[0.1em] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                        {t('today')}
                    </h3>

                    <div className="flex items-center gap-2">
                        <span className="bg-blue-500/20 text-blue-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-blue-500/30">
                            {activeTasksCount}
                        </span>
                    </div>
                </div>

                {sortedTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 opacity-30">
                        <div className="w-12 h-12 mb-3 bg-white/5 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <p className="text-[11px] text-center font-medium">{t('noTasks')}</p>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {sortedTasks.map(task => (
                            <MiniTaskItem key={task.id} task={task} toggleTask={toggleTask} />
                        ))}
                    </div>
                )}
            </div>

            {/* Task Input Section at the Bottom */}
            <div className="p-3 bg-black/30 border-t border-white/10 shrink-0 space-y-2 relative z-30" style={{ WebkitAppRegion: 'no-drag' }}>
                <form onSubmit={handleAddTask} className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('addTaskPlaceholder') || '새 작업 추가...'}
                            className="w-full pl-3 pr-3 py-2 bg-white/10 border border-white/15 rounded-xl text-[12px] text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!title.trim()}
                        className="w-8 h-8 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-xl flex items-center justify-center transition-all active:scale-95 shrink-0 shadow-lg shadow-blue-500/20"
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
                                    ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                                    : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
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
                                    ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                                    : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
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
                                    ? 'bg-red-500/20 border-red-500/50 text-red-300'
                                    : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            급급급
                        </button>
                    </div>

                    {/* Time picker button / Quick time input */}
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
                                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                                    : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
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
                            <div className="absolute bottom-full right-0 mb-2 bg-slate-900 border border-white/15 rounded-xl shadow-2xl p-2.5 z-50 w-44 animate-in fade-in slide-in-from-bottom-2">
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

                    {/* Assignee selector - only show if there are other team members */}
                    {savedAccounts.filter(a => a.email !== user?.email && (a.uid || a.email)).length > 0 && (
                        <div className="relative" ref={assigneeRef}>
                            <button
                                type="button"
                                onClick={() => setShowAssignee(!showAssignee)}
                                className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold transition-all flex items-center gap-1 ${
                                    assigneeUid
                                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                                        : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
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
                                <div className="absolute bottom-full right-0 mb-2 bg-slate-900 border border-white/15 rounded-xl shadow-2xl py-1 z-50 w-32 animate-in fade-in slide-in-from-bottom-2">
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
            <div className="h-10 bg-black/40 border-t border-white/5 flex justify-between items-center px-4 shrink-0 relative">
                <span className="text-[10px] font-black text-gray-500 tracking-tighter">{today}</span>
                <div className="flex items-center gap-1.5 bg-green-500/10 px-2 py-1 rounded-lg border border-green-500/20">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-[9px] font-bold text-green-500 uppercase">Live</span>
                </div>
            </div>

            {/* Bottom Edge Drag Resize Handle (Vertical height expand) */}
            <div 
                onMouseDown={(e) => handleMouseDown(e, 'bottom')}
                className="absolute bottom-0 left-0 right-6 h-2 cursor-ns-resize hover:bg-blue-500/40 transition-colors z-40 flex items-center justify-center"
                style={{ WebkitAppRegion: 'no-drag' }}
                title="길이 조절 (위아래 드래그)"
            >
                <div className="w-10 h-1 bg-white/20 rounded-full"></div>
            </div>

            {/* Bottom Right Corner Resize Handle (Diagonal resize) */}
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

