import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { db, auth, storage } from '../firebase';
import { 
    collection, 
    query, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    serverTimestamp,
    orderBy,
    writeBatch
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useLanguage } from '../contexts/LanguageContext';
import Swal from 'sweetalert2';

// Standardized Modern Minimalist SVG Icons (Taste-Skill Compliant, strokeWidth 2.0)
const Icons = {
    all: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
    ),
    image: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
    trash: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
    ),
    restore: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
    ),
    palette: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4 5 5 0 013-4.5V11a5 5 0 0110 0v1.5c0 1.25.75 2.5 2 2.5a2 2 0 002-2V11A9 9 0 004.1 8.5" />
        </svg>
    )
};

// Color Presets for Notion-Style Color Cards
const COLOR_PRESETS = [
    { id: 'default', label: '기본', dotBg: 'bg-slate-400', cardBg: 'bg-white/80 dark:bg-slate-800/50', border: 'border-gray-100 dark:border-slate-800' },
    { id: 'blue', label: '파랑', dotBg: 'bg-blue-500', cardBg: 'bg-blue-50/60 dark:bg-blue-950/30', border: 'border-blue-200/80 dark:border-blue-800/50' },
    { id: 'amber', label: '노랑', dotBg: 'bg-amber-500', cardBg: 'bg-amber-50/60 dark:bg-amber-950/30', border: 'border-amber-200/80 dark:border-amber-800/50' },
    { id: 'emerald', label: '초록', dotBg: 'bg-emerald-500', cardBg: 'bg-emerald-50/60 dark:bg-emerald-950/30', border: 'border-emerald-200/80 dark:border-emerald-800/50' },
    { id: 'purple', label: '보라', dotBg: 'bg-purple-500', cardBg: 'bg-purple-50/60 dark:bg-purple-950/30', border: 'border-purple-200/80 dark:border-purple-800/50' },
    { id: 'rose', label: '분홍', dotBg: 'bg-rose-500', cardBg: 'bg-rose-50/60 dark:bg-rose-950/30', border: 'border-rose-200/80 dark:border-rose-800/50' }
];

