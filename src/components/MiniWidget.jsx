import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useLanguage } from '../contexts/LanguageContext';

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
        <div className="group p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex flex-col gap-1.5">
                <div className="flex items-start gap-3">
                    <button
                        onClick={() => toggleTask(task.id)}
                        className="mt-0.5 w-5 h-5 rounded-lg border-2 border-white/20 flex-shrink-0 hover:border-blue-500 transition-all flex items-center justify-center group-active:scale-90"
                    >
                        <div className="w-2 h-2 bg-blue-500 rounded-sm opacity-0 group-hover:opacity-30 transition-opacity"></div>
                    </button>
                    <span className="text-[13px] leading-snug cursor-default flex-1 font-semibold text-gray-200 group-hover:text-white transition-colors" title={task.title}>
                        {task.title}
                    </span>
                </div>
                {timeLeft && (
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
    const [user, setUser] = useState(null);

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

    const toggleTask = async (id) => {
        const newTasks = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
        setTasks(newTasks);
        if (user) {
            // Use setDoc reliably
            await setDoc(doc(db, "users", user.uid), { tasks: newTasks }, { merge: true });
        } else {
            localStorage.setItem('todos', JSON.stringify(newTasks));
        }
    };

    // Filter today's active tasks
    const activeTasks = tasks.filter(t => t.date === today && !t.completed);

    const handleClose = () => {
        if (window.electronAPI && window.electronAPI.hideMiniWidget) {
            window.electronAPI.hideMiniWidget();
        } else {
            window.close();
        }
    };

    return (
        <div className="h-screen w-screen bg-slate-950/80 text-white rounded-3xl overflow-hidden flex flex-col border border-white/10 shadow-3xl backdrop-blur-2xl">
            {/* Draggable Header */}
            <div
                className="h-10 bg-white/5 flex justify-between items-center px-4 select-none"
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
                            {activeTasks.length}
                        </span>
                    </div>
                </div>

                {activeTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 opacity-30">
                        <div className="w-12 h-12 mb-3 bg-white/5 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <p className="text-[11px] text-center font-medium">{t('noTasks')}</p>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {activeTasks.map(task => (
                            <MiniTaskItem key={task.id} task={task} toggleTask={toggleTask} />
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="h-10 bg-black/40 border-t border-white/5 flex justify-between items-center px-4">
                <span className="text-[10px] font-black text-gray-500 tracking-tighter">{today}</span>
                <div className="flex items-center gap-1.5 bg-green-500/10 px-2 py-1 rounded-lg border border-green-500/20">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-[9px] font-bold text-green-500 uppercase">Live</span>
                </div>
            </div>

            {/* Resize Handle for Discoverability */}
            <div 
                className="absolute bottom-1 right-1 w-4 h-4 cursor-nwse-resize opacity-20 hover:opacity-100 transition-opacity flex items-end justify-end p-0.5 z-50"
                style={{ WebkitAppRegion: 'no-drag' }}
            >
                <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <line x1="22" y1="6" x2="6" y2="22" />
                    <line x1="22" y1="14" x2="14" y2="22" />
                </svg>
            </div>
        </div>
    );
}
