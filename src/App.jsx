import React, { useState, useEffect, useMemo } from 'react';
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
const AnalyticsModal = React.lazy(() => import('./components/AnalyticsModal'));
import GenericModal from './components/GenericModal';
import ClientAddressBook from './components/ClientAddressBook';
import InventoryManagement from './components/InventoryManagement';
import LabelPrinter from './components/LabelPrinter';
import StockTicker from './components/StockTicker';
import AppLockModal from './components/AppLockModal';
import PinVerifyModal from './components/PinVerifyModal';
import AdminDashboardModal from './components/AdminDashboardModal';
import RealtimeLockOverlay from './components/RealtimeLockOverlay';
import SystemAnnouncementModal from './components/SystemAnnouncementModal';
import NotesModal from './components/NotesModal';
import { hasAppLockPin } from './lib/appLock';
import { initializeApp } from 'firebase/app';
import { auth, db, secondaryAuth, secondaryDb, firebaseConfig } from './firebase';
import { signInWithCredential, signInWithEmailAndPassword, GoogleAuthProvider, signOut, onAuthStateChanged, getAuth } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, query, orderBy, limit, where, getDocs, deleteDoc, getDoc, getFirestore } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { useLanguage } from './contexts/LanguageContext';
import { useTheme } from './contexts/ThemeContext';
import Swal from 'sweetalert2';