export default function NotesModal({ isOpen, onClose, user }) {
    const { t } = useLanguage();
    
    // Notes list from Firebase
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNoteId, setSelectedNoteId] = useState(null);
    
    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all'); // 'all', 'pinned', 'client', 'account', 'general', 'todo', 'trash'
    
    // Active Note Form State
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('general');
    const [color, setColor] = useState('default');
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
    const [attachments, setAttachments] = useState([]);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [previewImageModal, setPreviewImageModal] = useState(null);
    const imageInputRef = useRef(null);
    const editorRef = useRef(null);
    const savedRangeRef = useRef(null);
    const isEditorFocusedRef = useRef(false);
    
    // UI utilities state
    const [showPassword, setShowPassword] = useState(false);
    const [copiedField, setCopiedField] = useState(null);
    const [saveStatus, setSaveStatus] = useState(''); // 'saving', 'saved', ''
    const [isSaving, setIsSaving] = useState(false);
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const [isColorDropdownOpen, setIsColorDropdownOpen] = useState(false);
    
    // Realtime synchronization from detached popup window
    useEffect(() => {
        const handlePopupMessage = (event) => {
            if (event.data && event.data.type === 'JINIL_NOTE_CONTENT_UPDATE') {
                const newContent = event.data.content;
                setContent(newContent);
                if (editorRef.current && !isEditorFocusedRef.current) {
                    editorRef.current.innerHTML = newContent;
                }
                triggerAutoSave({ content: newContent });
            }
        };
        window.addEventListener('message', handlePopupMessage);
        return () => window.removeEventListener('message', handlePopupMessage);
    }, [selectedNoteId]);

    // Synchronize content to editor div when selected note or content changes
    useEffect(() => {
        if (editorRef.current && !isEditorFocusedRef.current) {
            const currentHtml = editorRef.current.innerHTML;
            if (currentHtml !== content) {
                // If it's plain text with newlines (from older version), convert \n to <br/>
                const formatted = (content && !content.includes('<') && content.includes('\n')) 
                    ? content.replace(/\n/g, '<br/>') 
                    : (content || '');
                editorRef.current.innerHTML = formatted;
            }
        }
    }, [selectedNoteId, content]);
    
    const categoryDropdownRef = useRef(null);
    const colorDropdownRef = useRef(null);
    const autoSaveTimerRef = useRef(null);
    const isInitialLoadRef = useRef(true);

    const currentUserEmail = user?.email || auth?.currentUser?.email || 'Jinil Team';

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target)) {
                setIsCategoryDropdownOpen(false);
            }
            if (colorDropdownRef.current && !colorDropdownRef.current.contains(e.target)) {
                setIsColorDropdownOpen(false);
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
            setColor('default');
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
            setAttachments([]);
            setShowPassword(false);
            return;
        }

        const note = notes.find((n) => n.id === selectedNoteId);
        if (note) {
            isInitialLoadRef.current = true;
            setTitle(note.title || '');
            setCategory(note.category || 'general');
            setColor(note.color || 'default');
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
            setAttachments(Array.isArray(note.attachments) ? note.attachments : []);
            setShowPassword(false);
            
            setTimeout(() => {
                isInitialLoadRef.current = false;
            }, 100);
        }
    }, [selectedNoteId, notes]);

    // 3. Filter notes based on activeCategory & searchQuery & isDeleted
    const filteredNotes = useMemo(() => {
        return notes.filter((note) => {
            // Trash filter logic
            if (activeCategory === 'trash') {
                if (!note.isDeleted) return false;
            } else {
                if (note.isDeleted) return false;
                if (activeCategory === 'pinned' && !note.isPinned) return false;
                if (activeCategory !== 'all' && activeCategory !== 'pinned' && note.category !== activeCategory) {
                    return false;
                }
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
            const defaultCategory = activeCategory !== 'all' && activeCategory !== 'pinned' && activeCategory !== 'trash' ? activeCategory : 'general';
            const newDoc = {
                title: '',
                category: defaultCategory,
                color: 'default',
                isPinned: false,
                isDeleted: false,
                clientName: '',
                clientPhone: '',
                clientAddress: '',
                accountUsername: '',
                accountPassword: '',
                accountUrl: '',
                content: '',
                checklist: [],
                tags: [],
                attachments: [],
                createdBy: currentUserEmail,
                updatedBy: currentUserEmail,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, 'shared_notes'), newDoc);
            if (activeCategory === 'trash') {
                setActiveCategory('all');
            }
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
                color: overrideValues.color !== undefined ? overrideValues.color : color,
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
                attachments: overrideValues.attachments !== undefined ? overrideValues.attachments : attachments,
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

    // 6. Soft Delete Note (Move to Trash)
    const handleMoveToTrash = async (targetNoteId) => {
        const targetId = targetNoteId || selectedNoteId;
        if (!targetId) return;

        try {
            const noteRef = doc(db, 'shared_notes', targetId);
            await updateDoc(noteRef, {
                isDeleted: true,
                deletedAt: serverTimestamp(),
                deletedBy: currentUserEmail
            });

            Swal.fire({
                icon: 'success',
                title: t('noteMovedToTrash') || '노트가 휴지통으로 이동되었습니다.',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2500
            });

            const remaining = filteredNotes.filter(n => n.id !== targetId);
            setSelectedNoteId(remaining.length > 0 ? remaining[0].id : null);
        } catch (err) {
            console.error("Failed to move note to trash:", err);
        }
    };

    // 7. Restore Note from Trash
    const handleRestoreNote = async (targetNoteId) => {
        const targetId = targetNoteId || selectedNoteId;
        if (!targetId) return;

        try {
            const noteRef = doc(db, 'shared_notes', targetId);
            await updateDoc(noteRef, {
                isDeleted: false,
                deletedAt: null,
                deletedBy: null,
                updatedAt: serverTimestamp(),
                updatedBy: currentUserEmail
            });

            Swal.fire({
                icon: 'success',
                title: t('noteRestored') || '노트가 복원되었습니다!',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000
            });
        } catch (err) {
            console.error("Failed to restore note:", err);
        }
    };

    // 8. Permanent Delete Note
    const handlePermanentDelete = async (targetNoteId) => {
        const targetId = targetNoteId || selectedNoteId;
        if (!targetId) return;

        const result = await Swal.fire({
            title: t('permanentDelete') || '영구 삭제',
            text: t('confirmDeleteNote') || '정말 이 노트를 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다!',
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
                const remaining = filteredNotes.filter(n => n.id !== targetId);
                setSelectedNoteId(remaining.length > 0 ? remaining[0].id : null);
            } catch (err) {
                console.error("Failed to permanently delete note:", err);
            }
        }
    };

    // 9. Empty Entire Trash
    const handleEmptyTrash = async () => {
        const trashedNotes = notes.filter(n => n.isDeleted);
        if (trashedNotes.length === 0) return;

        const result = await Swal.fire({
            title: t('emptyTrashConfirmTitle') || '휴지통을 비우시겠습니까?',
            text: t('emptyTrashConfirmText') || '휴지통의 모든 노트가 영구적으로 삭제됩니다!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: t('emptyTrash') || '비우기',
            cancelButtonText: t('cancel') || '취소',
            reverseButtons: true,
            customClass: {
                popup: 'rounded-2xl dark:bg-slate-900 dark:text-white',
            }
        });

        if (result.isConfirmed) {
            try {
                const batch = writeBatch(db);
                trashedNotes.forEach(n => {
                    batch.delete(doc(db, 'shared_notes', n.id));
                });
                await batch.commit();
                setSelectedNoteId(null);
                Swal.fire({
                    icon: 'success',
                    title: '휴지통이 비워졌습니다.',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000
                });
            } catch (err) {
                console.error("Failed to empty trash:", err);
            }
        }
    };

    // --- Image Compression & Attachment Helpers (With Quota-Exceeded Fallback) ---
    const compressImageToDataUrl = (file, maxWidth = 1200, quality = 0.78) => {
        return new Promise((resolve, reject) => {
            if (!file || !file.type || !file.type.startsWith('image/')) {
                return reject(new Error('유효한 이미지 파일이 아닙니다.'));
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const dataUrl = canvas.toDataURL('image/webp', quality);
                    canvas.toBlob((blob) => {
                        resolve({
                            dataUrl,
                            blob: blob || file
                        });
                    }, 'image/webp', quality);
                };
                img.onerror = () => reject(new Error('이미지를 읽을 수 없습니다.'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('파일 읽기 실패'));
            reader.readAsDataURL(file);
        });
    };

    const saveCurrentSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            savedRangeRef.current = sel.getRangeAt(0).cloneRange();
        }
    };

    const insertImageAtCursor = async (file, sourceName = 'image') => {
        if (!file || !file.type || !file.type.startsWith('image/')) return;
        setIsUploadingImage(true);
        try {
            // 1. Compress image to highly optimized WebP format (~30-60KB)
            const optimized = await compressImageToDataUrl(file, 1200, 0.78);
            let finalUrl = optimized.dataUrl;

            // 2. Try Firebase Storage upload if available
            try {
                const fileName = `notes_attachments/${selectedNoteId || 'general'}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.webp`;
                const storageRef = ref(storage, fileName);
                const uploadTask = await uploadBytesResumable(storageRef, optimized.blob);
                finalUrl = await getDownloadURL(uploadTask.ref);
            } catch (storageErr) {
                console.warn('Firebase storage upload failed (gracefully falling back to compressed base64):', storageErr);
                finalUrl = optimized.dataUrl;
            }

            if (editorRef.current) {
                editorRef.current.focus();

                // Create inline image element
                const imgContainer = document.createElement('div');
                imgContainer.className = 'my-2.5 inline-image-block select-none';
                imgContainer.contentEditable = 'false';
                imgContainer.style.display = 'block';

                const img = document.createElement('img');
                img.src = finalUrl;
                img.alt = file.name || '본문 이미지';
                img.className = 'max-w-full max-h-[500px] rounded-xl shadow-md border border-gray-200 dark:border-slate-700 cursor-pointer hover:opacity-95 transition-all my-1 object-contain';
                img.style.display = 'block';
                img.onclick = (e) => {
                    e.stopPropagation();
                    setPreviewImageModal({ url: finalUrl, name: file.name || '이미지' });
                };

                imgContainer.appendChild(img);

                // Add an empty line right after so typing can continue smoothly
                const emptyLine = document.createElement('p');
                emptyLine.innerHTML = '<br>';

                const sel = window.getSelection();
                let range = savedRangeRef.current || (sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null);

                if (range && editorRef.current.contains(range.commonAncestorContainer)) {
                    range.deleteContents();
                    range.insertNode(emptyLine);
                    range.insertNode(imgContainer);

                    const newRange = document.createRange();
                    newRange.setStart(emptyLine, 0);
                    newRange.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(newRange);
                } else {
                    editorRef.current.appendChild(imgContainer);
                    editorRef.current.appendChild(emptyLine);
                }

                const newContent = editorRef.current.innerHTML;
                setContent(newContent);
                triggerAutoSave({ content: newContent });

                Swal.fire({
                    icon: 'success',
                    title: '본문에 이미지가 삽입되었습니다!',
                    toast: true,
                    position: 'top-end',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        } catch (err) {
            console.error('Image insertion error:', err);
            Swal.fire({
                icon: 'error',
                title: '이미지 삽입 실패',
                text: err.message,
                timer: 2500,
                showConfirmButton: false
            });
        } finally {
            setIsUploadingImage(false);
        }
    };

    const handlePasteImage = async (e) => {
        const items = (e.clipboardData || window.clipboardData)?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type && item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                if (file) {
                    e.preventDefault();
                    saveCurrentSelection();
                    await insertImageAtCursor(file, 'clipboard');
                    return;
                }
            }
        }
    };

    const handleFileInputChange = async (e) => {
        const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
        if (files.length === 0) return;
        saveCurrentSelection();
        for (const file of files) {
            await insertImageAtCursor(file, file.name);
        }
        if (imageInputRef.current) imageInputRef.current.value = '';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDraggingOver) setIsDraggingOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
        const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
        if (files.length > 0) {
            for (const file of files) {
                await insertImageAtCursor(file, file.name);
            }
        }
    };

    const handleDeleteAttachment = async (attachmentId) => {
        const result = await Swal.fire({
            title: '이미지 삭제',
            text: '이 이미지를 메모에서 삭제하시겠습니까?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: '삭제',
            cancelButtonText: '취소',
            customClass: {
                popup: 'rounded-2xl dark:bg-slate-900 dark:text-white',
            }
        });
        if (result.isConfirmed) {
            const updated = attachments.filter(a => a.id !== attachmentId);
            setAttachments(updated);
            triggerAutoSave({ attachments: updated });
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes || isNaN(bytes)) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    // Detached Browser Popup Window with MiniWidget-Style Toss & Kakao Theme & Wallpaper System
    const handleOpenExternalWindow = () => {
        const noteTitle = title || '메모 본문';
        const noteText = content || '';
        const w = 840;
        const h = 740;
        const left = Math.max(0, Math.round((window.screen.width - w) / 2));
        const top = Math.max(0, Math.round((window.screen.height - h) / 2));
        const popup = window.open('', '_blank', `width=${w},height=${h},top=${top},left=${left},resizable=yes,scrollbars=yes`);
        if (!popup) return;

        const safeTitle = noteTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeText = noteText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        popup.document.write(`
            <!DOCTYPE html>
            <html lang="ko">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${safeTitle} - 진일 상세 메모</title>
                <link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    
                    :root {
                        --bg-body: #0b0f19;
                        --card-bg: #0f172a;
                        --header-bg: #1e293b;
                        --header-border: #334155;
                        --text-main: #f8fafc;
                        --text-muted: #94a3b8;
                        --textarea-bg: #020617;
                        --textarea-border: #1e293b;
                        --border-color: rgba(255, 255, 255, 0.12);
                        --btn-bg: rgba(255, 255, 255, 0.08);
                        --btn-text: #e2e8f0;
                        --btn-border: rgba(255, 255, 255, 0.15);
                        --btn-hover-bg: rgba(255, 255, 255, 0.15);
                        --btn-hover-text: #ffffff;
                        --btn-hover-border: rgba(255, 255, 255, 0.25);
                        --btn-theme-bg: #2563eb;
                        --btn-theme-text: #ffffff;
                        --btn-theme-border: #3b82f6;
                        --btn-theme-hover: #1d4ed8;
                        --btn-copy-bg: #0f766e;
                        --btn-copy-text: #ccfbf1;
                        --btn-copy-border: #14b8a6;
                        --btn-copy-hover: #0d9488;
                        --accent-color: #3b82f6;
                        --badge-bg: #2563eb;
                        --badge-text: #ffffff;
                        --footer-bg: #0f172a;
                    }

                    body {
                        padding: 14px;
                        font-family: "Pretendard", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                        background-color: var(--bg-body);
                        color: var(--text-main);
                        height: 100vh;
                        overflow: hidden;
                        display: flex;
                        flex-direction: column;
                        transition: background 0.3s ease, color 0.3s ease;
                        background-size: cover;
                        background-position: center;
                        background-repeat: no-repeat;
                    }

                    .app-container {
                        display: flex;
                        flex-direction: column;
                        height: 100%;
                        background-color: var(--card-bg);
                        border: 1px solid var(--border-color);
                        border-radius: 20px;
                        overflow: hidden;
                        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.45);
                        backdrop-filter: blur(16px);
                        -webkit-backdrop-filter: blur(16px);
                        transition: all 0.3s ease;
                    }

                    .high-contrast .app-container {
                        border-width: 2px !important;
                        border-color: var(--accent-color) !important;
                        box-shadow: 0 0 0 1px var(--accent-color), 0 25px 50px rgba(0,0,0,0.7) !important;
                    }

                    .high-contrast textarea {
                        border-width: 2px !important;
                        border-color: var(--accent-color) !important;
                    }

                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 12px 18px;
                        background-color: var(--header-bg);
                        border-bottom: 1px solid var(--header-border);
                        gap: 12px;
                        min-height: 58px;
                        box-sizing: border-box;
                        transition: all 0.3s ease;
                    }

                    .title-group {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        min-width: 0;
                        flex-shrink: 1;
                    }

                    .badge {
                        background-color: var(--badge-bg);
                        color: var(--badge-text);
                        font-size: 11px;
                        font-weight: 800;
                        padding: 4px 9px;
                        border-radius: 8px;
                        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                        white-space: nowrap;
                    }

                    .title-text {
                        font-size: 15px;
                        font-weight: 800;
                        color: var(--text-main);
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        max-width: 240px;
                    }

                    .toolbar {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        flex-wrap: nowrap;
                        flex-shrink: 0;
                    }

                    .btn {
                        height: 34px;
                        padding: 0 11px;
                        border-radius: 9px;
                        font-weight: 700;
                        font-size: 12px;
                        cursor: pointer;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        gap: 5px;
                        white-space: nowrap;
                        transition: all 0.15s ease;
                        user-select: none;
                        box-sizing: border-box;
                        line-height: 1;
                        background-color: var(--btn-bg);
                        color: var(--btn-text);
                        border: 1px solid var(--btn-border);
                    }

                    .btn:hover {
                        background-color: var(--btn-hover-bg);
                        color: var(--btn-hover-text);
                        border-color: var(--btn-hover-border);
                        transform: translateY(-1px);
                    }

                    .btn-theme {
                        background-color: var(--btn-theme-bg);
                        color: var(--btn-theme-text);
                        border: 1px solid var(--btn-theme-border);
                        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                    }

                    .btn-theme:hover {
                        background-color: var(--btn-theme-hover);
                        color: var(--btn-theme-text);
                        transform: translateY(-1px);
                    }

                    .btn-copy {
                        background-color: var(--btn-copy-bg);
                        color: var(--btn-copy-text);
                        border: 1px solid var(--btn-copy-border);
                    }

                    .btn-copy:hover {
                        background-color: var(--btn-copy-hover);
                        color: var(--btn-copy-text);
                    }

                    .font-controls {
                        height: 34px;
                        display: inline-flex;
                        align-items: center;
                        background-color: var(--btn-bg);
                        border-radius: 9px;
                        border: 1px solid var(--btn-border);
                        padding: 2px 3px;
                        box-sizing: border-box;
                    }

                    .font-controls button {
                        height: 28px;
                        padding: 0 7px;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        background: transparent;
                        border: none;
                        color: var(--btn-text);
                        font-weight: 800;
                        font-size: 11px;
                        cursor: pointer;
                        border-radius: 6px;
                        transition: background 0.15s;
                        line-height: 1;
                    }

                    .font-controls button:hover {
                        background-color: var(--btn-hover-bg);
                        color: var(--btn-hover-text);
                    }

                    .font-size-text {
                        font-size: 11px;
                        color: var(--text-muted);
                        padding: 0 4px;
                        font-weight: bold;
                        user-select: none;
                    }

                    .editor-wrap {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        padding: 14px 18px;
                        min-height: 0;
                    }

                    .rich-editor {
                        flex: 1;
                        width: 100%;
                        background-color: var(--textarea-bg);
                        border: 1px solid var(--textarea-border);
                        color: var(--text-main);
                        border-radius: 16px;
                        padding: 16px 18px;
                        font-size: 16px;
                        line-height: 1.7;
                        outline: none;
                        font-family: "Pretendard", sans-serif;
                        box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
                        transition: all 0.2s ease;
                        overflow-y: auto;
                        min-height: 0;
                        cursor: text;
                        user-select: text;
                    }

                    .rich-editor:focus {
                        border-color: var(--accent-color);
                        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25), inset 0 2px 4px rgba(0,0,0,0.1);
                    }

                    .rich-editor:empty:before {
                        content: "상세 내용을 작성하세요... (Ctrl+V로 con trỏ chuột dán ảnh trực tiếp)";
                        color: var(--text-muted);
                        pointer-events: none;
                    }

                    .inline-image-block {
                        margin: 12px 0;
                        user-select: none;
                    }

                    .inline-image-block img {
                        max-width: 100%;
                        max-height: 480px;
                        border-radius: 12px;
                        box-shadow: 0 4px 14px rgba(0,0,0,0.3);
                        display: block;
                        object-fit: contain;
                        cursor: pointer;
                    }

                    .footer {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 10px 18px;
                        border-top: 1px solid var(--header-border);
                        background-color: var(--footer-bg);
                        font-size: 12px;
                        color: var(--text-muted);
                        transition: all 0.3s ease;
                    }

                    .sync-status {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        font-weight: 700;
                    }

                    .status-dot {
                        width: 8px;
                        height: 8px;
                        border-radius: 50%;
                        background-color: #10b981;
                        box-shadow: 0 0 8px #10b981;
                        animation: pulse 2s infinite;
                    }

                    @keyframes pulse {
                        0%, 100% { opacity: 1; transform: scale(1); }
                        50% { opacity: 0.5; transform: scale(0.85); }
                    }

                    .stats-group {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        font-weight: 600;
                    }

                    /* 🎨 Modal Dialog for Toss & Kakao Themes & Wallpapers */
                    .modal-backdrop {
                        position: fixed;
                        inset: 0;
                        background: rgba(0, 0, 0, 0.75);
                        backdrop-filter: blur(12px);
                        -webkit-backdrop-filter: blur(12px);
                        z-index: 1000;
                        display: none;
                        align-items: center;
                        justify-content: center;
                        padding: 16px;
                        animation: fadeIn 0.2s ease-out;
                    }

                    .modal-backdrop.show {
                        display: flex;
                    }

                    .theme-modal {
                        width: 100%;
                        max-width: 440px;
                        max-height: 88vh;
                        background: #0f172a;
                        border: 1px solid rgba(255, 255, 255, 0.15);
                        border-radius: 28px;
                        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
                        padding: 20px;
                        color: #ffffff;
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                        overflow-y: auto;
                        animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                    }

                    .theme-modal::-webkit-scrollbar {
                        width: 6px;
                    }
                    .theme-modal::-webkit-scrollbar-thumb {
                        background: rgba(255,255,255,0.2);
                        border-radius: 3px;
                    }

                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }

                    @keyframes scaleUp {
                        from { opacity: 0; transform: scale(0.94); }
                        to { opacity: 1; transform: scale(1); }
                    }

                    .modal-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                        padding-bottom: 12px;
                    }

                    .modal-title-wrap {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }

                    .modal-icon {
                        width: 32px;
                        height: 32px;
                        border-radius: 12px;
                        background: linear-gradient(135deg, #3b82f6, #6366f1);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 16px;
                        box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
                    }

                    .modal-title-wrap h3 {
                        font-size: 14px;
                        font-weight: 800;
                        color: #ffffff;
                    }

                    .modal-title-wrap p {
                        font-size: 10px;
                        color: #94a3b8;
                    }

                    .modal-close-btn {
                        width: 28px;
                        height: 28px;
                        border-radius: 10px;
                        background: rgba(255, 255, 255, 0.1);
                        border: none;
                        color: #94a3b8;
                        font-size: 13px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.15s;
                    }

                    .modal-close-btn:hover {
                        background: rgba(255, 255, 255, 0.2);
                        color: #ffffff;
                    }

                    .tab-switcher {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        background: rgba(255, 255, 255, 0.08);
                        padding: 4px;
                        border-radius: 16px;
                        gap: 4px;
                    }

                    .tab-btn {
                        padding: 8px 12px;
                        font-size: 12px;
                        font-weight: 800;
                        border: none;
                        border-radius: 12px;
                        cursor: pointer;
                        color: #94a3b8;
                        background: transparent;
                        transition: all 0.2s;
                    }

                    .tab-btn.active-theme {
                        background: #2563eb;
                        color: #ffffff;
                        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
                    }

                    .tab-btn.active-wp {
                        background: #9333ea;
                        color: #ffffff;
                        box-shadow: 0 4px 12px rgba(147, 51, 234, 0.35);
                    }

                    .theme-list {
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }

                    .theme-card {
                        padding: 10px 14px;
                        border-radius: 16px;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        background: rgba(255, 255, 255, 0.04);
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        transition: all 0.15s;
                    }

                    .theme-card:hover {
                        background: rgba(255, 255, 255, 0.08);
                        border-color: rgba(255, 255, 255, 0.2);
                        transform: translateY(-1px);
                    }

                    .theme-card.active {
                        border-color: #3b82f6;
                        background: rgba(59, 130, 246, 0.18);
                        box-shadow: 0 4px 14px rgba(59, 130, 246, 0.2);
                    }

                    .theme-card-left {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    }

                    .theme-mini-thumb {
                        width: 36px;
                        height: 36px;
                        border-radius: 10px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        overflow: hidden;
                        display: flex;
                        flex-direction: column;
                        flex-shrink: 0;
                    }

                    .theme-mini-header {
                        height: 12px;
                        width: 100%;
                    }

                    .theme-mini-body {
                        flex: 1;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 2px;
                    }

                    .theme-mini-inner {
                        width: 20px;
                        height: 10px;
                        border-radius: 3px;
                    }

                    .theme-card-name {
                        font-size: 12px;
                        font-weight: 800;
                        color: #ffffff;
                    }

                    .theme-card-cat {
                        font-size: 10px;
                        color: #94a3b8;
                    }

                    .check-badge {
                        width: 20px;
                        height: 20px;
                        border-radius: 50%;
                        background: #2563eb;
                        color: #ffffff;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 11px;
                        font-weight: 900;
                    }

                    .radio-circle {
                        width: 16px;
                        height: 16px;
                        border-radius: 50%;
                        border: 1px solid rgba(255, 255, 255, 0.3);
                    }

                    .contrast-section {
                        border-top: 1px solid rgba(255, 255, 255, 0.1);
                        padding-top: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    }

                    .contrast-title {
                        font-size: 12px;
                        font-weight: 800;
                        color: #ffffff;
                    }

                    .contrast-sub {
                        font-size: 10px;
                        color: #94a3b8;
                    }

                    .switch-btn {
                        width: 44px;
                        height: 24px;
                        border-radius: 12px;
                        background: #334155;
                        border: none;
                        cursor: pointer;
                        position: relative;
                        transition: background 0.2s;
                    }

                    .switch-btn.on {
                        background: #2563eb;
                    }

                    .switch-knob {
                        width: 18px;
                        height: 18px;
                        border-radius: 50%;
                        background: #ffffff;
                        position: absolute;
                        top: 3px;
                        left: 3px;
                        transition: transform 0.2s;
                    }

                    .switch-btn.on .switch-knob {
                        transform: translateX(20px);
                    }

                    .wallpaper-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 10px;
                    }

                    .wp-card {
                        height: 80px;
                        border-radius: 18px;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        background: rgba(255, 255, 255, 0.05);
                        padding: 10px;
                        cursor: pointer;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        position: relative;
                        overflow: hidden;
                        transition: all 0.15s;
                    }

                    .wp-card:hover {
                        border-color: rgba(255, 255, 255, 0.3);
                        transform: translateY(-2px);
                    }

                    .wp-card.active {
                        border-color: #a855f7;
                        box-shadow: 0 0 0 2px #a855f7, 0 4px 14px rgba(168, 85, 247, 0.3);
                    }

                    .wp-card-bg {
                        position: absolute;
                        inset: 0;
                        opacity: 0.5;
                        transition: opacity 0.2s;
                    }

                    .wp-card:hover .wp-card-bg {
                        opacity: 0.75;
                    }

                    .wp-card-top {
                        position: relative;
                        z-index: 2;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }

                    .wp-icon {
                        font-size: 16px;
                    }

                    .wp-card-bot {
                        position: relative;
                        z-index: 2;
                    }

                    .wp-card-name {
                        font-size: 11px;
                        font-weight: 800;
                        color: #ffffff;
                    }

                    .wp-card-eng {
                        font-size: 9px;
                        color: #e2e8f0;
                    }

                    .upload-box {
                        border-top: 1px solid rgba(255, 255, 255, 0.1);
                        padding-top: 12px;
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }

                    .upload-label {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        padding: 10px;
                        border-radius: 16px;
                        border: 1px dashed rgba(168, 85, 247, 0.6);
                        background: rgba(147, 51, 234, 0.1);
                        color: #d8b4fe;
                        font-size: 11px;
                        font-weight: 800;
                        cursor: pointer;
                        transition: all 0.15s;
                    }

                    .upload-label:hover {
                        background: rgba(147, 51, 234, 0.2);
                        color: #ffffff;
                    }

                    .url-input {
                        width: 100%;
                        padding: 8px 12px;
                        border-radius: 12px;
                        border: 1px solid rgba(255, 255, 255, 0.15);
                        background: rgba(0, 0, 0, 0.4);
                        color: #ffffff;
                        font-size: 11px;
                        outline: none;
                    }

                    .url-input:focus {
                        border-color: #a855f7;
                    }

                    .apply-btn {
                        width: 100%;
                        padding: 12px;
                        border-radius: 16px;
                        background: linear-gradient(135deg, #2563eb, #7c3aed);
                        color: #ffffff;
                        font-size: 12px;
                        font-weight: 800;
                        border: none;
                        cursor: pointer;
                        box-shadow: 0 4px 16px rgba(59, 130, 246, 0.35);
                        transition: all 0.15s;
                    }

                    .apply-btn:hover {
                        background: linear-gradient(135deg, #1d4ed8, #6d28d9);
                        transform: translateY(-1px);
                    }
                </style>
            </head>
            <body>
                <div class="app-container" id="appContainer">
                    <div class="header" id="appHeader">
                        <div class="title-group">
                            <span class="badge" id="appBadge">새 창 메모</span>
                            <div class="title-text" id="appTitle">${safeTitle}</div>
                        </div>

                        <div class="toolbar">
                            <!-- Theme & Wallpaper Settings Button (Taste-Skill Vector SVG) -->
                            <button class="btn btn-theme" onclick="openThemeModal()" title="테마 및 배경화면 설정">
                                <svg style="width:14px; height:14px; flex-shrink:0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
                                    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
                                    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
                                    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
                                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2Z"/>
                                </svg>
                                <span>테마 설정</span>
                            </button>

                            <!-- Font Size Controls -->
                            <div class="font-controls">
                                <button onclick="changeFontSize(-2)" title="글자 크기 축소">A-</button>
                                <span id="fontSizeDisplay" class="font-size-text">16px</span>
                                <button onclick="changeFontSize(2)" title="글자 크기 확대">A+</button>
                            </div>

                            <!-- Copy Button -->
                            <button id="copyBtn" class="btn btn-copy" onclick="copyContent()">
                                <span>전체 복사</span>
                            </button>

                            <!-- Print Button -->
                            <button class="btn" onclick="window.print()" title="인쇄">
                                <span>인쇄</span>
                            </button>

                            <!-- Close Button -->
                            <button class="btn" onclick="window.close()" title="창 닫기">
                                <span>닫기</span>
                            </button>
                        </div>
                    </div>

                    <div class="editor-wrap">
                        <div id="editor" contenteditable="true" spellcheck="false" autocorrect="off" autocapitalize="off" autocomplete="off" class="rich-editor">${safeText}</div>
                    </div>

                    <div class="footer" id="appFooter">
                        <div class="sync-status">
                            <span class="status-dot"></span>
                            <span>메인 앱과 실시간 동기화 중</span>
                        </div>
                        <div class="stats-group">
                            <span id="charCount">${noteText.length} 글자</span>
                            <span>·</span>
                            <span id="wordCount">${noteText.trim() ? noteText.trim().split(/\\s+/).length : 0} 단어</span>
                            <span>·</span>
                            <span id="lineCount">${noteText.split('\\n').length} 줄</span>
                        </div>
                    </div>
                </div>

                <!-- 🎨 MiniWidget Toss & Kakao Theme & Wallpaper Modal Dialog -->
                <div id="themeModalBackdrop" class="modal-backdrop" onclick="closeThemeModalOnBackdrop(event)">
                    <div class="theme-modal">
                        <!-- Modal Header -->
                        <div class="modal-header">
                            <div class="modal-title-wrap">
                                <div class="modal-icon">
                                    <svg style="width:16px; height:16px;" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M7 21a4 4 0 0 1-4-4V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v12a4 4 0 0 1-4 4zm0 0h12a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 0 1 2.828 0l2.829 2.829a2 2 0 0 1 0 2.828l-8.486 8.485M7 17h.01" />
                                    </svg>
                                </div>
                                <div>
                                    <h3>테마 및 배경화면 설정</h3>
                                    <p>Toss & Kakao 프리미엄 디자인</p>
                                </div>
                            </div>
                            <button class="modal-close-btn" onclick="closeThemeModal()">✕</button>
                        </div>

                        <!-- Tab Switcher -->
                        <div class="tab-switcher">
                            <button id="tabThemeBtn" class="tab-btn active-theme" onclick="switchModalTab('themes')">
                                <svg style="width:13px; height:13px; display:inline-block; vertical-align:middle; margin-right:4px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
                                    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
                                    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
                                    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
                                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2Z"/>
                                </svg>
                                <span>UI 테마 (Themes)</span>
                            </button>
                            <button id="tabWpBtn" class="tab-btn" onclick="switchModalTab('wallpapers')">
                                <svg style="width:13px; height:13px; display:inline-block; vertical-align:middle; margin-right:4px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect width="18" height="18" x="3" y="3" rx="2" />
                                    <circle cx="9" cy="9" r="2" />
                                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                </svg>
                                <span>배경화면 (Wallpapers)</span>
                            </button>
                        </div>

                        <!-- Tab 1: UI Themes -->
                        <div id="themeTabContent">
                            <div class="theme-list">
                                <!-- Toss Dark -->
                                <div class="theme-card" data-theme="toss-dark" onclick="selectTheme('toss-dark')">
                                    <div class="theme-card-left">
                                        <div class="theme-mini-thumb" style="background:#0b0f19;">
                                            <div class="theme-mini-header" style="background:#1e293b;"></div>
                                            <div class="theme-mini-body"><div class="theme-mini-inner" style="background:#3b82f6;"></div></div>
                                        </div>
                                        <div>
                                            <div class="theme-card-name">토스 다크 (Toss Dark Navy)</div>
                                            <div class="theme-card-cat">Toss Style</div>
                                        </div>
                                    </div>
                                    <div class="check-slot"></div>
                                </div>

                                <!-- Kakao Yellow -->
                                <div class="theme-card" data-theme="kakao-yellow" onclick="selectTheme('kakao-yellow')">
                                    <div class="theme-card-left">
                                        <div class="theme-mini-thumb" style="background:#FAF9F5;">
                                            <div class="theme-mini-header" style="background:#FEE500;"></div>
                                            <div class="theme-mini-body"><div class="theme-mini-inner" style="background:#191919;"></div></div>
                                        </div>
                                        <div>
                                            <div class="theme-card-name">카카오 옐로우 (Kakao Classic)</div>
                                            <div class="theme-card-cat">Kakao Style</div>
                                        </div>
                                    </div>
                                    <div class="check-slot"></div>
                                </div>

                                <!-- Kakao Dark -->
                                <div class="theme-card" data-theme="kakao-dark" onclick="selectTheme('kakao-dark')">
                                    <div class="theme-card-left">
                                        <div class="theme-mini-thumb" style="background:#181818;">
                                            <div class="theme-mini-header" style="background:#222222;"></div>
                                            <div class="theme-mini-body"><div class="theme-mini-inner" style="background:#FEE500;"></div></div>
                                        </div>
                                        <div>
                                            <div class="theme-card-name">카카오 다크 (Kakao Charcoal)</div>
                                            <div class="theme-card-cat">Kakao Style</div>
                                        </div>
                                    </div>
                                    <div class="check-slot"></div>
                                </div>

                                <!-- Toss Light -->
                                <div class="theme-card" data-theme="toss-light" onclick="selectTheme('toss-light')">
                                    <div class="theme-card-left">
                                        <div class="theme-mini-thumb" style="background:#F8FAFC;">
                                            <div class="theme-mini-header" style="background:#ffffff; border-bottom:1px solid #e2e8f0;"></div>
                                            <div class="theme-mini-body"><div class="theme-mini-inner" style="background:#2563eb;"></div></div>
                                        </div>
                                        <div>
                                            <div class="theme-card-name">토스 화이트 (Toss Light Blue)</div>
                                            <div class="theme-card-cat">Toss Style</div>
                                        </div>
                                    </div>
                                    <div class="check-slot"></div>
                                </div>

                                <!-- OLED Black -->
                                <div class="theme-card" data-theme="oled-black" onclick="selectTheme('oled-black')">
                                    <div class="theme-card-left">
                                        <div class="theme-mini-thumb" style="background:#000000;">
                                            <div class="theme-mini-header" style="background:#121212;"></div>
                                            <div class="theme-mini-body"><div class="theme-mini-inner" style="background:#a855f7;"></div></div>
                                        </div>
                                        <div>
                                            <div class="theme-card-name">OLED 트루 블랙 (Deep Contrast)</div>
                                            <div class="theme-card-cat">Minimal</div>
                                        </div>
                                    </div>
                                    <div class="check-slot"></div>
                                </div>

                                <!-- Neon Magenta -->
                                <div class="theme-card" data-theme="cyber-neon" onclick="selectTheme('cyber-neon')">
                                    <div class="theme-card-left">
                                        <div class="theme-mini-thumb" style="background:#050510;">
                                            <div class="theme-mini-header" style="background:#1f0e3d;"></div>
                                            <div class="theme-mini-body"><div class="theme-mini-inner" style="background:#ec4899;"></div></div>
                                        </div>
                                        <div>
                                            <div class="theme-card-name">네온 사이버 (Neon Magenta)</div>
                                            <div class="theme-card-cat">Vibrant</div>
                                        </div>
                                    </div>
                                    <div class="check-slot"></div>
                                </div>

                                <!-- Emerald Mint -->
                                <div class="theme-card" data-theme="emerald-mint" onclick="selectTheme('emerald-mint')">
                                    <div class="theme-card-left">
                                        <div class="theme-mini-thumb" style="background:#021a12;">
                                            <div class="theme-mini-header" style="background:#0b3b2c;"></div>
                                            <div class="theme-mini-body"><div class="theme-mini-inner" style="background:#10b981;"></div></div>
                                        </div>
                                        <div>
                                            <div class="theme-card-name">에메랄드 민트 (Forest Fresh)</div>
                                            <div class="theme-card-cat">Vibrant</div>
                                        </div>
                                    </div>
                                    <div class="check-slot"></div>
                                </div>
                            </div>

                            <!-- High Contrast Toggle -->
                            <div class="contrast-section">
                                <div>
                                    <div class="contrast-title">선명한 고대비 모드 (High Contrast)</div>
                                    <div class="contrast-sub">폰트와 테두리의 명암비를 극대화합니다.</div>
                                </div>
                                <button id="contrastBtn" class="switch-btn" onclick="toggleHighContrast()">
                                    <div class="switch-knob"></div>
                                </button>
                            </div>
                        </div>

                        <!-- Tab 2: Wallpapers -->
                        <div id="wallpaperTabContent" style="display: none;">
                            <div class="wallpaper-grid">
                                <div class="wp-card" data-wp="orbs" onclick="selectWallpaper('orbs')">
                                    <div class="wp-card-bg" style="background: linear-gradient(135deg, #9333ea, #4f46e5, #ec4899);"></div>
                                    <div class="wp-card-top">
                                        <span class="wp-icon" style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:rgba(0,0,0,0.3);backdrop-filter:blur(4px);">
                                            <svg style="width:14px;height:14px;color:#e9d5ff;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <circle cx="12" cy="12" r="9" />
                                                <path d="m4.93 4.93 4.24 4.24M14.83 9.17l4.24-4.24M14.83 14.83l4.24 4.24M9.17 14.83l-4.24 4.24" />
                                            </svg>
                                        </span>
                                        <span class="wp-slot"></span>
                                    </div>
                                    <div class="wp-card-bot"><div class="wp-card-name">은은한 오로라</div><div class="wp-card-eng">Aurora Glow</div></div>
                                </div>

                                <div class="wp-card" data-wp="mesh" onclick="selectWallpaper('mesh')">
                                    <div class="wp-card-bg" style="background: linear-gradient(135deg, #2563eb, #14b8a6, #4ade80);"></div>
                                    <div class="wp-card-top">
                                        <span class="wp-icon" style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:rgba(0,0,0,0.3);backdrop-filter:blur(4px);">
                                            <svg style="width:14px;height:14px;color:#99f6e4;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M2 12c3-4 6-4 10 0s7 4 10 0M2 6c3-4 6-4 10 0s7 4 10 0M2 18c3-4 6-4 10 0s7 4 10 0" />
                                            </svg>
                                        </span>
                                        <span class="wp-slot"></span>
                                    </div>
                                    <div class="wp-card-bot"><div class="wp-card-name">입체 메쉬</div><div class="wp-card-eng">Mesh Wave</div></div>
                                </div>

                                <div class="wp-card" data-wp="grid" onclick="selectWallpaper('grid')">
                                    <div class="wp-card-bg" style="background: #0f172a; border: 1px solid #3b82f6;"></div>
                                    <div class="wp-card-top">
                                        <span class="wp-icon" style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:rgba(0,0,0,0.3);backdrop-filter:blur(4px);">
                                            <svg style="width:14px;height:14px;color:#93c5fd;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <rect width="18" height="18" x="3" y="3" rx="2" />
                                                <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
                                            </svg>
                                        </span>
                                        <span class="wp-slot"></span>
                                    </div>
                                    <div class="wp-card-bot"><div class="wp-card-name">하이테크 그리드</div><div class="wp-card-eng">Tech Grid</div></div>
                                </div>

                                <div class="wp-card" data-wp="dots" onclick="selectWallpaper('dots')">
                                    <div class="wp-card-bg" style="background: #020617; border: 1px solid #475569;"></div>
                                    <div class="wp-card-top">
                                        <span class="wp-icon" style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:rgba(0,0,0,0.3);backdrop-filter:blur(4px);">
                                            <svg style="width:14px;height:14px;color:#e2e8f0;" viewBox="0 0 24 24" fill="currentColor">
                                                <circle cx="6" cy="6" r="2" /><circle cx="12" cy="6" r="2" /><circle cx="18" cy="6" r="2" />
                                                <circle cx="6" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="18" cy="12" r="2" />
                                                <circle cx="6" cy="18" r="2" /><circle cx="12" cy="18" r="2" /><circle cx="18" cy="18" r="2" />
                                            </svg>
                                        </span>
                                        <span class="wp-slot"></span>
                                    </div>
                                    <div class="wp-card-bot"><div class="wp-card-name">미니멀 도트</div><div class="wp-card-eng">Dot Matrix</div></div>
                                </div>

                                <div class="wp-card" data-wp="vietnam" onclick="selectWallpaper('vietnam')">
                                    <div class="wp-card-bg" style="background: linear-gradient(135deg, #dc2626, #facc15, #16a34a);"></div>
                                    <div class="wp-card-top">
                                        <span class="wp-icon" style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:rgba(0,0,0,0.3);backdrop-filter:blur(4px);">
                                            <svg style="width:15px;height:15px;color:#fde047;" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                            </svg>
                                        </span>
                                        <span class="wp-slot"></span>
                                    </div>
                                    <div class="wp-card-bot"><div class="wp-card-name">베트남 에디션</div><div class="wp-card-eng">Vietnam Star</div></div>
                                </div>

                                <div class="wp-card" data-wp="korea" onclick="selectWallpaper('korea')">
                                    <div class="wp-card-bg" style="background: linear-gradient(135deg, #ffffff, #93c5fd, #f87171);"></div>
                                    <div class="wp-card-top">
                                        <span class="wp-icon" style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:rgba(0,0,0,0.3);backdrop-filter:blur(4px);">
                                            <svg style="width:15px;height:15px;" viewBox="0 0 24 24" fill="none">
                                                <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.8)" stroke-width="1.5" />
                                                <path d="M12 3a4.5 4.5 0 0 0 0 9 4.5 4.5 0 0 1 0 9A9 9 0 0 0 12 3z" fill="#ef4444" />
                                                <path d="M12 3a4.5 4.5 0 0 1 0 9 4.5 4.5 0 0 0 0 9A9 9 0 0 1 12 3z" fill="#3b82f6" />
                                            </svg>
                                        </span>
                                        <span class="wp-slot"></span>
                                    </div>
                                    <div class="wp-card-bot"><div class="wp-card-name">한국 에디션</div><div class="wp-card-eng">Korea Taeguk</div></div>
                                </div>

                                <div class="wp-card" data-wp="cyberpunk" onclick="selectWallpaper('cyberpunk')">
                                    <div class="wp-card-bg" style="background: linear-gradient(135deg, #d946ef, #7e22ce, #06b6d4);"></div>
                                    <div class="wp-card-top">
                                        <span class="wp-icon" style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:rgba(0,0,0,0.3);backdrop-filter:blur(4px);">
                                            <svg style="width:14px;height:14px;color:#f472b6;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
                                            </svg>
                                        </span>
                                        <span class="wp-slot"></span>
                                    </div>
                                    <div class="wp-card-bot"><div class="wp-card-name">네온 사이버</div><div class="wp-card-eng">Cyberpunk HD</div></div>
                                </div>

                                <div class="wp-card" data-wp="solid" onclick="selectWallpaper('solid')">
                                    <div class="wp-card-bg" style="background: #1e293b;"></div>
                                    <div class="wp-card-top">
                                        <span class="wp-icon" style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:rgba(0,0,0,0.3);backdrop-filter:blur(4px);">
                                            <svg style="width:14px;height:14px;color:#cbd5e1;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <rect width="18" height="18" x="3" y="3" rx="4" />
                                                <path d="M3 14h18" />
                                            </svg>
                                        </span>
                                        <span class="wp-slot"></span>
                                    </div>
                                    <div class="wp-card-bot"><div class="wp-card-name">플랫 솔리드</div><div class="wp-card-eng">Clean Solid</div></div>
                                </div>
                            </div>

                            <!-- Upload Box -->
                            <div class="upload-box">
                                <label class="upload-label">
                                    <svg style="width:14px;height:14px;color:#c084fc;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1M4 8l8-4 8 4M12 4v12"/>
                                    </svg>
                                    <span>내 컴퓨터에서 이미지 업로드</span>
                                    <input type="file" accept="image/*" onchange="handleFileUpload(event)" style="display:none;">
                                </label>
                                <input id="customUrlInput" type="text" class="url-input" placeholder="또는 이미지 URL 입력..." onchange="handleUrlInput(event)">
                            </div>
                        </div>

                        <!-- Apply Button -->
                        <button class="apply-btn" onclick="closeThemeModal()">설정 완료 (Apply Theme)</button>
                    </div>
                </div>

                <script>
                    const THEME_PRESETS = {
                        'toss-dark': {
                            bgBody: '#090d16',
                            cardBg: '#0f172a',
                            headerBg: '#1e293b',
                            headerBorder: '#334155',
                            textMain: '#f8fafc',
                            textMuted: '#94a3b8',
                            textareaBg: '#020617',
                            textareaBorder: '#1e293b',
                            borderColor: 'rgba(255, 255, 255, 0.12)',
                            btnBg: 'rgba(255, 255, 255, 0.08)',
                            btnText: '#e2e8f0',
                            btnBorder: 'rgba(255, 255, 255, 0.15)',
                            btnHoverBg: 'rgba(255, 255, 255, 0.15)',
                            btnHoverText: '#ffffff',
                            btnHoverBorder: 'rgba(255, 255, 255, 0.25)',
                            btnThemeBg: '#2563eb',
                            btnThemeText: '#ffffff',
                            btnThemeBorder: '#3b82f6',
                            btnThemeHover: '#1d4ed8',
                            btnCopyBg: '#0f766e',
                            btnCopyText: '#ccfbf1',
                            btnCopyBorder: '#14b8a6',
                            btnCopyHover: '#0d9488',
                            accentColor: '#3b82f6',
                            badgeBg: '#2563eb',
                            badgeText: '#ffffff',
                            footerBg: '#0f172a'
                        },
                        'kakao-yellow': {
                            bgBody: '#F5F2DC',
                            cardBg: '#ffffff',
                            headerBg: '#FEE500',
                            headerBorder: '#E5CE00',
                            textMain: '#191919',
                            textMuted: '#555555',
                            textareaBg: '#FAF9F5',
                            textareaBorder: '#E0D5B5',
                            borderColor: '#E5CE00',
                            btnBg: 'rgba(25, 25, 25, 0.08)',
                            btnText: '#191919',
                            btnBorder: 'rgba(25, 25, 25, 0.18)',
                            btnHoverBg: 'rgba(25, 25, 25, 0.16)',
                            btnHoverText: '#191919',
                            btnHoverBorder: 'rgba(25, 25, 25, 0.3)',
                            btnThemeBg: '#191919',
                            btnThemeText: '#FEE500',
                            btnThemeBorder: '#191919',
                            btnThemeHover: '#2e2e2e',
                            btnCopyBg: '#382800',
                            btnCopyText: '#FEE500',
                            btnCopyBorder: '#191919',
                            btnCopyHover: '#191919',
                            accentColor: '#191919',
                            badgeBg: '#191919',
                            badgeText: '#FEE500',
                            footerBg: '#FAF9F5'
                        },
                        'kakao-dark': {
                            bgBody: '#141414',
                            cardBg: '#222222',
                            headerBg: '#2a2a2a',
                            headerBorder: '#383838',
                            textMain: '#f5f5f5',
                            textMuted: '#a3a3a3',
                            textareaBg: '#1a1a1a',
                            textareaBorder: '#383838',
                            borderColor: 'rgba(255, 255, 255, 0.12)',
                            btnBg: 'rgba(255, 255, 255, 0.08)',
                            btnText: '#f5f5f5',
                            btnBorder: 'rgba(255, 255, 255, 0.15)',
                            btnHoverBg: 'rgba(255, 255, 255, 0.15)',
                            btnHoverText: '#ffffff',
                            btnHoverBorder: 'rgba(255, 255, 255, 0.25)',
                            btnThemeBg: '#FEE500',
                            btnThemeText: '#181818',
                            btnThemeBorder: '#FEE500',
                            btnThemeHover: '#ebd200',
                            btnCopyBg: 'rgba(255, 255, 255, 0.12)',
                            btnCopyText: '#FEE500',
                            btnCopyBorder: 'rgba(255, 255, 255, 0.2)',
                            btnCopyHover: 'rgba(255, 255, 255, 0.2)',
                            accentColor: '#FEE500',
                            badgeBg: '#FEE500',
                            badgeText: '#181818',
                            footerBg: '#1a1a1a'
                        },
                        'toss-light': {
                            bgBody: '#EBF0F7',
                            cardBg: '#ffffff',
                            headerBg: '#ffffff',
                            headerBorder: '#E2E8F0',
                            textMain: '#0F172A',
                            textMuted: '#64748B',
                            textareaBg: '#F8FAFC',
                            textareaBorder: '#CBD5E1',
                            borderColor: '#E2E8F0',
                            btnBg: '#F1F5F9',
                            btnText: '#334155',
                            btnBorder: '#E2E8F0',
                            btnHoverBg: '#E2E8F0',
                            btnHoverText: '#0F172A',
                            btnHoverBorder: '#CBD5E1',
                            btnThemeBg: '#2563eb',
                            btnThemeText: '#ffffff',
                            btnThemeBorder: '#2563eb',
                            btnThemeHover: '#1d4ed8',
                            btnCopyBg: '#0f766e',
                            btnCopyText: '#ccfbf1',
                            btnCopyBorder: '#14b8a6',
                            btnCopyHover: '#0d9488',
                            accentColor: '#2563eb',
                            badgeBg: '#EFF6FF',
                            badgeText: '#1D4ED8',
                            footerBg: '#F8FAFC'
                        },
                        'oled-black': {
                            bgBody: '#000000',
                            cardBg: '#080808',
                            headerBg: '#121212',
                            headerBorder: '#27272a',
                            textMain: '#ffffff',
                            textMuted: '#a1a1aa',
                            textareaBg: '#000000',
                            textareaBorder: '#27272a',
                            borderColor: '#27272a',
                            btnBg: 'rgba(255, 255, 255, 0.08)',
                            btnText: '#ffffff',
                            btnBorder: '#3f3f46',
                            btnHoverBg: 'rgba(255, 255, 255, 0.16)',
                            btnHoverText: '#ffffff',
                            btnHoverBorder: '#71717a',
                            btnThemeBg: '#9333ea',
                            btnThemeText: '#ffffff',
                            btnThemeBorder: '#a855f7',
                            btnThemeHover: '#7e22ce',
                            btnCopyBg: '#27272a',
                            btnCopyText: '#e9d5ff',
                            btnCopyBorder: '#3f3f46',
                            btnCopyHover: '#3f3f46',
                            accentColor: '#a855f7',
                            badgeBg: '#9333ea',
                            badgeText: '#ffffff',
                            footerBg: '#000000'
                        },
                        'cyber-neon': {
                            bgBody: '#050510',
                            cardBg: '#110b24',
                            headerBg: '#1f0e3d',
                            headerBorder: 'rgba(236,72,153,0.35)',
                            textMain: '#fdf2f8',
                            textMuted: '#f472b6',
                            textareaBg: '#0d081d',
                            textareaBorder: 'rgba(236,72,153,0.3)',
                            borderColor: 'rgba(236,72,153,0.35)',
                            btnBg: 'rgba(236,72,153,0.15)',
                            btnText: '#fce7f3',
                            btnBorder: 'rgba(236,72,153,0.35)',
                            btnHoverBg: 'rgba(236,72,153,0.25)',
                            btnHoverText: '#ffffff',
                            btnHoverBorder: 'rgba(236,72,153,0.5)',
                            btnThemeBg: '#db2777',
                            btnThemeText: '#ffffff',
                            btnThemeBorder: '#ec4899',
                            btnThemeHover: '#be185d',
                            btnCopyBg: '#4c0519',
                            btnCopyText: '#fecdd3',
                            btnCopyBorder: '#9f1239',
                            btnCopyHover: '#881337',
                            accentColor: '#ec4899',
                            badgeBg: '#db2777',
                            badgeText: '#ffffff',
                            footerBg: '#050510'
                        },
                        'emerald-mint': {
                            bgBody: '#021a12',
                            cardBg: '#06291e',
                            headerBg: '#0b3b2c',
                            headerBorder: 'rgba(16,185,129,0.35)',
                            textMain: '#ecfdf5',
                            textMuted: '#6ee7b7',
                            textareaBg: '#031f16',
                            textareaBorder: 'rgba(16,185,129,0.3)',
                            borderColor: 'rgba(16,185,129,0.35)',
                            btnBg: 'rgba(16,185,129,0.15)',
                            btnText: '#d1fae5',
                            btnBorder: 'rgba(16,185,129,0.35)',
                            btnHoverBg: 'rgba(16,185,129,0.25)',
                            btnHoverText: '#ffffff',
                            btnHoverBorder: 'rgba(16,185,129,0.5)',
                            btnThemeBg: '#059669',
                            btnThemeText: '#ffffff',
                            btnThemeBorder: '#10b981',
                            btnThemeHover: '#047857',
                            btnCopyBg: '#064e3b',
                            btnCopyText: '#a7f3d0',
                            btnCopyBorder: '#047857',
                            btnCopyHover: '#065f46',
                            accentColor: '#10b981',
                            badgeBg: '#059669',
                            badgeText: '#ffffff',
                            footerBg: '#021a12'
                        }
                    };

                    const WALLPAPER_PRESETS = {
                        'orbs': 'linear-gradient(135deg, rgba(147, 51, 234, 0.45), rgba(79, 70, 229, 0.4), rgba(236, 72, 153, 0.45))',
                        'mesh': 'linear-gradient(135deg, rgba(37, 99, 235, 0.45), rgba(20, 184, 166, 0.4), rgba(74, 222, 128, 0.4))',
                        'grid': 'linear-gradient(to right, rgba(59,130,246,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(59,130,246,0.15) 1px, transparent 1px)',
                        'dots': 'radial-gradient(rgba(255,255,255,0.2) 1.5px, transparent 1.5px)',
                        'vietnam': 'linear-gradient(135deg, rgba(220, 38, 38, 0.55), rgba(250, 204, 21, 0.35), rgba(22, 163, 74, 0.45))',
                        'korea': 'linear-gradient(135deg, rgba(248, 250, 252, 0.55), rgba(147, 197, 253, 0.35), rgba(248, 113, 113, 0.45))',
                        'cyberpunk': 'linear-gradient(135deg, rgba(217, 70, 239, 0.45), rgba(126, 34, 206, 0.45), rgba(6, 182, 212, 0.45))',
                        'solid': 'none'
                    };

                    let currentTheme = localStorage.getItem('jinil_note_popout_theme_id') || 'toss-dark';
                    let currentWallpaper = localStorage.getItem('jinil_note_popout_wp_id') || 'orbs';
                    let isHighContrast = localStorage.getItem('jinil_note_popout_contrast') === 'true';
                    let customBgUrl = localStorage.getItem('jinil_note_popout_custom_bg') || '';
                    let currentFontSize = 16;

                    const editor = document.getElementById('editor');
                    const modalBackdrop = document.getElementById('themeModalBackdrop');

                    function openThemeModal() {
                        modalBackdrop.classList.add('show');
                        updateModalActiveStates();
                    }

                    function closeThemeModal() {
                        modalBackdrop.classList.remove('show');
                    }

                    function closeThemeModalOnBackdrop(e) {
                        if (e.target === modalBackdrop) {
                            closeThemeModal();
                        }
                    }

                    function switchModalTab(tab) {
                        const isTheme = tab === 'themes';
                        document.getElementById('themeTabContent').style.display = isTheme ? 'block' : 'none';
                        document.getElementById('wallpaperTabContent').style.display = isTheme ? 'none' : 'block';
                        
                        document.getElementById('tabThemeBtn').className = isTheme ? 'tab-btn active-theme' : 'tab-btn';
                        document.getElementById('tabWpBtn').className = isTheme ? 'tab-btn' : 'tab-btn active-wp';
                    }

                    function selectTheme(themeId) {
                        currentTheme = themeId;
                        localStorage.setItem('jinil_note_popout_theme_id', themeId);
                        applyThemeStyles();
                        updateModalActiveStates();
                    }

                    function selectWallpaper(wpId) {
                        currentWallpaper = wpId;
                        customBgUrl = '';
                        localStorage.setItem('jinil_note_popout_wp_id', wpId);
                        localStorage.removeItem('jinil_note_popout_custom_bg');
                        applyWallpaperStyles();
                        updateModalActiveStates();
                    }

                    function toggleHighContrast() {
                        isHighContrast = !isHighContrast;
                        localStorage.setItem('jinil_note_popout_contrast', isHighContrast ? 'true' : 'false');
                        applyThemeStyles();
                        updateModalActiveStates();
                    }

                    function handleFileUpload(e) {
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            customBgUrl = event.target.result;
                            currentWallpaper = 'custom';
                            localStorage.setItem('jinil_note_popout_custom_bg', customBgUrl);
                            localStorage.setItem('jinil_note_popout_wp_id', 'custom');
                            applyWallpaperStyles();
                            updateModalActiveStates();
                        };
                        reader.readAsDataURL(file);
                    }

                    function handleUrlInput(e) {
                        const url = e.target.value.trim();
                        if (!url) return;
                        customBgUrl = url;
                        currentWallpaper = 'custom';
                        localStorage.setItem('jinil_note_popout_custom_bg', customBgUrl);
                        localStorage.setItem('jinil_note_popout_wp_id', 'custom');
                        applyWallpaperStyles();
                        updateModalActiveStates();
                    }

                    function applyThemeStyles() {
                        const t = THEME_PRESETS[currentTheme] || THEME_PRESETS['toss-dark'];
                        const root = document.documentElement;

                        root.style.setProperty('--bg-body', t.bgBody);
                        root.style.setProperty('--card-bg', t.cardBg);
                        root.style.setProperty('--header-bg', t.headerBg);
                        root.style.setProperty('--header-border', t.headerBorder);
                        root.style.setProperty('--text-main', t.textMain);
                        root.style.setProperty('--text-muted', t.textMuted);
                        root.style.setProperty('--textarea-bg', t.textareaBg);
                        root.style.setProperty('--textarea-border', t.textareaBorder);
                        root.style.setProperty('--border-color', t.borderColor);
                        root.style.setProperty('--btn-bg', t.btnBg);
                        root.style.setProperty('--btn-text', t.btnText);
                        root.style.setProperty('--btn-border', t.btnBorder);
                        root.style.setProperty('--btn-hover-bg', t.btnHoverBg);
                        root.style.setProperty('--btn-hover-text', t.btnHoverText);
                        root.style.setProperty('--btn-hover-border', t.btnHoverBorder);
                        root.style.setProperty('--btn-theme-bg', t.btnThemeBg);
                        root.style.setProperty('--btn-theme-text', t.btnThemeText);
                        root.style.setProperty('--btn-theme-border', t.btnThemeBorder);
                        root.style.setProperty('--btn-theme-hover', t.btnThemeHover);
                        root.style.setProperty('--btn-copy-bg', t.btnCopyBg);
                        root.style.setProperty('--btn-copy-text', t.btnCopyText);
                        root.style.setProperty('--btn-copy-border', t.btnCopyBorder);
                        root.style.setProperty('--btn-copy-hover', t.btnCopyHover);
                        root.style.setProperty('--accent-color', t.accentColor);
                        root.style.setProperty('--badge-bg', t.badgeBg);
                        root.style.setProperty('--badge-text', t.badgeText);
                        root.style.setProperty('--footer-bg', t.footerBg);

                        if (isHighContrast) {
                            document.body.classList.add('high-contrast');
                        } else {
                            document.body.classList.remove('high-contrast');
                        }
                    }

                    function applyWallpaperStyles() {
                        if (customBgUrl) {
                            document.body.style.backgroundImage = 'url("' + customBgUrl + '")';
                            document.body.style.backgroundSize = 'cover';
                            document.body.style.backgroundPosition = 'center';
                        } else {
                            const wpGradient = WALLPAPER_PRESETS[currentWallpaper];
                            if (wpGradient && wpGradient !== 'none') {
                                document.body.style.backgroundImage = wpGradient;
                                if (currentWallpaper === 'grid') {
                                    document.body.style.backgroundSize = '24px 24px';
                                } else if (currentWallpaper === 'dots') {
                                    document.body.style.backgroundSize = '18px 18px';
                                } else {
                                    document.body.style.backgroundSize = 'cover';
                                }
                            } else {
                                document.body.style.backgroundImage = 'none';
                            }
                        }
                    }

                    function updateModalActiveStates() {
                        // Theme list
                        document.querySelectorAll('.theme-card').forEach(card => {
                            const tId = card.getAttribute('data-theme');
                            const isSelected = tId === currentTheme;
                            card.className = isSelected ? 'theme-card active' : 'theme-card';
                            const slot = card.querySelector('.check-slot');
                            if (slot) {
                                slot.innerHTML = isSelected ? '<div class="check-badge">✓</div>' : '<div class="radio-circle"></div>';
                            }
                        });

                        // High Contrast button
                        const contrastBtn = document.getElementById('contrastBtn');
                        if (contrastBtn) {
                            if (isHighContrast) contrastBtn.classList.add('on');
                            else contrastBtn.classList.remove('on');
                        }

                        // Wallpaper grid
                        document.querySelectorAll('.wp-card').forEach(card => {
                            const wpId = card.getAttribute('data-wp');
                            const isSelected = wpId === currentWallpaper && !customBgUrl;
                            card.className = isSelected ? 'wp-card active' : 'wp-card';
                            const slot = card.querySelector('.wp-slot');
                            if (slot) {
                                slot.innerHTML = isSelected ? '<div class="check-badge" style="background:#9333ea; width:16px; height:16px; font-size:9px;">✓</div>' : '';
                            }
                        });
                    }

                    function changeFontSize(delta) {
                        currentFontSize = Math.min(36, Math.max(12, currentFontSize + delta));
                        editor.style.fontSize = currentFontSize + 'px';
                        document.getElementById('fontSizeDisplay').innerText = currentFontSize + 'px';
                    }

                    function updateStats() {
                        const text = editor.innerText || '';
                        document.getElementById('charCount').innerText = text.length + ' 글자';
                        document.getElementById('wordCount').innerText = (text.trim() ? text.trim().split(/\s+/).length : 0) + ' 단어';
                        document.getElementById('lineCount').innerText = text.split('\n').length + ' 줄';
                    }

                    function copyContent() {
                        navigator.clipboard.writeText(editor.innerText || '');
                        const btn = document.getElementById('copyBtn');
                        btn.innerHTML = '<span>복사됨! ✓</span>';
                        setTimeout(() => { btn.innerHTML = '<span>전체 복사</span>'; }, 2000);
                    }

                    editor.addEventListener('input', () => {
                        updateStats();
                        if (window.opener && !window.opener.closed) {
                            window.opener.postMessage({
                                type: 'JINIL_NOTE_CONTENT_UPDATE',
                                content: editor.innerHTML
                            }, '*');
                        }
                    });

                    // Clipboard Paste Listener for Inline Images in Detached Window
                    editor.addEventListener('paste', (e) => {
                        const items = (e.clipboardData || window.clipboardData)?.items;
                        if (!items) return;
                        for (let i = 0; i < items.length; i++) {
                            const item = items[i];
                            if (item.type && item.type.indexOf('image') !== -1) {
                                const file = item.getAsFile();
                                if (file) {
                                    e.preventDefault();
                                    const reader = new FileReader();
                                    reader.onload = (re) => {
                                        const sel = window.getSelection();
                                        let range = (sel && sel.rangeCount > 0) ? sel.getRangeAt(0) : null;

                                        const imgContainer = document.createElement('div');
                                        imgContainer.className = 'inline-image-block';
                                        imgContainer.contentEditable = 'false';

                                        const img = document.createElement('img');
                                        img.src = re.target.result;
                                        img.alt = file.name || '이미지';
                                        imgContainer.appendChild(img);

                                        const emptyLine = document.createElement('p');
                                        emptyLine.innerHTML = '<br>';

                                        if (range && editor.contains(range.commonAncestorContainer)) {
                                            range.deleteContents();
                                            range.insertNode(emptyLine);
                                            range.insertNode(imgContainer);

                                            const newRange = document.createRange();
                                            newRange.setStart(emptyLine, 0);
                                            newRange.collapse(true);
                                            sel.removeAllRanges();
                                            sel.addRange(newRange);
                                        } else {
                                            editor.appendChild(imgContainer);
                                            editor.appendChild(emptyLine);
                                        }

                                        updateStats();
                                        if (window.opener && !window.opener.closed) {
                                            window.opener.postMessage({
                                                type: 'JINIL_NOTE_CONTENT_UPDATE',
                                                content: editor.innerHTML
                                            }, '*');
                                        }
                                    };
                                    reader.readAsDataURL(file);
                                    return;
                                }
                            }
                        }
                    });

                    // Keyboard shortcuts
                    window.addEventListener('keydown', (e) => {
                        if (e.key === 'Escape') {
                            if (modalBackdrop.classList.contains('show')) {
                                closeThemeModal();
                            } else {
                                window.close();
                            }
                        }
                    });

                    // Initial Load
                    applyThemeStyles();
                    applyWallpaperStyles();
                </script>
            </body>
            </html>
        `);
        popup.document.close();
    };

    // 10. Clipboard Copy Helper
    const copyToClipboard = (text, fieldName) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    // 11. Checklist Handlers
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

    // 12. Tag Handlers
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
    const isSelectedNoteTrashed = selectedNote?.isDeleted;

    const trashedCount = notes.filter(n => n.isDeleted).length;
    const activeNotesCount = notes.filter(n => !n.isDeleted).length;

    const categories = [
        { id: 'all', label: t('allNotes') || '전체', icon: Icons.all },
        { id: 'pinned', label: t('pinnedNotes') || '고정됨', icon: Icons.pinned },
        { id: 'client', label: t('clientCategory') || '거래처 & 주소', icon: Icons.client },
        { id: 'account', label: t('accountCategory') || '계정 & 비밀번호', icon: Icons.account },
        { id: 'general', label: t('generalCategory') || '일반 메모', icon: Icons.general },
        { id: 'todo', label: t('todoCategory') || '체크리스트', icon: Icons.todo },
        { id: 'trash', label: t('trashCategory') || '휴지통', icon: Icons.trash }
    ];

    const currentCategoryInfo = categories.find(c => c.id === category) || categories[4];
    const currentColorPreset = COLOR_PRESETS.find(c => c.id === color) || COLOR_PRESETS[0];

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
                                <span className="text-[11px] px-2 py-0.5 font-bold bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400 rounded-md border border-gray-200 dark:border-slate-700">
                                    Alt + N
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

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleCreateNewNote}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl text-sm font-bold shadow-sm shadow-blue-500/20 transition-all duration-200 cursor-pointer"
                                >
                                    {Icons.plus}
                                    <span>{t('newNote') || '새 노트 작성'}</span>
                                </button>
                                {activeCategory === 'trash' && trashedCount > 0 && (
                                    <button
                                        onClick={handleEmptyTrash}
                                        className="flex items-center gap-1.5 py-2.5 px-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                        title={t('emptyTrash') || '휴지통 비우기'}
                                    >
                                        {Icons.trash}
                                        <span>비우기</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Category Filter Pills (Minimalist Vector Icons) */}
                        <div className="px-3 py-2.5 flex items-center gap-1.5 overflow-x-auto custom-scrollbar border-b border-gray-100 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                                        activeCategory === cat.id
                                            ? cat.id === 'trash'
                                                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50'
                                                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50'
                                            : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:bg-gray-100/70 dark:hover:bg-slate-800/60 border border-transparent'
                                    }`}
                                >
                                    <span className="opacity-90">{cat.icon}</span>
                                    <span>{cat.label}</span>
                                    {cat.id === 'pinned' && (
                                        <span className="ml-0.5 text-xs px-1.5 py-0.2 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 rounded-md font-black">
                                            {notes.filter(n => !n.isDeleted && n.isPinned).length}
                                        </span>
                                    )}
                                    {cat.id === 'trash' && trashedCount > 0 && (
                                        <span className="ml-0.5 text-xs px-1.5 py-0.2 bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 rounded-md font-black">
                                            {trashedCount}
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
                                        {activeCategory === 'trash' ? Icons.trash : Icons.general}
                                    </div>
                                    <p className="text-sm font-medium">
                                        {activeCategory === 'trash' 
                                            ? '휴지통이 비어 있습니다' 
                                            : (t('noNotesFound') || '등록된 노트가 없습니다')}
                                    </p>
                                    {activeCategory !== 'trash' && (
                                        <button
                                            onClick={handleCreateNewNote}
                                            className="mt-3 text-sm text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                                        >
                                            + 첫 노트 작성하기
                                        </button>
                                    )}
                                </div>
                            ) : (
                                filteredNotes.map((note) => {
                                    const isSelected = note.id === selectedNoteId;
                                    const categoryInfo = categories.find(c => c.id === note.category) || categories[4];
                                    const cardColorPreset = COLOR_PRESETS.find(c => c.id === note.color) || COLOR_PRESETS[0];

                                    return (
                                        <div
                                            key={note.id}
                                            onClick={() => setSelectedNoteId(note.id)}
                                            className={`p-3.5 rounded-2xl cursor-pointer transition-all duration-200 border text-left relative group ${cardColorPreset.cardBg} ${
                                                isSelected
                                                    ? 'border-blue-500/60 shadow-md ring-1 ring-blue-500/30'
                                                    : `${cardColorPreset.border} hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-xs`
                                            }`}
                                        >
                                            {/* Top: Title & Pin status */}
                                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                                <h3 className={`text-sm font-black line-clamp-1 flex-1 ${
                                                    isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                                                }`}>
                                                    {note.title ? note.title : '제목 없는 노트'}
                                                </h3>
                                                {note.isPinned && !note.isDeleted && (
                                                    <span className="text-amber-500 flex-shrink-0" title="고정됨">
                                                        {Icons.pinned}
                                                    </span>
                                                )}
                                                {note.isDeleted && (
                                                    <span className="text-red-500 text-xs font-bold px-1.5 py-0.5 bg-red-100 dark:bg-red-950/60 rounded">
                                                        삭제됨
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
                                            <div className="flex items-center justify-between text-xs text-gray-400 dark:text-slate-500 pt-1.5 border-t border-gray-100/60 dark:border-slate-700/40">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-700/60 font-bold text-gray-600 dark:text-slate-300">
                                                        {categoryInfo.icon}
                                                        <span>{categoryInfo.label}</span>
                                                    </span>
                                                    {note.color && note.color !== 'default' && (
                                                        <span className={`w-2 h-2 rounded-full ${cardColorPreset.dotBg}`} />
                                                    )}
                                                </div>
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
                                
                                {/* Trashed Banner (If note is in trash) */}
                                {isSelectedNoteTrashed && (
                                    <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3 text-amber-800 dark:text-amber-300 text-sm font-semibold">
                                            {Icons.trash}
                                            <span>이 노트는 휴지통에 보관되어 있습니다. 복원하거나 영구 삭제할 수 있습니다.</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleRestoreNote(selectedNoteId)}
                                                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs md:text-sm font-bold shadow-xs transition-all cursor-pointer"
                                            >
                                                {Icons.restore}
                                                <span>{t('restoreNote') || '복원'}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handlePermanentDelete(selectedNoteId)}
                                                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs md:text-sm font-bold shadow-xs transition-all cursor-pointer"
                                            >
                                                {Icons.trash}
                                                <span>{t('permanentDelete') || '영구 삭제'}</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Action Bar: Custom Minimalist Category Selector, Color Picker, Pin, Delete */}
                                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2.5">
                                        
                                        {/* Custom Notion-Style Category Dropdown */}
                                        <div className="relative" ref={categoryDropdownRef}>
                                            <button
                                                type="button"
                                                disabled={isSelectedNoteTrashed}
                                                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                                className="flex items-center gap-2 px-3.5 py-2 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700/80 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold text-gray-700 dark:text-slate-200 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                                            >
                                                <span className="text-blue-500">{currentCategoryInfo.icon}</span>
                                                <span>{currentCategoryInfo.label}</span>
                                                <span className="text-gray-400">{Icons.chevronDown}</span>
                                            </button>

                                            {isCategoryDropdownOpen && (
                                                <div className="absolute left-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150">
                                                    {categories.filter(c => c.id !== 'all' && c.id !== 'pinned' && c.id !== 'trash').map((cat) => (
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

                                        {/* Color Label Palette Picker */}
                                        <div className="relative" ref={colorDropdownRef}>
                                            <button
                                                type="button"
                                                disabled={isSelectedNoteTrashed}
                                                onClick={() => setIsColorDropdownOpen(!isColorDropdownOpen)}
                                                className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700/80 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold text-gray-700 dark:text-slate-200 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                                                title={t('noteColor') || '색상 라벨'}
                                            >
                                                <span className={`w-3.5 h-3.5 rounded-full ${currentColorPreset.dotBg}`} />
                                                <span>{currentColorPreset.label}</span>
                                                <span className="text-gray-400">{Icons.chevronDown}</span>
                                            </button>

                                            {isColorDropdownOpen && (
                                                <div className="absolute left-0 top-full mt-1.5 w-44 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150">
                                                    {COLOR_PRESETS.map((col) => (
                                                        <button
                                                            key={col.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setColor(col.id);
                                                                setIsColorDropdownOpen(false);
                                                                triggerAutoSave({ color: col.id });
                                                            }}
                                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold transition-all text-left cursor-pointer ${
                                                                color === col.id
                                                                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                                                                    : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/60'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2.5">
                                                                <span className={`w-3.5 h-3.5 rounded-full ${col.dotBg}`} />
                                                                <span>{col.label}</span>
                                                            </div>
                                                            {color === col.id && Icons.check}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Pin Toggle Button */}
                                        <button
                                            type="button"
                                            disabled={isSelectedNoteTrashed}
                                            onClick={() => {
                                                const next = !isPinned;
                                                setIsPinned(next);
                                                triggerAutoSave({ isPinned: next });
                                            }}
                                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-50 ${
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
                                        {/* Delete / Move to Trash Button */}
                                        {!isSelectedNoteTrashed ? (
                                            <button
                                                type="button"
                                                onClick={() => handleMoveToTrash(selectedNoteId)}
                                                className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-all cursor-pointer"
                                                title={t('moveToTrash') || '휴지통으로 이동'}
                                            >
                                                {Icons.trash}
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handlePermanentDelete(selectedNoteId)}
                                                className="p-2.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-all cursor-pointer"
                                                title={t('permanentDelete') || '영구 삭제'}
                                            >
                                                {Icons.trash}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Title (Notion Style Big Clean Input) */}
                                <div>
                                    <input
                                        type="text"
                                        disabled={isSelectedNoteTrashed}
                                        value={title}
                                        onChange={(e) => {
                                            setTitle(e.target.value);
                                            triggerAutoSave({ title: e.target.value });
                                        }}
                                        placeholder={t('noteTitlePlaceholder') || '노트 제목...'}
                                        className="w-full text-3xl md:text-4xl font-black text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-slate-600 bg-transparent border-none focus:outline-none tracking-tight font-['Pretendard',_'Noto_Sans_KR',_sans-serif] disabled:opacity-60"
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
                                            {!isSelectedNoteTrashed && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveTag(tg)}
                                                    className="hover:text-red-500 cursor-pointer text-sm leading-none"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </span>
                                    ))}
                                    {!isSelectedNoteTrashed && (
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={handleAddTag}
                                            placeholder="+ 태그 입력 (Enter)"
                                            className="px-2 py-1 bg-transparent border-b border-gray-200 dark:border-slate-700 text-xs md:text-sm text-gray-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 w-32"
                                        />
                                    )}
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
                                                    disabled={isSelectedNoteTrashed}
                                                    value={clientName}
                                                    onChange={(e) => {
                                                        setClientName(e.target.value);
                                                        triggerAutoSave({ clientName: e.target.value });
                                                    }}
                                                    placeholder="예: 진일상사 / 홍길동"
                                                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs md:text-sm font-bold text-gray-600 dark:text-slate-300 mb-1.5">
                                                    {t('clientPhoneLabel') || '연락처'}
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        disabled={isSelectedNoteTrashed}
                                                        value={clientPhone}
                                                        onChange={(e) => {
                                                            setClientPhone(e.target.value);
                                                            triggerAutoSave({ clientPhone: e.target.value });
                                                        }}
                                                        placeholder="예: 010-1234-5678"
                                                        className="w-full px-3.5 py-2.5 pr-9 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
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
                                                        disabled={isSelectedNoteTrashed}
                                                        value={clientAddress}
                                                        onChange={(e) => {
                                                            setClientAddress(e.target.value);
                                                            triggerAutoSave({ clientAddress: e.target.value });
                                                        }}
                                                        placeholder="예: 서울시 중구 청계천로 123 4층 402호"
                                                        className="w-full px-3.5 py-2.5 pr-10 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                                                    />
                                                    {clientAddress && (
                                                        <button
                                                            type="button"
                                                            onClick={() => copyToClipboard(clientAddress, 'address')}
                                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-blue-600 cursor-pointer"
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
                                                        disabled={isSelectedNoteTrashed}
                                                        value={accountUrl}
                                                        onChange={(e) => {
                                                            setAccountUrl(e.target.value);
                                                            triggerAutoSave({ accountUrl: e.target.value });
                                                        }}
                                                        placeholder="https://example.com/admin"
                                                        className="flex-1 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-mono text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
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
                                                        disabled={isSelectedNoteTrashed}
                                                        value={accountUsername}
                                                        onChange={(e) => {
                                                            setAccountUsername(e.target.value);
                                                            triggerAutoSave({ accountUsername: e.target.value });
                                                        }}
                                                        placeholder="user_admin"
                                                        className="w-full px-3.5 py-2.5 pr-9 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
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
                                                        disabled={isSelectedNoteTrashed}
                                                        value={accountPassword}
                                                        onChange={(e) => {
                                                            setAccountPassword(e.target.value);
                                                            triggerAutoSave({ accountPassword: e.target.value });
                                                        }}
                                                        placeholder="••••••••••••"
                                                        className="w-full px-3.5 py-2.5 pr-16 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
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
                                                    disabled={isSelectedNoteTrashed}
                                                    checked={!!item.done}
                                                    onChange={() => handleToggleTodo(idx)}
                                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-800 border-gray-300 dark:border-slate-700 cursor-pointer disabled:opacity-60"
                                                />
                                                <span className={`text-sm font-medium flex-1 ${
                                                    item.done ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-800 dark:text-slate-200'
                                                }`}>
                                                    {item.text}
                                                </span>
                                                {!isSelectedNoteTrashed && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteTodo(idx)}
                                                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-sm px-1 cursor-pointer"
                                                    >
                                                        {Icons.close}
                                                    </button>
                                                )}
                                            </div>
                                        ))}

                                        {!isSelectedNoteTrashed && (
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
                                        )}
                                    </div>
                                </div>

                                {/* SECTION 4: Free Text Content Editor & Image Attachments */}
                                <div className="space-y-2.5 pt-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-bold text-gray-600 dark:text-slate-300 flex items-center gap-2">
                                            <span className="text-gray-400">{Icons.general}</span>
                                            <span>상세 메모 & 본문</span>
                                        </label>
                                        <div className="flex items-center gap-2">
                                            {/* Hidden file input for image attachment */}
                                            <input
                                                type="file"
                                                ref={imageInputRef}
                                                accept="image/*"
                                                multiple
                                                onChange={handleFileInputChange}
                                                className="hidden"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => imageInputRef.current?.click()}
                                                disabled={isSelectedNoteTrashed || isUploadingImage}
                                                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-xl transition-all border border-emerald-200/60 dark:border-emerald-800/40 cursor-pointer shadow-xs active:scale-95 group disabled:opacity-50"
                                                title="이미지 파일 첨부 또는 클립보드(Ctrl+V)로 dán ảnh"
                                            >
                                                <svg className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span>{isUploadingImage ? '업로드 중...' : '이미지 첨부'}</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={handleOpenExternalWindow}
                                                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-xl transition-all border border-blue-200/60 dark:border-blue-800/40 cursor-pointer shadow-xs active:scale-95 group"
                                                title="상세 메모를 독립된 새 창 팝업으로 분리 및 편집"
                                            >
                                                <svg className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                                <span>새 창 분리</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Editor Box with Drag-and-Drop & Clipboard Paste Listener */}
                                    <div
                                        className={`relative rounded-2xl transition-all ${
                                            isDraggingOver 
                                                ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900 bg-blue-50/20' 
                                                : ''
                                        }`}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                    >
                                        {isDraggingOver && (
                                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-blue-600/10 dark:bg-blue-900/40 backdrop-blur-xs border-2 border-dashed border-blue-500 rounded-2xl pointer-events-none">
                                                <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-lg flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm">
                                                    <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                    </svg>
                                                    <span>여기에 이미지를 놓으면 바로 첨부됩니다</span>
                                                </div>
                                            </div>
                                        )}

                                        <div
                                            ref={editorRef}
                                            contentEditable={!isSelectedNoteTrashed}
                                            suppressContentEditableWarning={true}
                                            spellCheck={false}
                                            autoCorrect="off"
                                            autoCapitalize="off"
                                            onFocus={() => { isEditorFocusedRef.current = true; }}
                                            onBlur={() => {
                                                isEditorFocusedRef.current = false;
                                                saveCurrentSelection();
                                                if (editorRef.current) {
                                                    const html = editorRef.current.innerHTML;
                                                    setContent(html);
                                                    triggerAutoSave({ content: html });
                                                }
                                            }}
                                            onInput={(e) => {
                                                saveCurrentSelection();
                                                const html = e.currentTarget.innerHTML;
                                                setContent(html);
                                                triggerAutoSave({ content: html });
                                            }}
                                            onPaste={handlePasteImage}
                                            onKeyUp={saveCurrentSelection}
                                            onMouseUp={saveCurrentSelection}
                                            data-placeholder={t('noteContentPlaceholder') || '상세 내용을 여기에 작성하세요... (Ctrl+V로 con trỏ chuột dán ảnh trực tiếp vào văn bản như Word)'}
                                            className="rich-note-editor w-full min-h-[220px] max-h-[580px] overflow-y-auto p-4 md:p-5 bg-gray-50/50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-800 rounded-2xl text-sm md:text-base leading-relaxed text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 transition-all font-['Pretendard',_'Noto_Sans_KR',_sans-serif] disabled:opacity-60 cursor-text select-text"
                                        />
                                    </div>

                                    {/* Uploading progress indicator */}
                                    {isUploadingImage && (
                                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/50 rounded-xl text-blue-600 dark:text-blue-300 text-xs font-bold animate-pulse">
                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>이미지를 최적화하여 첨부 중입니다...</span>
                                        </div>
                                    )}

                                    {/* Attached Images Gallery Grid */}
                                    {attachments && attachments.length > 0 && (
                                        <div className="space-y-2 pt-2">
                                            <div className="flex items-center justify-between text-xs font-bold text-gray-600 dark:text-slate-300">
                                                <div className="flex items-center gap-1.5">
                                                    <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <span>첨부된 이미지 ({attachments.length})</span>
                                                </div>
                                                <span className="text-[11px] text-gray-400">클릭하여 확대</span>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                                                {attachments.map((att) => (
                                                    <div
                                                        key={att.id}
                                                        className="group relative rounded-xl overflow-hidden border border-gray-200/80 dark:border-slate-700/80 bg-gray-100 dark:bg-slate-800/80 shadow-xs hover:shadow-md transition-all flex flex-col"
                                                    >
                                                        <div 
                                                            onClick={() => setPreviewImageModal(att)}
                                                            className="relative aspect-4/3 overflow-hidden cursor-pointer bg-slate-900/10 dark:bg-slate-950/40"
                                                        >
                                                            <img
                                                                src={att.url}
                                                                alt={att.name || '첨부 이미지'}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                                loading="lazy"
                                                            />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                                <span className="p-1.5 bg-white/90 dark:bg-slate-900/90 text-gray-700 dark:text-slate-200 rounded-lg hover:scale-110 transition-transform shadow-xs" title="확대 보기">
                                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                                                                    </svg>
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="p-2 flex items-center justify-between gap-1 text-[11px] bg-white dark:bg-slate-800/90 border-t border-gray-100 dark:border-slate-700/60">
                                                            <div className="flex flex-col min-w-0 flex-1">
                                                                <span className="truncate text-gray-700 dark:text-slate-200 font-medium" title={att.name}>
                                                                    {att.name || '이미지'}
                                                                </span>
                                                                {att.size && (
                                                                    <span className="text-[10px] text-gray-400">
                                                                        {formatFileSize(att.size)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {!isSelectedNoteTrashed && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteAttachment(att.id);
                                                                    }}
                                                                    className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                                                                    title="이미지 삭제"
                                                                >
                                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
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

                                    {!isSelectedNoteTrashed && (
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
                                    )}
                                </div>

                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 p-8 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 flex items-center justify-center mb-3 text-gray-400 dark:text-slate-500">
                                    {activeCategory === 'trash' ? Icons.trash : Icons.general}
                                </div>
                                <h3 className="text-base font-bold text-gray-700 dark:text-slate-200 mb-1">
                                    {activeCategory === 'trash' 
                                        ? '휴지통에 선택된 노트가 없습니다' 
                                        : '노트를 선택하거나 새로 만드세요'}
                                </h3>
                                <p className="text-xs md:text-sm text-gray-400 dark:text-slate-500 max-w-sm mb-4">
                                    고객 정보, 비밀번호, 아이디, 체크리스트를 안전하게 기록하고 실시간으로 공유하세요.
                                </p>
                                {activeCategory !== 'trash' && (
                                    <button
                                        onClick={handleCreateNewNote}
                                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm cursor-pointer"
                                    >
                                        + 새 노트 작성
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Lightbox Image Preview Modal */}
            {previewImageModal && (
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
                    onClick={() => setPreviewImageModal(null)}
                >
                    <div 
                        className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={previewImageModal.url}
                            alt={previewImageModal.name || '이미지 미리보기'}
                            className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/10"
                        />
                        
                        <div className="mt-3 flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700 text-white text-xs font-bold shadow-xl">
                            <span className="max-w-xs truncate text-slate-300">{previewImageModal.name}</span>
                            <span className="text-slate-600">|</span>
                            <a
                                href={previewImageModal.url}
                                target="_blank"
                                rel="noreferrer"
                                download={previewImageModal.name || 'download.webp'}
                                className="hover:text-blue-400 flex items-center gap-1 cursor-pointer transition-colors"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                <span>다운로드</span>
                            </a>
                            <span className="text-slate-600">|</span>
                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard.writeText(previewImageModal.url);
                                    Swal.fire({
                                        icon: 'success',
                                        title: '이미지 링크가 복사되었습니다',
                                        toast: true,
                                        position: 'top-end',
                                        timer: 2000,
                                        showConfirmButton: false
                                    });
                                }}
                                className="hover:text-blue-400 flex items-center gap-1 cursor-pointer transition-colors"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <span>링크 복사</span>
                            </button>
                            <span className="text-slate-600">|</span>
                            <button
                                type="button"
                                onClick={() => setPreviewImageModal(null)}
                                className="hover:text-red-400 flex items-center gap-1 cursor-pointer transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span>닫기</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
}
