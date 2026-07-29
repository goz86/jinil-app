import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ProgressBar from './components/ProgressBar';
import TaskInput from './components/TaskInput';
import TaskFilter from './components/TaskFilter';
import TaskList from './components/TaskList';
import CalendarSidebar from './components/CalendarSidebar';
import KoreanNewsWidget from './components/KoreanNewsWidget';
import MarketDeliveryTabs from './components/MarketDeliveryTabs';
import AuthWidget from './components/AuthWidget';
import DeliveryGallery from './components/DeliveryGallery';
import AnalyticsModal from './components/AnalyticsModal';
import GenericModal from './components/GenericModal';
import ClientAddressBook from './components/ClientAddressBook';
import InventoryManagement from './components/InventoryManagement';
import LabelPrinter from './components/LabelPrinter';
import StockTicker from './components/StockTicker';
import { initializeApp } from 'firebase/app';
import { auth, db, secondaryAuth, secondaryDb, firebaseConfig } from './firebase';
import { signInWithCredential, signInWithEmailAndPassword, GoogleAuthProvider, signOut, onAuthStateChanged, getAuth } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, query, orderBy, limit, where, getDocs, deleteDoc, getDoc, getFirestore } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { useLanguage } from './contexts/LanguageContext';
import Swal from 'sweetalert2';

