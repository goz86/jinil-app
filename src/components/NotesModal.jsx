import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { db, auth } from '../firebase';
import { 
    collection, 
    query, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    serverTimestamp,
    orderBy 
} from 'firebase/firestore';
import { useLanguage } from '../contexts/LanguageContext';
import Swal from 'sweetalert2';

// Standardized Modern Minimalist SVG Icons (Taste-Skill Compliant, strokeWidth 2.0)
const Icons = {
    all: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
    ),
    pinned: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
    ),
    client: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
    ),
    account: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
    ),
    general: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    ),
    todo: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
    ),
    copy: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
    ),
    check: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
    ),
    plus: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
    ),
    search: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
    ),
    trash: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
    ),
    externalLink: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
    ),
    chevronDown: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
    ),
    close: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    )
};

export default function NotesModal({ isOpen, onClose, user }) {
    const { t } = useLanguage();
    
    // Notes list from Firebase
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNoteId, setSelectedNoteId] = useState(null);
    
    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    
    // Active Note Form State
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('general');
    const [isPinned, setIsPinned] = useState(false);
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientAddress, setClientAddress] = useState('');
    const [accountUsername, setAccountUsername] = useState('');
    const [accountPassword, setAccountPassword] = useState('');
    const [accountUrl, setAccountUrl] = useState('');
    const [content, setContent] = useState('');
    const [checklist, setChecklist] = useState([]);
    const [newTodoText, setNewTodoText] = useState('');
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    
    // UI utilities state
    const [showPassword, setShowPassword] = useState(false);
    const [copiedField, setCopiedField] = useState(null);
    const [saveStatus, setSaveStatus] = useState(''); // 'saving', 'saved', ''
    const [isSaving, setIsSaving] = useState(false);
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    
    const categoryDropdownRef = useRef(null);
    const autoSaveTimerRef = useRef(null);
    const isInitialLoadRef = useRef(true);

    const currentUserEmail = user?.email || auth?.currentUser?.email || 'Jinil Team';

    // Close category dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target)) {
                setIsCategoryDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 1. Subscribe to Firestore `shared_notes` collection
    useEffect(() => {
        if (!isOpen) return;

        setLoading(true);
        const q = query(collection(db, 'shared_notes'), orderBy('updatedAt', 'desc'));
        
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const fetchedNotes = snapshot.docs.map((docSnap) => ({
                    id: docSnap.id,
                    ...docSnap.data()
                }));
                
                fetchedNotes.sort((a, b) => {
                    if (a.isPinned && !b.isPinned) return -1;
                    if (!a.isPinned && b.isPinned) return 1;
                    const timeA = a.updatedAt?.toMillis?.() || (a.updatedAt ? new Date(a.updatedAt).getTime() : 0);
                    const timeB = b.updatedAt?.toMillis?.() || (b.updatedAt ? new Date(b.updatedAt).getTime() : 0);
                    return timeB - timeA;
                });

                setNotes(fetchedNotes);
                setLoading(false);

                setSelectedNoteId((prevId) => {
                    if (!prevId && fetchedNotes.length > 0) return fetchedNotes[0].id;
                    if (prevId && !fetchedNotes.some(n => n.id === prevId) && fetchedNotes.length > 0) return fetchedNotes[0].id;
                    return prevId;
                });
            },
            (error) => {
                console.error("Failed to sync shared notes:", error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [isOpen]);

    // 2. Populate form when selected note changes
    useEffect(() => {
        if (!selectedNoteId) {
            setTitle('');
            setCategory('general');
            setIsPinned(false);
            setClientName('');
            setClientPhone('');
            setClientAddress('');
            setAccountUsername('');
            setAccountPassword('');
            setAccountUrl('');
            setContent('');
            setChecklist([]);
            setTags([]);
            setShowPassword(false);
            return;
        }

        const note = notes.find((n) => n.id === selectedNoteId);
        if (note) {
            isInitialLoadRef.current = true;
            setTitle(note.title || '');
            setCategory(note.category || 'general');
            setIsPinned(!!note.isPinned);
            setClientName(note.clientName || '');
            setClientPhone(note.clientPhone || '');
            setClientAddress(note.clientAddress || '');
            setAccountUsername(note.accountUsername || '');
            setAccountPassword(note.accountPassword || '');
            setAccountUrl(note.accountUrl || '');
            setContent(note.content || '');
            setChecklist(Array.isArray(note.checklist) ? note.checklist : []);
            setTags(Array.isArray(note.tags) ? note.tags : []);
            setShowPassword(false);
            
            setTimeout(() => {
                isInitialLoadRef.current = false;
            }, 100);
        }
    }, [selectedNoteId, notes]);

    // 3. Filter notes based on activeCategory & searchQuery
    const filteredNotes = useMemo(() => {
        return notes.filter((note) => {
            if (activeCategory === 'pinned' && !note.isPinned) return false;
            if (activeCategory !== 'all' && activeCategory !== 'pinned' && note.category !== activeCategory) {
                return false;
            }

            if (searchQuery.trim()) {
                const queryStr = searchQuery.toLowerCase().trim();
                const titleMatch = (note.title || '').toLowerCase().includes(queryStr);
                const clientMatch = (note.clientName || '').toLowerCase().includes(queryStr) || (note.clientAddress || '').toLowerCase().includes(queryStr) || (note.clientPhone || '').includes(queryStr);
                const accountMatch = (note.accountUsername || '').toLowerCase().includes(queryStr) || (note.accountUrl || '').toLowerCase().includes(queryStr);
                const contentMatch = (note.content || '').toLowerCase().includes(queryStr);
                const tagMatch = Array.isArray(note.tags) && note.tags.some(t => t.toLowerCase().includes(queryStr));
                const checklistMatch = Array.isArray(note.checklist) && note.checklist.some(item => item.text.toLowerCase().includes(queryStr));

                return titleMatch || clientMatch || accountMatch || contentMatch || tagMatch || checklistMatch;
            }

            return true;
        });
    }, [notes, activeCategory, searchQuery]);

    // 4. Create New Note
    const handleCreateNewNote = async () => {
        try {
            const defaultCategory = activeCategory !== 'all' && activeCategory !== 'pinned' ? activeCategory : 'general';
            const newDoc = {
                title: '',
                category: defaultCategory,
                isPinned: false,
                clientName: '',
                clientPhone: '',
                clientAddress: '',
                accountUsername: '',
                accountPassword: '',
                accountUrl: '',
                content: '',
                checklist: [],
                tags: [],
                createdBy: currentUserEmail,
                updatedBy: currentUserEmail,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, 'shared_notes'), newDoc);
            setSelectedNoteId(docRef.id);
        } catch (err) {
            console.error("Failed to create note:", err);
            Swal.fire({
                icon: 'error',
                title: t('error') || '오류',
                text: '노트를 생성할 수 없습니다.',
                timer: 2000,
                showConfirmButton: false
            });
        }
    };

    // 5. Update Selected Note in Firestore
    const handleSaveNote = async (overrideValues = {}) => {
        if (!selectedNoteId) return;

        setIsSaving(true);
        setSaveStatus('saving');

        try {
            const noteRef = doc(db, 'shared_notes', selectedNoteId);
            const updatePayload = {
                title: overrideValues.title !== undefined ? overrideValues.title : title,
                category: overrideValues.category !== undefined ? overrideValues.category : category,
                isPinned: overrideValues.isPinned !== undefined ? overrideValues.isPinned : isPinned,
                clientName: overrideValues.clientName !== undefined ? overrideValues.clientName : clientName,
                clientPhone: overrideValues.clientPhone !== undefined ? overrideValues.clientPhone : clientPhone,
                clientAddress: overrideValues.clientAddress !== undefined ? overrideValues.clientAddress : clientAddress,
                accountUsername: overrideValues.accountUsername !== undefined ? overrideValues.accountUsername : accountUsername,
                accountPassword: overrideValues.accountPassword !== undefined ? overrideValues.accountPassword : accountPassword,
                accountUrl: overrideValues.accountUrl !== undefined ? overrideValues.accountUrl : accountUrl,
                content: overrideValues.content !== undefined ? overrideValues.content : content,
                checklist: overrideValues.checklist !== undefined ? overrideValues.checklist : checklist,
                tags: overrideValues.tags !== undefined ? overrideValues.tags : tags,
                updatedBy: currentUserEmail,
                updatedAt: serverTimestamp()
            };

            await updateDoc(noteRef, updatePayload);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus(''), 2000);
        } catch (err) {
            console.error("Failed to save note:", err);
            setSaveStatus('');
        } finally {
            setIsSaving(false);
        }
    };

    // Debounced Auto-save on input change
    const triggerAutoSave = (updatedFields) => {
        if (isInitialLoadRef.current || !selectedNoteId) return;
        
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }

        setSaveStatus('saving');
        autoSaveTimerRef.current = setTimeout(() => {
            handleSaveNote(updatedFields);
        }, 600);
    };

    // 6. Delete Note with Confirmation
    const handleDeleteNote = async (noteIdToDelete) => {
        const targetId = noteIdToDelete || selectedNoteId;
        if (!targetId) return;

        const result = await Swal.fire({
            title: t('confirmDeleteTitle') || '노트 삭제',
            text: t('confirmDeleteNote') || '정말 이 노트를 삭제하시겠습니까?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: t('delete') || '삭제',
            cancelButtonText: t('cancel') || '취소',
            reverseButtons: true,
            customClass: {
                popup: 'rounded-2xl dark:bg-slate-900 dark:text-white',
            }
        });

        if (result.isConfirmed) {
            try {
                await deleteDoc(doc(db, 'shared_notes', targetId));
                if (targetId === selectedNoteId) {
                    const remaining = notes.filter(n => n.id !== targetId);
                    setSelectedNoteId(remaining.length > 0 ? remaining[0].id : null);
                }
            } catch (err) {
                console.error("Failed to delete note:", err);
            }
        }
    };

    // 7. Clipboard Copy Helper
    const copyToClipboard = (text, fieldName) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    // 8. Checklist Handlers
    const handleToggleTodo = (index) => {
        const updated = checklist.map((item, idx) => 
            idx === index ? { ...item, done: !item.done } : item
        );
        setChecklist(updated);
        triggerAutoSave({ checklist: updated });
    };

    const handleAddTodo = (e) => {
        if (e.key === 'Enter' && newTodoText.trim()) {
            e.preventDefault();
            const newItem = { id: Date.now(), text: newTodoText.trim(), done: false };
            const updated = [...checklist, newItem];
            setChecklist(updated);
            setNewTodoText('');
            triggerAutoSave({ checklist: updated });
        }
    };

    const handleDeleteTodo = (index) => {
        const updated = checklist.filter((_, idx) => idx !== index);
        setChecklist(updated);
        triggerAutoSave({ checklist: updated });
    };

    // 9. Tag Handlers
    const handleAddTag = (e) => {
        if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
            e.preventDefault();
            const cleanTag = tagInput.replace('#', '').trim();
            if (cleanTag && !tags.includes(cleanTag)) {
                const updated = [...tags, cleanTag];
                setTags(updated);
                setTagInput('');
                triggerAutoSave({ tags: updated });
            }
        }
    };

    const handleRemoveTag = (tagToRemove) => {
        const updated = tags.filter(t => t !== tagToRemove);
        setTags(updated);
        triggerAutoSave({ tags: updated });
    };

    // Format display date
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        } catch {
            return '';
        }
    };

    if (!isOpen) return null;

    const selectedNote = notes.find(n => n.id === selectedNoteId);

    const categories = [
        { id: 'all', label: t('allNotes') || '전체', icon: Icons.all },
        { id: 'pinned', label: t('pinnedNotes') || '고정됨', icon: Icons.pinned },
        { id: 'client', label: t('clientCategory') || '거래처 & 주소', icon: Icons.client },
        { id: 'account', label: t('accountCategory') || '계정 & 비밀번호', icon: Icons.account },
        { id: 'general', label: t('generalCategory') || '일반 메모', icon: Icons.general },
        { id: 'todo', label: t('todoCategory') || '체크리스트', icon: Icons.todo }
    ];

    const currentCategoryInfo = categories.find(c => c.id === category) || categories[4];

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 p-2 sm:p-4 md:p-6 font-['Pretendard',_'Noto_Sans_KR',_'Apple_SD_Gothic_Neo',_'Malgun_Gothic',_sans-serif]">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden border border-gray-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
                
                {/* Top Header Bar */}
                <div className="px-7 py-4 border-b border-gray-100 dark:border-slate-800/80 flex items-center justify-between bg-gray-50/50 dark:bg-slate-900/60">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            {Icons.general}
                        </div>
                        <div>
                            <h2 className="text-lg md:text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
                                <span>{t('notesModalTitle') || '업무 노트 & 계정 관리'}</span>
                                <span className="text-xs px-2.5 py-0.5 font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 rounded-full">
                                    Realtime Sync
                                </span>
                            </h2>
                            <p className="text-xs md:text-sm text-gray-400 dark:text-slate-400 font-medium">
                                공유 노트 · 거래처 주소록 · 계정/비밀번호 금고 · 체크리스트
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Auto-save status */}
                        {saveStatus === 'saving' && (
                            <div className="flex items-center gap-2 text-xs md:text-sm text-blue-600 dark:text-blue-400 font-bold px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 rounded-full animate-pulse">
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                                <span>저장 중...</span>
                            </div>
                        )}
                        {saveStatus === 'saved' && (
                            <div className="flex items-center gap-1.5 text-xs md:text-sm text-emerald-600 dark:text-emerald-400 font-bold px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-full">
                                {Icons.check}
                                <span>저장됨</span>
                            </div>
                        )}

                        <button
                            onClick={onClose}
                            className="p-2.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="닫기 (Esc)"
                        >
                            {Icons.close}
                        </button>
                    </div>
                </div>

                {/* Main 2-Column Notion-Style Body */}
                <div className="flex-1 flex overflow-hidden text-sm">
                    
                    {/* LEFT COLUMN: Sidebar with categories & Note Cards List */}
                    <div className="w-80 md:w-96 flex flex-col border-r border-gray-100 dark:border-slate-800 bg-gray-50/40 dark:bg-slate-900/40">
                        
                        {/* Search & New Note Button */}
                        <div className="p-4 space-y-3 border-b border-gray-100 dark:border-slate-800/80">
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500">
                                    {Icons.search}
                                </span>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t('searchNotesPlaceholder') || '노트, 거래처, 비밀번호 검색...'}
                                    className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700/80 rounded-xl text-sm font-medium text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                                    >
                                        {Icons.close}
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={handleCreateNewNote}
                                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl text-sm font-bold shadow-sm shadow-blue-500/20 transition-all duration-200 cursor-pointer"
                            >
                                {Icons.plus}
                                <span>{t('newNote') || '새 노트 작성'}</span>
                            </button>
                        </div>

                        {/* Category Filter Pills (Minimalist Vector Icons) */}
                        <div className="px-3 py-2.5 flex items-center gap-1.5 overflow-x-auto custom-scrollbar border-b border-gray-100 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                                        activeCategory === cat.id
                                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50'
                                            : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:bg-gray-100/70 dark:hover:bg-slate-800/60 border border-transparent'
                                    }`}
                                >
                                    <span className="opacity-90">{cat.icon}</span>
                                    <span>{cat.label}</span>
                                    {cat.id === 'pinned' && (
                                        <span className="ml-0.5 text-xs px-1.5 py-0.2 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 rounded-md font-black">
                                            {notes.filter(n => n.isPinned).length}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Notes Card List */}
                        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 custom-scrollbar">
                            {loading ? (
                                <div className="py-14 flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 gap-2.5">
                                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-sm font-medium">{t('loadingShort') || '불러오는 중...'}</span>
                                </div>
                            ) : filteredNotes.length === 0 ? (
                                <div className="py-16 text-center text-gray-400 dark:text-slate-500">
                                    <div className="w-12 h-12 mx-auto mb-2.5 opacity-30 flex items-center justify-center">
                                        {Icons.general}
                                    </div>
                                    <p className="text-sm font-medium">{t('noNotesFound') || '등록된 노트가 없습니다'}</p>
                                    <button
                                        onClick={handleCreateNewNote}
                                        className="mt-3 text-sm text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                                    >
                                        + 첫 노트 작성하기
                                    </button>
                                </div>
                            ) : (
                                filteredNotes.map((note) => {
                                    const isSelected = note.id === selectedNoteId;
                                    const categoryInfo = categories.find(c => c.id === note.category) || categories[4];

                                    return (
                                        <div
                                            key={note.id}
                                            onClick={() => setSelectedNoteId(note.id)}
                                            className={`p-3.5 rounded-2xl cursor-pointer transition-all duration-200 border text-left relative group ${
                                                isSelected
                                                    ? 'bg-white dark:bg-slate-800 border-blue-500/40 shadow-sm ring-1 ring-blue-500/20'
                                                    : 'bg-white/70 dark:bg-slate-800/40 border-gray-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800/80 hover:border-gray-200 dark:hover:border-slate-700'
                                            }`}
                                        >
                                            {/* Top: Title & Pin status */}
                                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                                <h3 className={`text-sm font-black line-clamp-1 flex-1 ${
                                                    isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                                                }`}>
                                                    {note.title ? note.title : '제목 없는 노트'}
                                                </h3>
                                                {note.isPinned && (
                                                    <span className="text-amber-500 flex-shrink-0" title="고정됨">
                                                        {Icons.pinned}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Snippet / Extra details */}
                                            <div className="space-y-1.5 mb-2.5">
                                                {note.clientName && (
                                                    <div className="text-xs md:text-sm text-gray-600 dark:text-slate-300 font-medium flex items-center gap-1.5 line-clamp-1">
                                                        <span className="text-gray-400 flex-shrink-0">{Icons.client}</span>
                                                        <span className="font-bold text-gray-800 dark:text-slate-200">{note.clientName}</span>
                                                    </div>
                                                )}
                                                {note.accountUsername && (
                                                    <div className="text-xs md:text-sm text-gray-600 dark:text-slate-300 font-medium flex items-center gap-1.5 line-clamp-1">
                                                        <span className="text-gray-400 flex-shrink-0">{Icons.account}</span>
                                                        <span className="font-mono font-bold text-gray-800 dark:text-slate-200">{note.accountUsername}</span>
                                                    </div>
                                                )}
                                                {note.content && (
                                                    <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-normal">
                                                        {note.content}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Bottom: Badges & Timestamp */}
                                            <div className="flex items-center justify-between text-xs text-gray-400 dark:text-slate-500 pt-1.5 border-t border-gray-50 dark:border-slate-700/40">
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-700/60 font-bold text-gray-600 dark:text-slate-300">
                                                    {categoryInfo.icon}
                                                    <span>{categoryInfo.label}</span>
                                                </span>
                                                <span className="font-medium">{formatTimestamp(note.updatedAt)}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Notion-Style Workspace & Editor */}
                    <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-y-auto custom-scrollbar">
                        {selectedNote ? (
                            <div className="p-6 md:p-10 max-w-4xl mx-auto w-full space-y-7">
                                
                                {/* Action Bar: Custom Minimalist Category Selector, Pin, Delete */}
                                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2.5">
                                        
                                        {/* Custom Notion-Style Category Dropdown (NO EMOJIS, PURE CLEAN SVG) */}
                                        <div className="relative" ref={categoryDropdownRef}>
                                            <button
                                                type="button"
                                                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                                className="flex items-center gap-2 px-3.5 py-2 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700/80 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold text-gray-700 dark:text-slate-200 transition-all cursor-pointer shadow-2xs"
                                            >
                                                <span className="text-blue-500">{currentCategoryInfo.icon}</span>
                                                <span>{currentCategoryInfo.label}</span>
                                                <span className="text-gray-400">{Icons.chevronDown}</span>
                                            </button>

                                            {isCategoryDropdownOpen && (
                                                <div className="absolute left-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150">
                                                    {categories.filter(c => c.id !== 'all' && c.id !== 'pinned').map((cat) => (
                                                        <button
                                                            key={cat.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setCategory(cat.id);
                                                                setIsCategoryDropdownOpen(false);
                                                                triggerAutoSave({ category: cat.id });
                                                            }}
                                                            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all text-left cursor-pointer ${
                                                                category === cat.id
                                                                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                                                                    : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/60'
                                                            }`}
                                                        >
                                                            <span className={category === cat.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}>
                                                                {cat.icon}
                                                            </span>
                                                            <span>{cat.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Pin Toggle Button */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const next = !isPinned;
                                                setIsPinned(next);
                                                triggerAutoSave({ isPinned: next });
                                            }}
                                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                                                isPinned
                                                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60'
                                                    : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700 hover:text-amber-500'
                                            }`}
                                        >
                                            <span className={isPinned ? 'text-amber-500' : 'text-gray-400'}>{Icons.pinned}</span>
                                            <span>{isPinned ? (t('unpinNote') || '고정 해제') : (t('pinNote') || '상단 고정')}</span>
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* Delete Button */}
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteNote(selectedNoteId)}
                                            className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-all cursor-pointer"
                                            title="노트 삭제"
                                        >
                                            {Icons.trash}
                                        </button>
                                    </div>
                                </div>

                                {/* Title (Notion Style Big Clean Input) */}
                                <div>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => {
                                            setTitle(e.target.value);
                                            triggerAutoSave({ title: e.target.value });
                                        }}
                                        placeholder={t('noteTitlePlaceholder') || '노트 제목...'}
                                        className="w-full text-3xl md:text-4xl font-black text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-slate-600 bg-transparent border-none focus:outline-none tracking-tight font-['Pretendard',_'Noto_Sans_KR',_sans-serif]"
                                    />
                                </div>

                                {/* Tags Pill Input */}
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <span className="text-gray-400 text-xs md:text-sm font-bold">태그:</span>
                                    {tags.map((tg) => (
                                        <span
                                            key={tg}
                                            className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-800/40 flex items-center gap-1.5 text-xs md:text-sm font-bold"
                                        >
                                            #{tg}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveTag(tg)}
                                                className="hover:text-red-500 cursor-pointer text-sm leading-none"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={handleAddTag}
                                        placeholder="+ 태그 입력 (Enter)"
                                        className="px-2 py-1 bg-transparent border-b border-gray-200 dark:border-slate-700 text-xs md:text-sm text-gray-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 w-32"
                                    />
                                </div>

                                {/* SECTION 1: Client & Address Quick Block */}
                                {(category === 'client' || clientName || clientAddress || clientPhone) && (
                                    <div className="bg-slate-50/70 dark:bg-slate-800/50 rounded-2xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-700/70 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm font-black text-gray-800 dark:text-slate-200 uppercase tracking-wider">
                                                <span className="text-blue-500">{Icons.client}</span>
                                                <span>{t('clientCategory') || '거래처 & 배송 주소'}</span>
                                            </div>
                                            {clientAddress && (
                                                <button
                                                    type="button"
                                                    onClick={() => copyToClipboard(clientAddress, 'address')}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs md:text-sm font-bold hover:bg-blue-600 shadow-xs transition-all active:scale-95 cursor-pointer"
                                                >
                                                    {copiedField === 'address' ? Icons.check : Icons.copy}
                                                    <span>{copiedField === 'address' ? '복사완료!' : '주소 전체 복사'}</span>
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs md:text-sm font-bold text-gray-600 dark:text-slate-300 mb-1.5">
                                                    {t('clientNameLabel') || '거래처명 / 고객명'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={clientName}
                                                    onChange={(e) => {
                                                        setClientName(e.target.value);
                                                        triggerAutoSave({ clientName: e.target.value });
                                                    }}
                                                    placeholder="예: 진일상사 / 홍길동"
                                                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs md:text-sm font-bold text-gray-600 dark:text-slate-300 mb-1.5">
                                                    {t('clientPhoneLabel') || '연락처'}
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={clientPhone}
                                                        onChange={(e) => {
                                                            setClientPhone(e.target.value);
                                                            triggerAutoSave({ clientPhone: e.target.value });
                                                        }}
                                                        placeholder="예: 010-1234-5678"
                                                        className="w-full px-3.5 py-2.5 pr-9 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                    />
                                                    {clientPhone && (
                                                        <button
                                                            type="button"
                                                            onClick={() => copyToClipboard(clientPhone, 'phone')}
                                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-blue-600 cursor-pointer"
                                                            title="연락처 복사"
                                                        >
                                                            {Icons.copy}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-xs md:text-sm font-bold text-gray-600 dark:text-slate-300 mb-1.5">
                                                    {t('clientAddressLabel') || '배송 주소 (도로명 / 상세주소)'}
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={clientAddress}
                                                        onChange={(e) => {
                                                            setClientAddress(e.target.value);
                                                            triggerAutoSave({ clientAddress: e.target.value });
                                                        }}
                                                        placeholder="예: 서울시 중구 청계천로 123 4층 402호"
                                                        className="w-full px-3.5 py-2.5 pr-10 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                    />
                                                    {clientAddress && (
                                                        <button
                                                            type="button"
                                                            onClick={() => copyToClipboard(clientAddress, 'address')}
                                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-blue-600 cursor-pointer"
                                                            title="주소 복사"
                                                        >
                                                            {Icons.copy}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* SECTION 2: Account & Password Vault Block */}
                                {(category === 'account' || accountUsername || accountPassword || accountUrl) && (
                                    <div className="bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl p-5 md:p-6 border border-indigo-100 dark:border-indigo-900/40 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm font-black text-indigo-950 dark:text-indigo-300 uppercase tracking-wider">
                                                <span className="text-indigo-500">{Icons.account}</span>
                                                <span>{t('accountCategory') || '계정 & 비밀번호 금고'}</span>
                                            </div>
                                            <span className="text-xs text-indigo-500 font-bold bg-indigo-100 dark:bg-indigo-900/50 px-2.5 py-0.5 rounded-full">
                                                보안 금고
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2">
                                                <label className="block text-xs md:text-sm font-bold text-gray-600 dark:text-slate-300 mb-1.5">
                                                    {t('accountUrlLabel') || '접속 사이트 / URL'}
                                                </label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={accountUrl}
                                                        onChange={(e) => {
                                                            setAccountUrl(e.target.value);
                                                            triggerAutoSave({ accountUrl: e.target.value });
                                                        }}
                                                        placeholder="https://example.com/admin"
                                                        className="flex-1 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-mono text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                    />
                                                    {accountUrl && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const url = accountUrl.startsWith('http') ? accountUrl : `https://${accountUrl}`;
                                                                window.open(url, '_blank');
                                                            }}
                                                            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 rounded-xl text-sm font-bold hover:bg-indigo-50 cursor-pointer"
                                                        >
                                                            <span>접속</span>
                                                            {Icons.externalLink}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs md:text-sm font-bold text-gray-600 dark:text-slate-300 mb-1.5">
                                                    {t('accountUsernameLabel') || '아이디 / 계정명'}
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={accountUsername}
                                                        onChange={(e) => {
                                                            setAccountUsername(e.target.value);
                                                            triggerAutoSave({ accountUsername: e.target.value });
                                                        }}
                                                        placeholder="user_admin"
                                                        className="w-full px-3.5 py-2.5 pr-9 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                    />
                                                    {accountUsername && (
                                                        <button
                                                            type="button"
                                                            onClick={() => copyToClipboard(accountUsername, 'username')}
                                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-indigo-600 cursor-pointer"
                                                            title="아이디 복사"
                                                        >
                                                            {Icons.copy}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs md:text-sm font-bold text-gray-600 dark:text-slate-300 mb-1.5">
                                                    {t('accountPasswordLabel') || '비밀번호'}
                                                </label>
                                                <div className="relative flex items-center">
                                                    <input
                                                        type={showPassword ? 'text' : 'password'}
                                                        value={accountPassword}
                                                        onChange={(e) => {
                                                            setAccountPassword(e.target.value);
                                                            triggerAutoSave({ accountPassword: e.target.value });
                                                        }}
                                                        placeholder="••••••••••••"
                                                        className="w-full px-3.5 py-2.5 pr-16 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                    />
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer"
                                                            title={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                                                        >
                                                            {showPassword ? (
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                                                </svg>
                                                            ) : (
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                        {accountPassword && (
                                                            <button
                                                                type="button"
                                                                onClick={() => copyToClipboard(accountPassword, 'password')}
                                                                className="p-1 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 cursor-pointer"
                                                                title="비밀번호 복사"
                                                            >
                                                                {Icons.copy}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* SECTION 3: Interactive Checklist / To-Dos */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-bold text-gray-600 dark:text-slate-300 flex items-center gap-2">
                                            <span className="text-emerald-500">{Icons.todo}</span>
                                            <span>체크리스트 / 할 일 ({checklist.filter(c => c.done).length}/{checklist.length})</span>
                                        </label>
                                    </div>

                                    <div className="space-y-2">
                                        {checklist.map((item, idx) => (
                                            <div key={item.id || idx} className="flex items-center gap-2.5 group">
                                                <input
                                                    type="checkbox"
                                                    checked={!!item.done}
                                                    onChange={() => handleToggleTodo(idx)}
                                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-800 border-gray-300 dark:border-slate-700 cursor-pointer"
                                                />
                                                <span className={`text-sm font-medium flex-1 ${
                                                    item.done ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-800 dark:text-slate-200'
                                                }`}>
                                                    {item.text}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteTodo(idx)}
                                                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-sm px-1 cursor-pointer"
                                                >
                                                    {Icons.close}
                                                </button>
                                            </div>
                                        ))}

                                        <div className="flex items-center gap-2.5 pt-1">
                                            <span className="text-gray-400 dark:text-slate-600">{Icons.plus}</span>
                                            <input
                                                type="text"
                                                value={newTodoText}
                                                onChange={(e) => setNewTodoText(e.target.value)}
                                                onKeyDown={handleAddTodo}
                                                placeholder={t('addChecklistItem') || '할 일 추가... (Enter)'}
                                                className="w-full text-sm bg-transparent border-none focus:outline-none placeholder-gray-400 dark:placeholder-slate-500 text-gray-800 dark:text-slate-200"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION 4: Free Text Content Editor */}
                                <div className="space-y-2.5 pt-2">
                                    <label className="text-sm font-bold text-gray-600 dark:text-slate-300 flex items-center gap-2">
                                        <span className="text-gray-400">{Icons.general}</span>
                                        <span>상세 메모 & 본문</span>
                                    </label>
                                    <textarea
                                        rows={9}
                                        value={content}
                                        onChange={(e) => {
                                            setContent(e.target.value);
                                            triggerAutoSave({ content: e.target.value });
                                        }}
                                        placeholder={t('noteContentPlaceholder') || '상세 내용을 여기에 작성하세요...'}
                                        className="w-full p-4 md:p-5 bg-gray-50/50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-800 rounded-2xl text-sm md:text-base leading-relaxed text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 transition-all font-['Pretendard',_'Noto_Sans_KR',_sans-serif]"
                                    />
                                </div>

                                {/* Note Metadata Footer */}
                                <div className="pt-4 border-t border-gray-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between text-xs md:text-sm text-gray-400 dark:text-slate-500 gap-2">
                                    <div className="flex items-center gap-3.5">
                                        {selectedNote.updatedBy && (
                                            <span>
                                                {t('lastEditedBy') || '수정자'}: <strong className="text-gray-700 dark:text-slate-300 font-bold">{selectedNote.updatedBy}</strong>
                                            </span>
                                        )}
                                        {selectedNote.updatedAt && (
                                            <span>
                                                {formatTimestamp(selectedNote.updatedAt)}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleSaveNote()}
                                            disabled={isSaving}
                                            className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-gray-700 dark:text-slate-300 rounded-xl font-bold transition-all text-xs md:text-sm active:scale-95 cursor-pointer"
                                        >
                                            {isSaving ? '저장 중...' : (t('saveChanges') || '저장')}
                                        </button>
                                    </div>
                                </div>

                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 p-8 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 flex items-center justify-center mb-3 text-gray-400 dark:text-slate-500">
                                    {Icons.general}
                                </div>
                                <h3 className="text-base font-bold text-gray-700 dark:text-slate-200 mb-1">
                                    노트를 선택하거나 새로 만드세요
                                </h3>
                                <p className="text-xs md:text-sm text-gray-400 dark:text-slate-500 max-w-sm mb-4">
                                    고객 정보, 비밀번호, 아이디, 체크리스트를 안전하게 기록하고 실시간으로 공유하세요.
                                </p>
                                <button
                                    onClick={handleCreateNewNote}
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm cursor-pointer"
                                >
                                    + 새 노트 작성
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>,
        document.body
    );
}