function App() {
  const { t } = useLanguage();
  const { theme } = useTheme();
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
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isAppLockModalOpen, setIsAppLockModalOpen] = useState(false);
  const [isPinVerifyModalOpen, setIsPinVerifyModalOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
  const [systemConfig, setSystemConfig] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isTasksHidden, setIsTasksHidden] = useState(true);
  const [wallpaper, setWallpaperState] = useState(() => localStorage.getItem('app_wallpaper') || 'default');

  const checkShouldShowAnnouncement = (ann) => {
    if (!ann || !ann.active) return false;

    // 1. Check TTL: 24 Hours (86,400,000 ms)
    const createdAtTime = ann.createdAt ? new Date(ann.createdAt).getTime() : (ann.updatedAt ? new Date(ann.updatedAt).getTime() : 0);
    if (createdAtTime > 0) {
      const hoursPassed = (Date.now() - createdAtTime) / (1000 * 60 * 60);
      if (hoursPassed > 24) {
        return false; // Expired after 24 hours
      }
    }

    // 2. Check Single-Show Dismissal
    const annKey = ann.id || ann.updatedAt || ann.title;
    try {
      const dismissed = JSON.parse(localStorage.getItem('jinil_dismissed_announcements') || '[]');
      if (dismissed.includes(annKey)) {
        return false; // Already dismissed by user
      }
    } catch (e) {
      console.warn("Read dismissed announcements error:", e);
    }

    return true;
  };

  const DEFAULT_DAILY_ALARMS = [
    { id: 'alarm_12', time: '12:00', title: '점심 식사 시간입니다! 🍱', active: true },
    { id: 'alarm_17', time: '17:00', title: '택배 발송 시간입니다! 📦', active: true }
  ];
  const [dailyAlarms, setDailyAlarms] = useState(DEFAULT_DAILY_ALARMS);

  // Realtime System Config Listener (Global Remote Lock & Announcements) + Local Fallback
  useEffect(() => {
    const syncLocalConfig = () => {
      try {
        const saved = localStorage.getItem('jinil_app_control');
        if (saved) {
          const data = JSON.parse(saved);
          setSystemConfig(prev => ({ ...prev, ...data }));
          if (data.announcement && checkShouldShowAnnouncement(data.announcement)) {
            setIsAnnouncementOpen(true);
          }
        }
      } catch (e) {
        console.warn("Local config sync error:", e);
      }
    };

    syncLocalConfig();
    window.addEventListener('jinil_config_updated', syncLocalConfig);
    window.addEventListener('storage', syncLocalConfig);

    const unsubConfig = onSnapshot(doc(db, "system_config", "app_control"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSystemConfig(data);
        if (data.announcement && checkShouldShowAnnouncement(data.announcement)) {
          setIsAnnouncementOpen(true);
        }
      }
    }, (err) => console.error("System config error:", err));

    return () => {
      window.removeEventListener('jinil_config_updated', syncLocalConfig);
      window.removeEventListener('storage', syncLocalConfig);
      unsubConfig();
    };
  }, []);

  // Listen for Dynamic Daily Alarms from Firestore & Local Storage
  useEffect(() => {
    const syncLocalAlarms = () => {
      try {
        const saved = localStorage.getItem('jinil_daily_alarms');
        if (saved) {
          setDailyAlarms(JSON.parse(saved));
        }
      } catch (e) {
        console.warn("Local alarms sync error:", e);
      }
    };
    syncLocalAlarms();
    window.addEventListener('jinil_alarms_updated', syncLocalAlarms);

    const unsubAlarms = onSnapshot(doc(db, "system_config", "daily_alarms"), (docSnap) => {
      if (docSnap.exists() && Array.isArray(docSnap.data().alarms)) {
        setDailyAlarms(docSnap.data().alarms);
      }
    }, (err) => console.warn("Daily alarms firestore error:", err));

    return () => {
      window.removeEventListener('jinil_alarms_updated', syncLocalAlarms);
      unsubAlarms();
    };
  }, []);

  // Realtime User Profile Listener & Sync
  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      return;
    }

    const isPc5Admin = user.email === 'pc5@gmail.com';
    const userKey = user.email ? user.email.toLowerCase().trim() : user.uid;
    const userDocRef = doc(db, "users", userKey);

    const syncProfile = async () => {
      try {
        const snap = await getDoc(userDocRef);
        const emailVal = user.email || `${userKey}`;
        const aliasVal = user.displayName || (user.email ? user.email.split('@')[0] : 'User');

        if (!snap.exists()) {
          await setDoc(userDocRef, {
            email: emailVal,
            alias: aliasVal,
            role: isPc5Admin ? 'admin' : 'user',
            isPaid: isPc5Admin ? true : false,
            status: 'active',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
          });
        } else {
          const updates = { 
            email: emailVal,
            lastLogin: new Date().toISOString() 
          };
          if (isPc5Admin) {
            updates.role = 'admin';
            updates.isPaid = true;
          }
          await setDoc(userDocRef, updates, { merge: true });
        }
      } catch (e) {
        console.error("Sync profile error:", e);
      }
    };
    syncProfile();

    const unsubProfile = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserProfile(docSnap.data());
      }
    });

    return () => unsubProfile();
  }, [user]);

  // Compute Lock State
  const isPc5Admin = user?.email === 'pc5@gmail.com' || userProfile?.role === 'admin';
  
  let isAppLocked = false;
  let lockReason = '';
  let lockMessage = '';

  if (systemConfig?.globalLock) {
    isAppLocked = true;
    lockReason = '원격 실시간 시스템 차단';
    lockMessage = systemConfig.globalLockMessage || '원격 실시간 차단 모드가 활성화되었습니다. 관리자에게 문의하세요.';
  } else if (userProfile && userProfile.status === 'blocked') {
    isAppLocked = true;
    lockReason = '계정 차단됨';
    lockMessage = '해당 계정은 관리자에 의해 원격 차단되었습니다. pc5@gmail.com 관리자에게 문의하세요.';
  } else if (systemConfig?.requirePaidAccess && userProfile && !userProfile.isPaid && !isPc5Admin) {
    isAppLocked = true;
    lockReason = '유료 회원 승인 필요';
    lockMessage = '유료 회원 전용 서비스입니다. 이용 승인을 위해 pc5@gmail.com 관리자에게 문의하세요.';
  }

  const setWallpaper = (newWp) => {
    setWallpaperState(newWp);
    localStorage.setItem('app_wallpaper', newWp);
  };

  // Global Keyboard Shortcut: Alt + N or Ctrl + Shift + N to Toggle Notes Modal
  useEffect(() => {
    const handleGlobalShortcuts = (e) => {
      const isAltN = e.altKey && (e.key === 'n' || e.key === 'N' || e.code === 'KeyN');
      const isCtrlShiftN = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'n' || e.key === 'N' || e.code === 'KeyN');

      if (isAltN || isCtrlShiftN) {
        e.preventDefault();
        setIsNotesOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, []);

  const getWallpaperStyle = () => {
    const isDark = theme === 'dark';
    switch (wallpaper) {
      case 'blue':
        return {
          background: isDark
            ? 'linear-gradient(135deg, #0b0f19 0%, #0c2d48 55%, #0369a1 100%)'
            : 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 48%, #bae6fd 100%)'
        };
      case 'yellow':
        return {
          background: isDark
            ? 'linear-gradient(135deg, #0c0a09 0%, #291807 55%, #592404 100%)'
            : 'linear-gradient(135deg, #fffdfa 0%, #fef3c7 46%, #fed7aa 100%)'
        };
      case 'green':
        return {
          background: isDark
            ? 'linear-gradient(135deg, #021a12 0%, #063d2f 55%, #065f46 100%)'
            : 'linear-gradient(135deg, #f8fcf9 0%, #e6f7ec 46%, #bbf7d0 100%)'
        };
      case 'purple':
        return {
          background: isDark
            ? 'linear-gradient(135deg, #090614 0%, #1f0d3d 55%, #3b0764 100%)'
            : 'linear-gradient(135deg, #fcfaff 0%, #f3e8ff 48%, #ddd6fe 100%)'
        };
      case 'pink':
        return {
          background: isDark
            ? 'linear-gradient(135deg, #15050a 0%, #3f0919 55%, #5c0722 100%)'
            : 'linear-gradient(135deg, #fffafb 0%, #ffe4e6 48%, #fecdd3 100%)'
        };
      case 'vietnam':
        return {
          background: isDark
            ? 'linear-gradient(135deg, #180505 0%, #3b0a0a 45%, #541d08 80%, #203518 100%)'
            : 'linear-gradient(135deg, #fffdf5 0%, #fee2e2 38%, #fed7aa 72%, #fef3c7 100%)'
        };
      case 'korea':
        return {
          background: isDark
            ? 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 52%, #1e1b4b 100%)'
            : 'linear-gradient(135deg, #f8fafc 0%, #dbeafe 52%, #93c5fd 100%)'
        };
      case 'futureCat':
        return {
          background: isDark
            ? 'linear-gradient(135deg, #030d1a 0%, #0a2540 55%, #0c4a6e 100%)'
            : 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 38%, #bae6fd 74%, #dbeafe 100%)'
        };
      default:
        if (wallpaper && (wallpaper.startsWith('data:') || wallpaper.startsWith('http://') || wallpaper.startsWith('https://'))) {
          return {
            backgroundImage: `url("${wallpaper}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed'
          };
        }
        return {};
    }
  };

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

  // Sync UID to saved accounts when user changes and listen for custom alias updates
  useEffect(() => {
    const reloadAccounts = () => {
      try {
        const accs = JSON.parse(localStorage.getItem('jinil_saved_accounts') || '[]');
        if (user) {
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
        } else {
          setSavedAccounts(accs);
        }
      } catch (e) {
        setSavedAccounts([]);
      }
    };

    reloadAccounts();
    window.addEventListener('jinil_accounts_updated', reloadAccounts);
    window.addEventListener('storage', reloadAccounts);

    return () => {
      window.removeEventListener('jinil_accounts_updated', reloadAccounts);
      window.removeEventListener('storage', reloadAccounts);
    };
  }, [user?.uid]);

  // Effect 2: Handle Task Synchronization (User-specific)
  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    const userTodoKey = `todos_${user.uid}`;
    
    const unsubStore = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const cloudTasks = docSnap.data().tasks || [];
        setTasks(cloudTasks);
        localStorage.setItem(userTodoKey, JSON.stringify(cloudTasks));
      } else {
        const saved = localStorage.getItem(userTodoKey);
        const localTasks = saved ? JSON.parse(saved) : [];
        setTasks(localTasks);
        if (localTasks.length > 0) {
          setDoc(doc(db, "users", user.uid), { tasks: localTasks });
        }
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

  const performPrivacyToggle = (newState) => {
    setIsTasksHidden(newState);
    try {
      const channel = new BroadcastChannel('jinil_privacy_sync');
      channel.postMessage({ isHidden: newState });
      channel.close();
    } catch (e) {}
  };

  const togglePrivacyHidden = (targetState) => {
    const newState = typeof targetState === 'boolean' ? targetState : !isTasksHidden;
    // If target state is to UNHIDE tasks (newState === false), check if PIN is configured
    if (!newState) {
      if (hasAppLockPin()) {
        setIsPinVerifyModalOpen(true);
      } else {
        performPrivacyToggle(false);
      }
    } else {
      performPrivacyToggle(true);
    }
  };

  const updateTasks = async (newTasks) => {
    setTasks(newTasks);
    if (user) {
      const userTodoKey = `todos_${user.uid}`;
      localStorage.setItem(userTodoKey, JSON.stringify(newTasks));
      await setDoc(doc(db, "users", user.uid), { tasks: newTasks });
    }
    try {
      const channel = new BroadcastChannel('jinil_task_sync');
      channel.postMessage({ type: 'TASKS_UPDATED', tasks: newTasks, uid: user?.uid });
      channel.close();
    } catch (e) {}
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

  const assignTaskToUser = async (targetIdOrEmail, task) => {
    const targetAcc = savedAccounts.find(a => (a.uid && a.uid === targetIdOrEmail) || a.email === targetIdOrEmail);
    if (!targetAcc) {
      console.error("Target account not found");
      return;
    }
    const targetName = targetAcc?.alias || targetAcc?.email?.split('@')[0] || '직원';
    const myName = user?.email?.split('@')[0] || '나';

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

      // Sign in as target user on secondary Firebase app to get their real UID & write access
      const userCred = await signInWithEmailAndPassword(secondaryAuth, targetAcc.email, atob(targetAcc.p));
      const realTargetUid = userCred.user.uid;

      // Update cached UID in savedAccounts if missing
      if (!targetAcc.uid) {
        targetAcc.uid = realTargetUid;
        try {
          const accs = JSON.parse(localStorage.getItem('jinil_saved_accounts') || '[]');
          const updatedAccs = accs.map(a => a.email === targetAcc.email ? { ...a, uid: realTargetUid } : a);
          localStorage.setItem('jinil_saved_accounts', JSON.stringify(updatedAccs));
          setSavedAccounts(updatedAccs);
        } catch (e) {}
      }

      // Enhance task with assignment metadata
      const enhancedTask = {
        ...task,
        assignedByUid: user?.uid,
        assignedByName: myName,
        assigneeUid: realTargetUid,
        assigneeName: targetName,
        assigneeEmail: targetAcc.email
      };

      // Read & write using secondary Firestore (authenticated as target user)
      const userDocRef = doc(secondaryDb, "users", realTargetUid);
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
      
      const targetAcc = savedAccounts.find(a => (a.uid && a.uid === targetUid) || a.email === targetUid);
      const targetName = targetAcc?.alias || targetAcc?.email?.split('@')[0] || '직원';
      const myName = user?.email?.split('@')[0] || '나';

      const enhancedForOwner = {
        ...newTask,
        assignedByUid: user.uid,
        assignedByName: myName,
        assigneeUid: targetAcc?.uid || targetUid,
        assigneeName: targetName,
        assigneeEmail: targetAcc?.email
      };
      updateTasks([enhancedForOwner, ...tasks]);
    } else {
      updateTasks([newTask, ...tasks]);
    }
  };

  // Helper for cross-user updates (toggle/delete patrolled tasks)
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
    
    if (!targetUid && !targetEmail) return false; // Not a patrolled task
    
    const targetAcc = savedAccounts.find(a => (a.uid && a.uid === targetUid) || (a.email && a.email === targetEmail));
    if (!targetAcc?.p) return true; // Handled but failed to auth

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

  // Aggregate current user's tasks with patrolled tasks assigned by them, deduplicated by ID
  const allMergedTasks = useMemo(() => {
    const taskMap = new Map();
    const addOrMergeTask = (t) => {
      if (!t || !t.id) return;
      if (taskMap.has(t.id)) {
        const existing = taskMap.get(t.id);
        // Smart merge: if either version has completed true, reflect completion immediately
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

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;

      // 1. Kiểm tra Daily Alarms động từ Admin Dashboard
      const activeAlarms = dailyAlarms.filter(a => a.active);
      const alarmToFire = activeAlarms.find(a => a.time === currentTimeStr);
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
      <div 
        className="flex-1 bg-gray-50 dark:bg-gray-900 flex justify-center py-6 px-4 transition-all duration-300"
        style={getWallpaperStyle()}
      >
        <React.Suspense fallback={null}>
          <AnalyticsModal 
            isOpen={isAnalyticsOpen} 
            onClose={() => setIsAnalyticsOpen(false)} 
            tasks={tasks} 
          />
        </React.Suspense>
      <div className="w-full max-w-[1400px] flex flex-col lg:flex-row gap-6 justify-center">
        {/* Left Column: Calendar & News */}
        <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-6">
          <CalendarSidebar
            tasks={allMergedTasks}
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
            wallpaper={wallpaper}
            setWallpaper={setWallpaper}
            onOpenAppLock={() => setIsAppLockModalOpen(true)}
            user={user}
            userRole={userProfile?.role}
            onOpenAdminDashboard={() => setIsAdminDashboardOpen(true)}
          />

          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">
              {selectedDate && !searchTerm ? `${t('tasksForDate')} ${selectedDate.split('-').reverse().join('/')} ` : searchTerm ? t('searchPlaceholder') + ` "${searchTerm}"` : t('allTasksTitle')}
            </h2>
            {selectedDate && !searchTerm && (
              <button
                onClick={() => setSelectedDate(null)}
                className="text-sm font-bold text-blue-600 hover:text-blue-800 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:text-blue-200 border border-transparent dark:border-blue-800/50 px-3 py-1.5 rounded-lg cursor-pointer"
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
              onClick={() => togglePrivacyHidden()}
              title={isTasksHidden ? "작업 목록 보기" : "작업 목록 숨기기"}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all duration-200 whitespace-nowrap cursor-pointer ${
                isTasksHidden
                  ? 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                  : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'
              }`}
            >
              <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] ${isTasksHidden ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xs' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300'}`}>
                {isTasksHidden ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <span>{isTasksHidden ? "숨김 해제" : "숨기기"}</span>
            </button>
            <button
              onClick={() => setSortByPriority(prev => !prev)}
              title="우선순위 정렬"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 whitespace-nowrap cursor-pointer ${
                sortByPriority
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-300 shadow-xs font-bold'
                  : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
              우선순위
            </button>
          </div>
          <TaskList tasks={filteredTasks} onToggle={toggleTask} onDelete={deleteTask} savedAccounts={savedAccounts} isHidden={isTasksHidden} onToggleHidden={() => togglePrivacyHidden(false)} />
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
            user={user}
            selectedDate={selectedDate}
            deliveryCount={deliveryCount}
            deliveries={deliveryData}
            onOpenClients={() => setIsClientsOpen(true)}
            onOpenInventory={() => setIsInventoryOpen(true)}
            onOpenLabelPrint={() => setIsLabelPrintOpen(true)}
            onOpenNotes={() => setIsNotesOpen(true)}
          />
        </div>
      </div>
      </div>

      <NotesModal
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        user={user}
      />

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

      <AppLockModal
        isOpen={isAppLockModalOpen}
        onClose={() => setIsAppLockModalOpen(false)}
      />

      <PinVerifyModal
        isOpen={isPinVerifyModalOpen}
        onClose={() => setIsPinVerifyModalOpen(false)}
        onSuccess={() => {
          setIsPinVerifyModalOpen(false);
          performPrivacyToggle(false);
        }}
      />

      {/* Admin Dashboard Modal */}
      <AdminDashboardModal
        isOpen={isAdminDashboardOpen}
        onClose={() => setIsAdminDashboardOpen(false)}
        currentUser={user}
      />

      {/* Broadcast Popup Announcement Modal */}
      <SystemAnnouncementModal
        isOpen={isAnnouncementOpen}
        announcement={systemConfig?.announcement}
        onClose={() => setIsAnnouncementOpen(false)}
      />

      {/* Realtime App Lock / Remote Ban Overlay */}
      <RealtimeLockOverlay
        isLocked={isAppLocked}
        lockReason={lockReason}
        message={lockMessage}
        userEmail={user?.email}
        onOpenAdminDashboard={() => setIsAdminDashboardOpen(true)}
      />
    </div>
  );
}

export default App;