function App() {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState([]);
  const [patrolledTasks, setPatrolledTasks] = useState({}); // { [uid]: Task[] }
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortByPriority, setSortByPriority] = useState(false);
  // Use local date (YYYY-MM-DD) instead of UTC to avoid "previous day" issues at night
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isClientsOpen, setIsClientsOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isLabelPrintOpen, setIsLabelPrintOpen] = useState(false);

  // Auto-update selectedDate when the calendar day changes (at midnight)
  useEffect(() => {
    const interval = setInterval(() => {
      const today = getLocalDateString();
      if (selectedDate !== today) {
        // Only auto-update if nothing was manually selected or if it's the start of a new day
        const now = new Date();
        if (now.getHours() === 0 && now.getMinutes() === 0) {
          setSelectedDate(today);
        }
      }
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [selectedDate]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [deliveryData, setDeliveryData] = useState([]);
  const [savedAccounts, setSavedAccounts] = useState([]);

  useEffect(() => {
    if (!user) {
      setDeliveryData([]);
      return;
    }
    let isInitialLoad = true;

    // Listen for global deliveries
    const qDeliveries = query(
      collection(db, "deliveries"), 
      orderBy("timestamp", "desc")
    );
    const unsubDeliveries = onSnapshot(qDeliveries, (snapshot) => {
      setDeliveryData(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));

      if (isInitialLoad) {
        isInitialLoad = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" && !change.doc.metadata.hasPendingWrites) {
          const newData = change.doc.data();
          const title = t('newUpload');
          const text = `${t('invoice')}: ${newData.barcode || newData.trackingNumber || 'N/A'}`;

          Swal.fire({
            icon: 'info',
            title: title,
            text: text,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
          });

          if (window.electronAPI && window.electronAPI.showNotification) {
            window.electronAPI.showNotification(title, text);
            if (window.electronAPI.flashFrame) {
              window.electronAPI.flashFrame(true);
            }
          }
        }
      });
    }, (error) => {
      console.error("Delivery data error:", error);
    });
    return () => unsubDeliveries();
  }, [user]);

  useEffect(() => {
    const cleanupOldDeliveries = async () => {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const q = query(
        collection(db, "deliveries"),
        where("timestamp", "<", sixtyDaysAgo)
      );

      try {
        const snapshot = await getDocs(q);
        for (const document of snapshot.docs) {
          const data = document.data();
          
          // 1. Try to delete the associated image from Storage
          if (data.imagePath || data.imageUrl) {
            try {
              let storageRef;
              if (data.imagePath) {
                storageRef = ref(storage, data.imagePath);
              } else if (data.imageUrl && data.imageUrl.includes('firebasestorage.googleapis.com')) {
                // Legacy fallback: extract path from URL
                const decodedUrl = decodeURIComponent(data.imageUrl);
                const pathPart = decodedUrl.split('/o/')[1]?.split('?')[0];
                if (pathPart) storageRef = ref(storage, pathPart);
              }

              if (storageRef) {
                await deleteObject(storageRef);
              }
            } catch (storageErr) {
              // Ignore if already deleted or path invalid
              console.warn("Auto-cleanup storage error:", storageErr);
            }
          }

          // 2. Delete the Firestore document
          await deleteDoc(doc(db, "deliveries", document.id));
        }
      } catch (error) {
        console.error("Cleanup error:", error);
      }
    };

    cleanupOldDeliveries();
  }, []);

  const deliveryCount = !selectedDate
    ? deliveryData.length
    : deliveryData.filter(item => {
      let itemDateStr;
      if (!item.timestamp) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        itemDateStr = `${year}-${month}-${day}`;
      } else {
        const date = item.timestamp.toDate ? item.timestamp.toDate() : new Date(item.timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        itemDateStr = `${year}-${month}-${day}`;
      }
      return itemDateStr === selectedDate;
    }).length;

  // Effect 1: Handle Authentication State
  useEffect(() => {
    const timeoutId = setTimeout(() => setLoading(false), 2000);
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      clearTimeout(timeoutId);
      setUser(currentUser);
      if (!currentUser) {
        setTasks([]);
        setLoading(false);
      }
    }, (error) => {
      clearTimeout(timeoutId);
      console.error("Auth error:", error);
      setLoading(false);
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  // Sync UID to saved accounts when user changes
  useEffect(() => {
    if (user) {
      try {
        const accs = JSON.parse(localStorage.getItem('jinil_saved_accounts') || '[]');
        let updated = false;
        const newAccs = accs.map(a => {
          if (a.email === user.email && a.uid !== user.uid) {
            updated = true;
            return { ...a, uid: user.uid };
          }
          return a;
        });
        if (updated) {
          localStorage.setItem('jinil_saved_accounts', JSON.stringify(newAccs));
        }
        setSavedAccounts(newAccs);
      } catch (e) {
        setSavedAccounts([]);
      }
    } else {
      try {
        const accs = JSON.parse(localStorage.getItem('jinil_saved_accounts') || '[]');
        setSavedAccounts(accs);
      } catch (e) {
        setSavedAccounts([]);
      }
    }
  }, [user?.uid]);

  // Effect 2: Handle Task Synchronization (User-specific)
  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    const userTodoKey = `todos_${user.uid}`;
    let isFirstSnapshot = true;
    
    const unsubStore = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const cloudTasks = docSnap.data().tasks || [];
        
        if (isFirstSnapshot) {
          isFirstSnapshot = false;
          const saved = localStorage.getItem(userTodoKey);
          const localTasks = saved ? JSON.parse(saved) : [];
          
          if (localTasks.length > 0) {
            const cloudIds = new Set(cloudTasks.map(t => t.id));
            const localOnly = localTasks.filter(t => !cloudIds.has(t.id));
            const merged = [...localOnly, ...cloudTasks];
            setTasks(merged);
            localStorage.setItem(userTodoKey, JSON.stringify(merged));
            setDoc(doc(db, "users", user.uid), { tasks: merged });
          } else {
            setTasks(cloudTasks);
            localStorage.setItem(userTodoKey, JSON.stringify(cloudTasks));
          }
        } else {
          setTasks(cloudTasks);
          localStorage.setItem(userTodoKey, JSON.stringify(cloudTasks));
        }
      } else {
        const saved = localStorage.getItem(userTodoKey);
        const localTasks = saved ? JSON.parse(saved) : [];
        setTasks(localTasks);
        setDoc(doc(db, "users", user.uid), { tasks: localTasks });
      }
      setLoading(false);
    }, (error) => {
      console.error("Firestore tasks error:", error);
      setLoading(false);
    });

    return () => unsubStore();
  }, [user?.uid]);

  // Effect 3: Handle Automatic Patrol (Listening to assigned tasks from other accounts)
  useEffect(() => {
    if (!user || !savedAccounts.length) return;

    const unsubscribers = {};
    const dynamicApps = {};

    savedAccounts.forEach(acc => {
      // Don't listen to our own account
      if (acc.uid && acc.p && acc.uid !== user.uid) {
        const appName = `patrol_${acc.uid}`;
        try {
          let patrolApp;
          try {
            patrolApp = initializeApp(firebaseConfig, appName);
          } catch (e) {
            // App might already exist if we re-render
            patrolApp = initializeApp(firebaseConfig, `${appName}_${Date.now()}`);
          }
          const patrolAuth = getAuth(patrolApp);
          const patrolDb = getFirestore(patrolApp);

          signInWithEmailAndPassword(patrolAuth, acc.email, atob(acc.p)).then(() => {
            const unsub = onSnapshot(doc(patrolDb, "users", acc.uid), (docSnap) => {
              if (docSnap.exists()) {
                const accTasks = docSnap.data().tasks || [];
                // Only keep tasks assigned by the current user
                const assignedTasks = accTasks.filter(t => t.assignedByUid === user.uid);
                setPatrolledTasks(prev => ({ ...prev, [acc.uid]: assignedTasks }));
              }
            });
            unsubscribers[appName] = unsub;
          }).catch(err => console.error(`Patrol auth failed for ${acc.email}`, err));
          
          dynamicApps[appName] = patrolApp;
        } catch (e) {
          console.error(`Failed to initialize patrol app for ${acc.email}`, e);
        }
      }
    });

    return () => {
      Object.values(unsubscribers).forEach(unsub => unsub && unsub());
    };
  }, [user?.uid, savedAccounts]);

  const updateTasks = async (newTasks) => {
    setTasks(newTasks);
    if (user) {
      const userTodoKey = `todos_${user.uid}`;
      localStorage.setItem(userTodoKey, JSON.stringify(newTasks));
      await setDoc(doc(db, "users", user.uid), { tasks: newTasks });
    }
  };

  const handleLogin = async () => {
    try {
      if (window.chrome && chrome.identity) {
        chrome.identity.getAuthToken({ interactive: true }, async function (token) {
          if (chrome.runtime.lastError || !token) {
            console.error(chrome.runtime.lastError);
            alert(t('loginFailPerm'));
            return;
          }
          const credential = GoogleAuthProvider.credential(null, token);
          await signInWithCredential(auth, credential);
        });
      } else {
        // Fallback: Email/Password login for web/android
        handleEmailLogin();
      }
    } catch (error) {
      console.error("Login failed", error);
      alert(t('loginFailGeneric') + error.message);
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setLoginError(t('emailPassRequired'));
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
      
      // Save for Multi-Account Switcher (Base64 encoded for basic obfuscation)
      const savedAccs = JSON.parse(localStorage.getItem('jinil_saved_accounts') || '[]');
      const existingAcc = savedAccs.find(a => a.email === email.trim());
      const newAcc = { email: email.trim(), p: btoa(password.trim()), uid: userCredential.user.uid };
      if (existingAcc?.alias) newAcc.alias = existingAcc.alias;
      const filtered = savedAccs.filter(a => a.email !== newAcc.email);
      filtered.push(newAcc);
      localStorage.setItem('jinil_saved_accounts', JSON.stringify(filtered));
      setSavedAccounts(filtered);

      setEmail('');
      setPassword('');
    } catch (error) {
      console.error("Email login failed", error);
      setLoginError(t('invalidEmailPass'));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSwitchAccount = async (switchEmail, switchPassword) => {
    setLoginLoading(true);
    setLoginError('');
    try {
      if (user) await signOut(auth); // Sign out current active user
      const userCredential = await signInWithEmailAndPassword(auth, switchEmail, switchPassword);
      // Update uid for switched account
      const savedAccs = JSON.parse(localStorage.getItem('jinil_saved_accounts') || '[]');
      const updatedAccs = savedAccs.map(a => a.email === switchEmail ? { ...a, uid: userCredential.user.uid } : a);
      localStorage.setItem('jinil_saved_accounts', JSON.stringify(updatedAccs));
      setSavedAccounts(updatedAccs);
    } catch (e) {
      console.error("Switch failed", e);
      setLoginError("Lỗi đăng nhập: " + e.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      if (window.chrome && chrome.identity) {
        chrome.identity.clearAllCachedAuthTokens(() => {
          console.log("Cached tokens cleared");
        });
      }
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const assignTaskToUser = async (targetUid, task) => {
    const targetAcc = savedAccounts.find(a => a.uid === targetUid);
    const targetName = targetAcc?.alias || targetAcc?.email?.split('@')[0] || '직원';
    const myName = user?.email?.split('@')[0] || '나';

    // Enhance task with assignment metadata
    const enhancedTask = {
      ...task,
      assignedByUid: user?.uid,
      assignedByName: myName,
      assigneeUid: targetUid,
      assigneeName: targetName
    };

    // Show loading toast immediately so user gets instant feedback
    Swal.fire({
      title: `${targetName}에게 배정 중...`,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      didOpen: () => { Swal.showLoading(); }
    });

    try {
      if (!targetAcc?.p) throw new Error('No credentials for target user');

      // Sign in as target user on secondary Firebase app (doesn't affect main session)
      await signInWithEmailAndPassword(secondaryAuth, targetAcc.email, atob(targetAcc.p));

      // Read & write using secondary Firestore (authenticated as target user)
      const userDocRef = doc(secondaryDb, "users", targetUid);
      const userDocSnap = await getDoc(userDocRef);
      const existingTasks = userDocSnap.exists() ? (userDocSnap.data().tasks || []) : [];
      const newTasks = [enhancedTask, ...existingTasks];
      await setDoc(userDocRef, { tasks: newTasks });

      // Clean up secondary auth
      await signOut(secondaryAuth);

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
  };

  const addTask = (title, priority, time, targetUid) => {
    const newTask = {
      id: Date.now().toString(),
      title,
      priority: priority || 'Bình thường',
      time: time || '',
      date: selectedDate || new Date().toISOString().split('T')[0],
      completed: false,
      reminded: false,
    };
    if (targetUid && user && targetUid !== user.uid) {
      assignTaskToUser(targetUid, newTask);
    } else {
      updateTasks([newTask, ...tasks]);
    }
  };

  // Helper for cross-user updates (toggle/delete patrolled tasks)
  const modifyCrossUserTask = async (taskId, modifierFunc) => {
    // Find which patrolled array has it
    let targetUid = null;
    for (const [uid, pTasks] of Object.entries(patrolledTasks)) {
      const found = pTasks.find(t => t.id === taskId);
      if (found) {
        targetUid = uid;
        break;
      }
    }
    
    if (!targetUid) return false; // Not a patrolled task
    
    const targetAcc = savedAccounts.find(a => a.uid === targetUid);
    if (!targetAcc?.p) return true; // Handled but failed to auth

    try {
      await signInWithEmailAndPassword(secondaryAuth, targetAcc.email, atob(targetAcc.p));
      const userDocRef = doc(secondaryDb, "users", targetUid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const existingTasks = userDocSnap.data().tasks || [];
        const newTasks = modifierFunc(existingTasks);
        await setDoc(userDocRef, { tasks: newTasks });
      }
      await signOut(secondaryAuth);
    } catch (err) {
      console.error("Cross-user modification failed:", err);
    }
    return true; // Handled as patrolled task
  };

  const toggleTask = async (id) => {
    const isPatrolled = await modifyCrossUserTask(id, (existingTasks) => 
      existingTasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
    if (!isPatrolled) {
      const newTasks = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
      updateTasks(newTasks);
    }
  };

  const deleteTask = async (id) => {
    const isPatrolled = await modifyCrossUserTask(id, (existingTasks) => 
      existingTasks.filter((t) => t.id !== id)
    );
    if (!isPatrolled) {
      const newTasks = tasks.filter((t) => t.id !== id);
      updateTasks(newTasks);
    }
  };

  const priorityOrder = { urgent: 0, high: 1, 'Quan trọng': 1, 'CAO': 1, normal: 2, low: 3, 'Không quan trọng': 3 };

  // Aggregate current user's tasks with patrolled tasks assigned by them
  const allMergedTasks = useMemo(() => {
    const pTasksArray = Object.values(patrolledTasks).flat();
    return [...tasks, ...pTasksArray];
  }, [tasks, patrolledTasks]);

  const filteredTasks = allMergedTasks
    .filter((task) => {
      const matchesFilter = filter === 'active' ? !task.completed : filter === 'completed' ? task.completed : true;
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = (selectedDate && !searchTerm) ? task.date === selectedDate : true;
      return matchesFilter && matchesSearch && matchesDate;
    });

  if (sortByPriority) {
    filteredTasks.sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2));
  }

  // Stats calculation based on allMergedTasks for the selected date
  const todayMergedTasks = selectedDate ? allMergedTasks.filter(t => t.date === selectedDate) : allMergedTasks;
  const totalTasks = todayMergedTasks.length;
  const completedTasks = todayMergedTasks.filter(t => t.completed).length;

  const lastFiredAlarm = React.useRef(null);
  const DAILY_ALARMS = [
    { time: '12:00', title: '점심 식사 시간입니다! 🍱' },
    { time: '17:00', title: '택배 발송 시간입니다! 📦' }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;

      // 1. Kiểm tra Daily Alarms cố định
      const alarmToFire = DAILY_ALARMS.find(a => a.time === currentTimeStr);
      if (alarmToFire && lastFiredAlarm.current !== currentTimeStr) {
        if (window.electronAPI && window.electronAPI.showNotification) {
          window.electronAPI.showNotification('진일 알리미', alarmToFire.title);
        } else {
            Swal.fire({
                title: '알림',
                text: alarmToFire.title,
                icon: 'info',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 5000
            });
        }
        lastFiredAlarm.current = currentTimeStr;
      } else if (!alarmToFire && lastFiredAlarm.current) {
        // Reset khi qua phút đó
        lastFiredAlarm.current = null;
      }

      // 2. Kiểm tra Tasks
      let changed = false;
      const updatedTasks = tasks.map(task => {
        if (!task.completed && task.date === today && task.time === currentTimeStr && !task.reminded) {
          if (window.electronAPI && window.electronAPI.showNotification) {
            window.electronAPI.showNotification('진일 App - 알림', `작업 시간입니다: ${task.title}`);
          }
          changed = true;
          return { ...task, reminded: true };
        }
        return task;
      });

      if (changed) {
        updateTasks(updatedTasks);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [tasks]);

  if (loading) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center"><p className="text-gray-500 dark:text-gray-400">{t('loading')}</p></div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <StockTicker />
      <div className="flex-1 bg-gray-50 dark:bg-gray-900 flex justify-center py-6 px-4 transition-colors duration-300">
        <AnalyticsModal 
          isOpen={isAnalyticsOpen} 
          onClose={() => setIsAnalyticsOpen(false)} 
          tasks={tasks} 
        />
      <div className="w-full max-w-[1400px] flex flex-col lg:flex-row gap-6 justify-center">
        {/* Left Column: Calendar & News */}
        <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-6">
          <CalendarSidebar
            tasks={tasks}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
          />
          <KoreanNewsWidget />
        </div>

        {/* Center Column: Todo List */}
        <div className="flex-1 max-w-2xl w-full">
          <Header
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onOpenAnalytics={() => setIsAnalyticsOpen(true)}
          />

          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
              {selectedDate && !searchTerm ? `${t('tasksForDate')} ${selectedDate.split('-').reverse().join('/')} ` : searchTerm ? t('searchPlaceholder') + ` "${searchTerm}"` : t('allTasksTitle')}
            </h2>
            {selectedDate && !searchTerm && (
              <button
                onClick={() => setSelectedDate(null)}
                className="text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:text-blue-300 px-3 py-1.5 rounded-lg"
              >
                {t('viewAllDates')}
              </button>
            )}
          </div>

          <ProgressBar total={totalTasks} completed={completedTasks} />
          <TaskInput onAdd={addTask} savedAccounts={savedAccounts} currentUserEmail={user?.email} currentUserUid={user?.uid} />
          <div className="flex items-center gap-2 mb-6">
            <div className="flex-1">
              <TaskFilter filter={filter} setFilter={setFilter} />
            </div>
            <button
              onClick={() => setSortByPriority(prev => !prev)}
              title="우선순위 정렬"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 whitespace-nowrap ${
                sortByPriority
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-gray-300'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
              우선순위
            </button>
          </div>
          <TaskList tasks={filteredTasks} onToggle={toggleTask} onDelete={deleteTask} />
          <DeliveryGallery selectedDate={selectedDate} deliveries={deliveryData} />
        </div>

        {/* Right Column: Market / Delivery Tabs */}
        <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-0">
          <AuthWidget
            user={user}
            onLogin={handleLogin}
            onLogout={handleLogout}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            onEmailLogin={handleEmailLogin}
            loginLoading={loginLoading}
            loginError={loginError}
            onSwitchAccount={handleSwitchAccount}
          />
          <MarketDeliveryTabs
            selectedDate={selectedDate}
            deliveryCount={deliveryCount}
            deliveries={deliveryData}
            onOpenClients={() => setIsClientsOpen(true)}
            onOpenInventory={() => setIsInventoryOpen(true)}
            onOpenLabelPrint={() => setIsLabelPrintOpen(true)}
          />
        </div>
      </div>
      </div>

      <GenericModal 
        isOpen={isClientsOpen} 
        onClose={() => setIsClientsOpen(false)} 
        title={t('clientAddressBook')}
      >
        <ClientAddressBook user={user} />
      </GenericModal>

      <GenericModal 
        isOpen={isInventoryOpen} 
        onClose={() => setIsInventoryOpen(false)} 
        title={t('inventoryManagement')}
      >
        <InventoryManagement user={user} />
      </GenericModal>

      <GenericModal 
        isOpen={isLabelPrintOpen} 
        onClose={() => setIsLabelPrintOpen(false)} 
        title={t('labelPrinting')}
      >
        <LabelPrinter user={user} />
      </GenericModal>
    </div>
  );
}

export default App;
