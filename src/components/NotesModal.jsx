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
    const [selectedImageEl, setSelectedImageEl] = useState(null);
    const [imageToolbarPos, setImageToolbarPos] = useState(null);
    const imageInputRef = useRef(null);
    const editorRef = useRef(null);
    const editorWrapperRef = useRef(null);
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
                const cleaned = cleanContentForSave(event.data.content);
                setContent(cleaned);
                if (editorRef.current && !isEditorFocusedRef.current) {
                    editorRef.current.innerHTML = cleaned;
                }
                triggerAutoSave({ content: cleaned });
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

    // Listen for live updates from detached popout window
    useEffect(() => {
        const handlePopupMessage = (e) => {
            if (!e.data) return;
            if (e.data.type === 'JINIL_NOTE_CONTENT_UPDATE') {
                const newHtml = e.data.content || '';
                setContent(newHtml);
                if (editorRef.current && editorRef.current.innerHTML !== newHtml) {
                    editorRef.current.innerHTML = newHtml;
                }
                triggerAutoSave({ content: newHtml });
            }
            if (e.data.type === 'JINIL_NOTE_POPUP_BOUNDS_UPDATE' && e.data.bounds) {
                try {
                    localStorage.setItem('jinil_notes_popup_bounds', JSON.stringify(e.data.bounds));
                } catch (err) {}
            }
        };
        window.addEventListener('message', handlePopupMessage);
        return () => window.removeEventListener('message', handlePopupMessage);
    }, [selectedNoteId]);

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

    // Utility: Strip HTML tags to show clean text snippet in preview cards
    const stripHtml = (html) => {
        if (!html) return '';
        if (!html.includes('<') && !html.includes('>')) return html.trim();
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        const text = (tmp.textContent || tmp.innerText || '').trim();
        if (!text && html.includes('<img')) {
            return '📷 [이미지]';
        }
        return text;
    };

    // Utility: Remove residual empty tags before saving so empty notes don't store <p><br></p>
    const cleanContentForSave = (html) => {
        if (!html) return '';
        if (!html.includes('<') && !html.includes('>')) return html.trim();
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        const text = (tmp.textContent || tmp.innerText || '').trim();
        const hasImg = tmp.querySelector('img') !== null;
        if (!text && !hasImg) {
            return '';
        }
        return html;
    };

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
                const contentMatch = stripHtml(note.content || '').toLowerCase().includes(queryStr);
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

                // Create inline image element with align & draggable support
                const imgContainer = document.createElement('div');
                imgContainer.className = 'my-3 inline-image-block';
                imgContainer.setAttribute('data-align', 'center');
                imgContainer.style.textAlign = 'center';
                imgContainer.contentEditable = 'false';
                imgContainer.draggable = true;

                const img = document.createElement('img');
                img.src = finalUrl;
                img.alt = file.name || '본문 이미지';
                img.className = 'rounded-xl shadow-md border border-gray-200 dark:border-slate-700 cursor-pointer hover:opacity-95 transition-all inline-block object-contain';
                img.style.maxWidth = '100%';
                img.style.maxHeight = '500px';
                img.style.width = '100%';
                img.style.display = 'inline-block';

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

    // Image click, alignment & resizing handlers
    const handleEditorClick = (e) => {
        const clickedImg = e.target.closest('img');
        if (clickedImg && editorRef.current?.contains(clickedImg)) {
            const block = clickedImg.closest('.inline-image-block') || clickedImg.parentElement;
            setSelectedImageEl({ img: clickedImg, block });

            if (editorWrapperRef.current) {
                const wrapperRect = editorWrapperRef.current.getBoundingClientRect();
                const imgRect = clickedImg.getBoundingClientRect();
                setImageToolbarPos({
                    top: Math.max(8, imgRect.top - wrapperRect.top - 46),
                    left: Math.max(12, imgRect.left - wrapperRect.left + (imgRect.width / 2) - 160)
                });
            }
        } else if (!e.target.closest('.image-floating-toolbar')) {
            setSelectedImageEl(null);
            setImageToolbarPos(null);
        }
    };

    const handleAlignImage = (align) => {
        if (!selectedImageEl) return;
        const { block, img } = selectedImageEl;
        if (block) {
            block.style.textAlign = align;
            block.setAttribute('data-align', align);
        }
        if (img) {
            img.style.display = 'inline-block';
        }
        if (editorRef.current) {
            const html = editorRef.current.innerHTML;
            setContent(html);
            triggerAutoSave({ content: html });
        }
        setTimeout(() => {
            if (selectedImageEl?.img && editorWrapperRef.current) {
                const wrapperRect = editorWrapperRef.current.getBoundingClientRect();
                const imgRect = selectedImageEl.img.getBoundingClientRect();
                setImageToolbarPos({
                    top: Math.max(8, imgRect.top - wrapperRect.top - 46),
                    left: Math.max(12, imgRect.left - wrapperRect.left + (imgRect.width / 2) - 160)
                });
            }
        }, 60);
    };

    const handleResizeImage = (widthPercent) => {
        if (!selectedImageEl) return;
        const { img } = selectedImageEl;
        if (img) {
            img.style.width = widthPercent;
            img.setAttribute('data-size', widthPercent);
        }
        if (editorRef.current) {
            const html = editorRef.current.innerHTML;
            setContent(html);
            triggerAutoSave({ content: html });
        }
        setTimeout(() => {
            if (selectedImageEl?.img && editorWrapperRef.current) {
                const wrapperRect = editorWrapperRef.current.getBoundingClientRect();
                const imgRect = selectedImageEl.img.getBoundingClientRect();
                setImageToolbarPos({
                    top: Math.max(8, imgRect.top - wrapperRect.top - 46),
                    left: Math.max(12, imgRect.left - wrapperRect.left + (imgRect.width / 2) - 160)
                });
            }
        }, 60);
    };

    const handleDeleteSelectedImage = () => {
        if (!selectedImageEl) return;
        const { block, img } = selectedImageEl;
        if (block && block.classList.contains('inline-image-block')) {
            block.remove();
        } else if (img) {
            img.remove();
        }
        setSelectedImageEl(null);
        setImageToolbarPos(null);
        if (editorRef.current) {
            const html = editorRef.current.innerHTML;
            setContent(html);
            triggerAutoSave({ content: html });
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

    // Detached Browser Popup Window with MiniWidget-Style Toss & Kakao Theme & Wallpaper System + Sticky Note Mode
    const handleOpenExternalWindow = (startAsSticky = false) => {
        const noteTitle = title || '메모 본문';
        const noteHtml = content || '';
        
        let isSticky = startAsSticky;
        if (!startAsSticky) {
            try {
                isSticky = localStorage.getItem('jinil_notes_is_sticky') === 'true';
            } catch (e) {}
        }

        const screenAvailW = window.screen.availWidth || window.screen.width || 1920;
        const screenAvailH = window.screen.availHeight || window.screen.height || 1080;

        let w = isSticky ? 380 : 840;
        let h = isSticky ? 500 : 740;
        let left = isSticky ? Math.max(0, screenAvailW - w - 40) : Math.max(0, Math.round((screenAvailW - w) / 2));
        let top = isSticky ? 50 : Math.max(0, Math.round((screenAvailH - h) / 2));

        try {
            const boundsKey = isSticky ? 'jinil_notes_sticky_bounds' : 'jinil_notes_popup_bounds';
            const savedBoundsStr = localStorage.getItem(boundsKey);
            if (savedBoundsStr) {
                const b = JSON.parse(savedBoundsStr);
                if (b.width && b.height) {
                    w = isSticky ? Math.min(600, Math.max(280, b.width)) : Math.min(screenAvailW, Math.max(340, b.width));
                    h = isSticky ? Math.min(800, Math.max(260, b.height)) : Math.min(screenAvailH, Math.max(280, b.height));
                }
                if (b.left !== undefined && b.top !== undefined) {
                    left = Math.min(Math.max(0, b.left), Math.max(0, screenAvailW - 120));
                    top = Math.min(Math.max(0, b.top), Math.max(0, screenAvailH - 120));
                }
            }
        } catch (e) {}

        const popup = window.open('', '_blank', `width=${w},height=${h},top=${top},left=${left},resizable=yes,scrollbars=yes`);
        if (!popup) return;

        const safeTitle = noteTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeJsonData = JSON.stringify({ content: noteHtml, isSticky: isSticky }).replace(/<\/script>/gi, '<\\/script>');

        popup.document.write(`
            <!DOCTYPE html>
            <html lang="ko">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${safeTitle} - 진일 메모</title>
                <link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    
                    :root {
                        --bg-body: #090d16;
                        --card-bg: rgba(15, 23, 42, 0.94);
                        --header-bg: rgba(30, 41, 59, 0.7);
                        --header-border: rgba(255, 255, 255, 0.08);
                        --text-main: #f8fafc;
                        --text-muted: #94a3b8;
                        --textarea-bg: rgba(2, 6, 23, 0.6);
                        --textarea-border: rgba(255, 255, 255, 0.08);
                        --border-color: rgba(255, 255, 255, 0.1);
                        --btn-bg: rgba(255, 255, 255, 0.06);
                        --btn-text: #e2e8f0;
                        --btn-border: rgba(255, 255, 255, 0.12);
                        --btn-hover-bg: rgba(255, 255, 255, 0.14);
                        --btn-hover-text: #ffffff;
                        --btn-hover-border: rgba(255, 255, 255, 0.25);
                        --accent-color: #3b82f6;
                        --footer-bg: rgba(15, 23, 42, 0.85);
                        --window-opacity: 1;
                    }

                    body {
                        padding: 8px;
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
                        -webkit-font-smoothing: antialiased;
                    }

                    .app-container {
                        display: flex;
                        flex-direction: column;
                        height: 100%;
                        background-color: var(--card-bg);
                        border: 1px solid var(--border-color);
                        border-radius: 14px;
                        overflow: hidden;
                        box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06);
                        backdrop-filter: blur(20px);
                        -webkit-backdrop-filter: blur(20px);
                        opacity: var(--window-opacity);
                        transition: opacity 0.2s ease, all 0.2s ease;
                    }

                    /* 🌟 Modern Minimalist Header */
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 8px 12px;
                        background-color: var(--header-bg);
                        border-bottom: 1px solid var(--header-border);
                        gap: 8px;
                        min-height: 46px;
                        box-sizing: border-box;
                        transition: all 0.2s ease;
                        flex-shrink: 0;
                        user-select: none;
                    }

                    .title-group {
                        display: flex;
                        align-items: center;
                        gap: 7px;
                        min-width: 0;
                        flex: 1 1 auto;
                    }

                    .title-icon {
                        width: 14px;
                        height: 14px;
                        color: var(--text-muted);
                        flex-shrink: 0;
                    }

                    .title-text {
                        font-size: 13px;
                        font-weight: 700;
                        letter-spacing: -0.01em;
                        color: var(--text-main);
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        min-width: 0;
                    }

                    .toolbar {
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        flex-wrap: nowrap;
                        flex-shrink: 0;
                    }

                    /* 💎 Minimalist Unified Action Buttons */
                    .btn {
                        height: 29px;
                        padding: 0 8px;
                        border-radius: 7px;
                        font-weight: 600;
                        font-size: 11.5px;
                        letter-spacing: -0.01em;
                        cursor: pointer;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        gap: 4.5px;
                        white-space: nowrap;
                        transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
                        user-select: none;
                        box-sizing: border-box;
                        line-height: 1;
                        background-color: var(--btn-bg);
                        color: var(--btn-text);
                        border: 1px solid var(--btn-border);
                        backdrop-filter: blur(6px);
                    }

                    .btn:hover {
                        background-color: var(--btn-hover-bg);
                        color: var(--btn-hover-text);
                        border-color: var(--btn-hover-border);
                        transform: translateY(-1px);
                    }

                    .btn:active {
                        transform: translateY(0);
                    }

                    .btn-svg {
                        width: 13px;
                        height: 13px;
                        flex-shrink: 0;
                    }

                    /* 📌 Sticky Pin Button */
                    .btn-sticky {
                        color: var(--btn-text);
                    }

                    .btn-sticky.active-sticky {
                        background: rgba(245, 158, 11, 0.16) !important;
                        color: #fbbf24 !important;
                        border-color: rgba(245, 158, 11, 0.45) !important;
                        box-shadow: 0 0 10px rgba(245, 158, 11, 0.2);
                    }

                    /* 🪟 Opacity Dial Button */
                    .btn-trans {
                        font-variant-numeric: tabular-nums;
                    }

                    .btn-trans.active-trans {
                        background: rgba(59, 130, 246, 0.18) !important;
                        color: #93c5fd !important;
                        border-color: rgba(59, 130, 246, 0.45) !important;
                        box-shadow: 0 0 10px rgba(59, 130, 246, 0.2);
                    }

                    /* 🔤 Minimalist Font Size Stepper Pill */
                    .font-stepper {
                        height: 29px;
                        display: inline-flex;
                        align-items: center;
                        background-color: var(--btn-bg);
                        border-radius: 7px;
                        border: 1px solid var(--btn-border);
                        padding: 2px;
                        box-sizing: border-box;
                    }

                    .font-stepper button {
                        height: 23px;
                        padding: 0 5px;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        background: transparent;
                        border: none;
                        color: var(--btn-text);
                        font-weight: 700;
                        font-size: 10.5px;
                        cursor: pointer;
                        border-radius: 5px;
                        transition: background 0.15s, color 0.15s;
                    }

                    .font-stepper button:hover {
                        background-color: var(--btn-hover-bg);
                        color: var(--btn-hover-text);
                    }

                    .font-display {
                        font-size: 10.5px;
                        font-weight: 700;
                        color: var(--text-muted);
                        padding: 0 3px;
                        user-select: none;
                        font-variant-numeric: tabular-nums;
                    }

                    /* Close button */
                    .btn-close:hover {
                        background-color: rgba(239, 68, 68, 0.18) !important;
                        color: #fca5a5 !important;
                        border-color: rgba(239, 68, 68, 0.35) !important;
                    }

                    /* 📝 Editor Container */
                    .editor-wrap {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        padding: 8px 12px;
                        min-height: 0;
                    }

                    .rich-editor {
                        flex: 1;
                        width: 100%;
                        background-color: var(--textarea-bg);
                        border: 1px solid var(--textarea-border);
                        color: var(--text-main);
                        border-radius: 10px;
                        padding: 12px 14px;
                        font-size: 15px;
                        line-height: 1.65;
                        letter-spacing: -0.01em;
                        outline: none;
                        font-family: "Pretendard", sans-serif;
                        box-shadow: inset 0 1px 3px rgba(0,0,0,0.12);
                        transition: border-color 0.2s ease, box-shadow 0.2s ease;
                        overflow-y: auto;
                        min-height: 0;
                        cursor: text;
                        user-select: text;
                        word-break: break-word;
                        overflow-wrap: break-word;
                    }

                    .rich-editor:focus {
                        border-color: var(--accent-color);
                        box-shadow: 0 0 0 2.5px rgba(59, 130, 246, 0.25), inset 0 1px 3px rgba(0,0,0,0.12);
                    }

                    .rich-editor:empty:before {
                        content: "메모 내용을 입력하세요... (Ctrl+V로 이미지 직접 첨부)";
                        color: var(--text-muted);
                        opacity: 0.6;
                        pointer-events: none;
                        display: block;
                    }

                    /* Custom sleek scrollbar */
                    .rich-editor::-webkit-scrollbar {
                        width: 5px;
                    }
                    .rich-editor::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .rich-editor::-webkit-scrollbar-thumb {
                        background: rgba(255, 255, 255, 0.15);
                        border-radius: 4px;
                    }
                    .rich-editor::-webkit-scrollbar-thumb:hover {
                        background: rgba(255, 255, 255, 0.3);
                    }

                    /* Inline pasted images */
                    .inline-image-block {
                        margin: 8px 0;
                        display: inline-block;
                        max-width: 100%;
                        user-select: none;
                    }

                    .inline-image-block img {
                        max-width: 100%;
                        max-height: 480px;
                        object-fit: contain;
                        border-radius: 8px;
                        border: 1px solid var(--border-color);
                        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
                        display: block;
                    }

                    /* 📊 Footer Status Bar */
                    .footer {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 6px 12px;
                        background-color: var(--footer-bg);
                        border-top: 1px solid var(--header-border);
                        font-size: 11px;
                        color: var(--text-muted);
                        gap: 8px;
                        flex-shrink: 0;
                        user-select: none;
                    }

                    .sync-status {
                        display: flex;
                        align-items: center;
                        gap: 5px;
                        min-width: 0;
                    }

                    .status-dot {
                        width: 6px;
                        height: 6px;
                        background-color: #10b981;
                        border-radius: 50%;
                        display: inline-block;
                        box-shadow: 0 0 6px #10b981;
                        flex-shrink: 0;
                    }

                    .stats-group {
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        white-space: nowrap;
                        flex-shrink: 0;
                        font-variant-numeric: tabular-nums;
                    }

                    /* 🌟 ULTRA-COMPACT STICKY NOTE MODE STYLES */
                    body.sticky-mode {
                        padding: 3px;
                        background-color: transparent !important;
                    }

                    body.sticky-mode .app-container {
                        border-radius: 12px;
                        box-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.1);
                    }

                    body.sticky-mode .header {
                        padding: 4px 8px;
                        min-height: 36px;
                        height: 36px;
                        gap: 4px;
                    }

                    body.sticky-mode .title-text {
                        font-size: 12px;
                        max-width: 100px;
                    }

                    body.sticky-mode .btn {
                        height: 25px;
                        padding: 0 5.5px;
                        font-size: 10.5px;
                        border-radius: 6px;
                        gap: 3.5px;
                    }

                    body.sticky-mode .btn-svg {
                        width: 11.5px;
                        height: 11.5px;
                    }

                    body.sticky-mode .font-stepper,
                    body.sticky-mode .btn-print,
                    body.sticky-mode .sync-text {
                        display: none !important;
                    }

                    body.sticky-mode .editor-wrap {
                        padding: 4px 8px;
                    }

                    body.sticky-mode .rich-editor {
                        padding: 8px 10px;
                        border-radius: 8px;
                        font-size: 13.5px;
                        line-height: 1.55;
                    }

                    body.sticky-mode .footer {
                        padding: 3px 8px;
                        font-size: 10px;
                        min-height: 22px;
                    }

                    /* 📱 Responsive optimizations */
                    @media (max-width: 520px) {
                        body { padding: 4px; }
                        .header { padding: 5px 8px; min-height: 38px; gap: 4px; }
                        .title-text { font-size: 12px; max-width: 90px; }
                        .editor-wrap { padding: 5px 8px; }
                        .rich-editor { padding: 8px 10px; font-size: 13.5px; }
                        .btn { height: 26px; padding: 0 5px; font-size: 10.5px; }
                        .font-stepper { display: none !important; }
                        .btn-print { display: none !important; }
                        .sync-text { display: none; }
                        .footer { padding: 4px 8px; font-size: 10px; }
                    }

                    /* 🎨 Theme Selector Modal Dialog */
                    .modal-backdrop {
                        position: fixed;
                        inset: 0;
                        background: rgba(0, 0, 0, 0.7);
                        backdrop-filter: blur(8px);
                        -webkit-backdrop-filter: blur(8px);
                        z-index: 9999;
                        display: none;
                        align-items: center;
                        justify-content: center;
                        padding: 16px;
                    }

                    .modal-backdrop.show {
                        display: flex;
                    }

                    .theme-modal {
                        background: #0f172a;
                        border: 1px solid rgba(255, 255, 255, 0.12);
                        border-radius: 16px;
                        width: 100%;
                        max-width: 440px;
                        max-height: 85vh;
                        display: flex;
                        flex-direction: column;
                        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
                        overflow: hidden;
                        transform: scale(0.96);
                        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                    }

                    .modal-backdrop.show .theme-modal {
                        transform: scale(1);
                    }

                    .modal-header {
                        padding: 14px 18px;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background: #1e293b;
                    }

                    .modal-title-wrap {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }

                    .modal-icon {
                        width: 28px;
                        height: 28px;
                        border-radius: 8px;
                        background: linear-gradient(135deg, #2563eb, #7c3aed);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .modal-header h3 {
                        font-size: 14px;
                        font-weight: 700;
                        color: #ffffff;
                    }

                    .modal-header p {
                        font-size: 11px;
                        color: #94a3b8;
                    }

                    .modal-close-btn {
                        background: rgba(255, 255, 255, 0.08);
                        border: none;
                        color: #94a3b8;
                        width: 26px;
                        height: 26px;
                        border-radius: 6px;
                        font-size: 12px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.15s;
                    }

                    .modal-close-btn:hover {
                        background: rgba(255, 255, 255, 0.18);
                        color: #ffffff;
                    }

                    .tab-switcher {
                        display: flex;
                        padding: 8px 16px 0;
                        background: #0f172a;
                        gap: 8px;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    }

                    .tab-btn {
                        padding: 7px 12px;
                        font-size: 11.5px;
                        font-weight: 700;
                        color: #94a3b8;
                        background: transparent;
                        border: none;
                        border-bottom: 2px solid transparent;
                        cursor: pointer;
                        transition: all 0.15s;
                    }

                    .tab-btn:hover {
                        color: #ffffff;
                    }

                    .tab-btn.active-theme {
                        color: #3b82f6;
                        border-bottom-color: #3b82f6;
                    }

                    .tab-btn.active-wp {
                        color: #a855f7;
                        border-bottom-color: #a855f7;
                    }

                    .modal-body {
                        padding: 14px 16px;
                        overflow-y: auto;
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                    }

                    .theme-list {
                        display: flex;
                        flex-direction: column;
                        gap: 7px;
                    }

                    .theme-card {
                        background: #1e293b;
                        border: 1px solid rgba(255, 255, 255, 0.08);
                        border-radius: 10px;
                        padding: 9px 12px;
                        cursor: pointer;
                        transition: all 0.15s ease;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    }

                    .theme-card:hover {
                        border-color: rgba(59, 130, 246, 0.4);
                        background: #273549;
                    }

                    .theme-card.active {
                        border-color: #3b82f6;
                        background: rgba(59, 130, 246, 0.12);
                    }

                    .theme-card-left {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }

                    .theme-mini-thumb {
                        width: 24px;
                        height: 24px;
                        border-radius: 6px;
                        border: 1px solid rgba(255, 255, 255, 0.15);
                        overflow: hidden;
                        display: flex;
                        flex-direction: column;
                    }

                    .theme-mini-header {
                        height: 8px;
                    }

                    .theme-mini-body {
                        flex: 1;
                        padding: 2px;
                    }

                    .theme-mini-inner {
                        width: 100%;
                        height: 100%;
                        border-radius: 2px;
                    }

                    .theme-card-name {
                        font-size: 12px;
                        font-weight: 700;
                        color: #ffffff;
                    }

                    .theme-card-cat {
                        font-size: 10px;
                        color: #94a3b8;
                    }

                    .check-badge {
                        width: 18px;
                        height: 18px;
                        border-radius: 50%;
                        background: #3b82f6;
                        color: #ffffff;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 10px;
                        font-weight: 900;
                    }

                    .radio-circle {
                        width: 16px;
                        height: 16px;
                        border-radius: 50%;
                        border: 1.5px solid rgba(255, 255, 255, 0.2);
                    }

                    .wallpaper-grid {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 8px;
                    }

                    .wp-card {
                        border: 1.5px solid rgba(255, 255, 255, 0.08);
                        border-radius: 10px;
                        height: 70px;
                        cursor: pointer;
                        position: relative;
                        overflow: hidden;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        padding: 6px 8px;
                        transition: all 0.15s;
                    }

                    .wp-card:hover {
                        border-color: rgba(168, 85, 247, 0.5);
                        transform: translateY(-1px);
                    }

                    .wp-card.active {
                        border-color: #a855f7;
                        box-shadow: 0 0 10px rgba(168, 85, 247, 0.3);
                    }

                    .wp-card-bg {
                        position: absolute;
                        inset: 0;
                        z-index: 0;
                    }

                    .wp-card-top, .wp-card-bot {
                        position: relative;
                        z-index: 1;
                    }

                    .wp-card-name {
                        font-size: 10.5px;
                        font-weight: 700;
                        color: #ffffff;
                    }

                    .upload-box {
                        display: flex;
                        flex-direction: column;
                        gap: 6px;
                        padding: 10px;
                        background: #1e293b;
                        border-radius: 10px;
                        border: 1px dashed rgba(255, 255, 255, 0.15);
                    }

                    .upload-label {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                        padding: 6px;
                        background: rgba(255, 255, 255, 0.08);
                        border-radius: 6px;
                        color: #e2e8f0;
                        font-size: 11px;
                        font-weight: 700;
                        cursor: pointer;
                    }

                    .url-input {
                        background: rgba(0, 0, 0, 0.3);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 6px;
                        padding: 6px 8px;
                        font-size: 11px;
                        color: #ffffff;
                        outline: none;
                    }

                    .apply-btn {
                        background: linear-gradient(135deg, #2563eb, #7c3aed);
                        color: #ffffff;
                        border: none;
                        padding: 9px 18px;
                        border-radius: 9px;
                        font-size: 12px;
                        font-weight: 800;
                        cursor: pointer;
                        margin: 10px 16px 14px;
                    }
                </style>
            </head>
            <body class="${isSticky ? 'sticky-mode' : ''}">
                <!-- Safe Raw Note Data payload -->
                <script id="initialNoteData" type="application/json">
                    ${safeJsonData}
                </script>

                <div class="app-container" id="appContainer">
                    <!-- Modern Minimalist Header -->
                    <div class="header" id="appHeader">
                        <div class="title-group">
                            <span id="appBadgeIcon">
                                ${isSticky ? `
                                <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="color:#fbbf24;">
                                    <path d="M12 2v8M5 5l14 14M19 5l-4 4M5 19l4-4M15 15l4 4"/>
                                    <circle cx="12" cy="12" r="3" fill="currentColor"/>
                                </svg>
                                ` : `
                                <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14 2 14 8 20 8"/>
                                    <line x1="16" y1="13" x2="8" y2="13"/>
                                    <line x1="16" y1="17" x2="8" y2="17"/>
                                </svg>
                                `}
                            </span>
                            <div class="title-text" id="appTitle" title="${safeTitle}">${safeTitle}</div>
                        </div>

                        <div class="toolbar">
                            <!-- 📌 Sticky Pin Mode Toggle Button -->
                            <button id="stickyToggleBtn" class="btn btn-sticky ${isSticky ? 'active-sticky' : ''}" onclick="window.toggleStickyMode()" title="스티키 모드 전환 (Alt+S)">
                                <svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M12 2v8M5 5l14 14M19 5l-4 4M5 19l4-4M15 15l4 4"/>
                                    <circle cx="12" cy="12" r="3" fill="currentColor"/>
                                </svg>
                                <span id="stickyBtnText">${isSticky ? 'ON' : '스티키'}</span>
                            </button>

                            <!-- 🪟 Taste-Skill Premium Opacity & Glass Transparency Button -->
                            <button id="opacityBtn" class="btn btn-trans" onclick="window.cycleOpacity()" title="창 투명도 조절 (Alt+O)">
                                <svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="9" />
                                    <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" fill-opacity="0.45" />
                                </svg>
                                <span id="opacityValText">100%</span>
                            </button>

                            <!-- 🎨 Theme Settings Button -->
                            <button class="btn" onclick="window.openThemeModal()" title="테마 설정 (Alt+T)">
                                <svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
                                    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
                                    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
                                    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
                                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2Z"/>
                                </svg>
                            </button>

                            <!-- 🔤 Font Stepper (Hidden in sticky mode) -->
                            <div class="font-stepper">
                                <button onclick="window.changeFontSize(-2)" title="글자 축소">A-</button>
                                <span id="fontSizeDisplay" class="font-display">16px</span>
                                <button onclick="window.changeFontSize(2)" title="글자 확대">A+</button>
                            </div>

                            <!-- 📋 Copy Button -->
                            <button id="copyBtn" class="btn" onclick="window.copyContent()" title="전체 복사 (Ctrl+Shift+C)">
                                <svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                                <span id="copyBtnText">복사</span>
                            </button>

                            <!-- 🖨️ Print Button (Hidden in sticky mode) -->
                            <button class="btn btn-print" onclick="window.print()" title="인쇄">
                                <svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                    <rect x="6" y="14" width="12" height="8"></rect>
                                </svg>
                            </button>

                            <!-- ✕ Close Button -->
                            <button class="btn btn-close" onclick="window.close()" title="창 닫기 (Esc)">
                                <svg class="btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <!-- Editor Wrap -->
                    <div class="editor-wrap">
                        <div id="editor" contenteditable="true" spellcheck="false" autocorrect="off" autocapitalize="off" autocomplete="off" class="rich-editor"></div>
                    </div>

                    <!-- Footer Status Bar -->
                    <div class="footer" id="appFooter">
                        <div class="sync-status">
                            <span class="status-dot"></span>
                            <span class="sync-text">실시간 동기화</span>
                        </div>
                        <div class="stats-group">
                            <span id="charCount">0자</span>
                            <span>·</span>
                            <span id="wordCount">0단어</span>
                            <span>·</span>
                            <span id="lineCount">0줄</span>
                        </div>
                    </div>
                </div>

                <!-- Theme & Wallpaper Modal Dialog -->
                <div id="themeModalBackdrop" class="modal-backdrop" onclick="window.closeThemeModalOnBackdrop(event)">
                    <div class="theme-modal">
                        <div class="modal-header">
                            <div class="modal-title-wrap">
                                <div class="modal-icon">
                                    <svg style="width:15px; height:15px;" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M7 21a4 4 0 0 1-4-4V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v12a4 4 0 0 1-4 4zm0 0h12a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 0 1 2.828 0l2.829 2.829a2 2 0 0 1 0 2.828l-8.486 8.485M7 17h.01" />
                                    </svg>
                                </div>
                                <div>
                                    <h3>테마 및 배경 설정</h3>
                                    <p>미니멀 프리미엄 디자인</p>
                                </div>
                            </div>
                            <button class="modal-close-btn" onclick="window.closeThemeModal()">✕</button>
                        </div>

                        <div class="tab-switcher">
                            <button id="tabThemeBtn" class="tab-btn active-theme" onclick="window.switchModalTab('themes')">UI 테마</button>
                            <button id="tabWpBtn" class="tab-btn" onclick="window.switchModalTab('wallpapers')">배경화면</button>
                        </div>

                        <!-- Tab 1: Themes -->
                        <div id="themeTabContent">
                            <div class="modal-body">
                                <div class="theme-list">
                                    <div class="theme-card" data-theme="toss-dark" onclick="window.selectTheme('toss-dark')">
                                        <div class="theme-card-left">
                                            <div class="theme-mini-thumb" style="background:#090d16;">
                                                <div class="theme-mini-header" style="background:#1e293b;"></div>
                                                <div class="theme-mini-body"><div class="theme-mini-inner" style="background:#3b82f6;"></div></div>
                                            </div>
                                            <div>
                                                <div class="theme-card-name">다크 슬레이트 (Dark Slate)</div>
                                                <div class="theme-card-cat">기본 추천 · Linear Style</div>
                                            </div>
                                        </div>
                                        <div class="check-slot"></div>
                                    </div>

                                    <div class="theme-card" data-theme="toss-light" onclick="window.selectTheme('toss-light')">
                                        <div class="theme-card-left">
                                            <div class="theme-mini-thumb" style="background:#f8fafc;">
                                                <div class="theme-mini-header" style="background:#ffffff; border-bottom:1px solid #e2e8f0;"></div>
                                                <div class="theme-mini-body"><div class="theme-mini-inner" style="background:#2563eb;"></div></div>
                                            </div>
                                            <div>
                                                <div class="theme-card-name">모던 라이트 (Modern Light)</div>
                                                <div class="theme-card-cat">화이트 · Apple Style</div>
                                            </div>
                                        </div>
                                        <div class="check-slot"></div>
                                    </div>

                                    <div class="theme-card" data-theme="oled-black" onclick="window.selectTheme('oled-black')">
                                        <div class="theme-card-left">
                                            <div class="theme-mini-thumb" style="background:#000000;">
                                                <div class="theme-mini-header" style="background:#111111;"></div>
                                                <div class="theme-mini-body"><div class="theme-mini-inner" style="background:#ffffff;"></div></div>
                                            </div>
                                            <div>
                                                <div class="theme-card-name">OLED 블랙 (True Black)</div>
                                                <div class="theme-card-cat">고대비 미니멀</div>
                                            </div>
                                        </div>
                                        <div class="check-slot"></div>
                                    </div>

                                    <div class="theme-card" data-theme="kakao-yellow" onclick="window.selectTheme('kakao-yellow')">
                                        <div class="theme-card-left">
                                            <div class="theme-mini-thumb" style="background:#FAF9F5;">
                                                <div class="theme-mini-header" style="background:#FEE500;"></div>
                                                <div class="theme-mini-body"><div class="theme-mini-inner" style="background:#191919;"></div></div>
                                            </div>
                                            <div>
                                                <div class="theme-card-name">카카오 웜 (Warm Cream)</div>
                                                <div class="theme-card-cat">부드러운 크림 옐로우</div>
                                            </div>
                                        </div>
                                        <div class="check-slot"></div>
                                    </div>

                                    <div class="theme-card" data-theme="kakao-dark" onclick="window.selectTheme('kakao-dark')">
                                        <div class="theme-card-left">
                                            <div class="theme-mini-thumb" style="background:#141414;">
                                                <div class="theme-mini-header" style="background:#222222;"></div>
                                                <div class="theme-mini-body"><div class="theme-mini-inner" style="background:#f59e0b;"></div></div>
                                            </div>
                                            <div>
                                                <div class="theme-card-name">차콜 엠버 (Charcoal Amber)</div>
                                                <div class="theme-card-cat">고급스러운 다크 골드</div>
                                            </div>
                                        </div>
                                        <div class="check-slot"></div>
                                    </div>

                                    <div class="theme-card" data-theme="emerald-mint" onclick="window.selectTheme('emerald-mint')">
                                        <div class="theme-card-left">
                                            <div class="theme-mini-thumb" style="background:#02160f;">
                                                <div class="theme-mini-header" style="background:#083024;"></div>
                                                <div class="theme-mini-body"><div class="theme-mini-inner" style="background:#10b981;"></div></div>
                                            </div>
                                            <div>
                                                <div class="theme-card-name">에메랄드 민트 (Emerald Forest)</div>
                                                <div class="theme-card-cat">편안한 딥그린</div>
                                            </div>
                                        </div>
                                        <div class="check-slot"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Tab 2: Wallpapers -->
                        <div id="wallpaperTabContent" style="display: none;">
                            <div class="modal-body">
                                <div class="wallpaper-grid">
                                    <div class="wp-card" data-wp="orbs" onclick="window.selectWallpaper('orbs')">
                                        <div class="wp-card-bg" style="background: linear-gradient(135deg, #7c3aed, #2563eb, #ec4899);"></div>
                                        <div class="wp-card-bot"><div class="wp-card-name">오로라</div></div>
                                    </div>
                                    <div class="wp-card" data-wp="mesh" onclick="window.selectWallpaper('mesh')">
                                        <div class="wp-card-bg" style="background: linear-gradient(135deg, #1e40af, #0d9488, #16a34a);"></div>
                                        <div class="wp-card-bot"><div class="wp-card-name">그라디언트</div></div>
                                    </div>
                                    <div class="wp-card" data-wp="grid" onclick="window.selectWallpaper('grid')">
                                        <div class="wp-card-bg" style="background: #0f172a; background-image: linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px); background-size: 14px 14px;"></div>
                                        <div class="wp-card-bot"><div class="wp-card-name">그리드</div></div>
                                    </div>
                                    <div class="wp-card" data-wp="dots" onclick="window.selectWallpaper('dots')">
                                        <div class="wp-card-bg" style="background: #0f172a; background-image: radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px); background-size: 12px 12px;"></div>
                                        <div class="wp-card-bot"><div class="wp-card-name">도트</div></div>
                                    </div>
                                    <div class="wp-card" data-wp="sunset" onclick="window.selectWallpaper('sunset')">
                                        <div class="wp-card-bg" style="background: linear-gradient(135deg, #ea580c, #db2777, #7c3aed);"></div>
                                        <div class="wp-card-bot"><div class="wp-card-name">선셋</div></div>
                                    </div>
                                    <div class="wp-card" data-wp="none" onclick="window.selectWallpaper('none')">
                                        <div class="wp-card-bg" style="background: rgba(255,255,255,0.05);"></div>
                                        <div class="wp-card-bot"><div class="wp-card-name">배경 없음</div></div>
                                    </div>
                                </div>

                                <div class="upload-box">
                                    <label class="upload-label" for="wpFileInput">
                                        <svg style="width:13px;height:13px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                                        </svg>
                                        <span>PC에서 배경 사진 업로드</span>
                                    </label>
                                    <input type="file" id="wpFileInput" accept="image/*" style="display: none;" onchange="window.handleFileUpload(event)">
                                    <input type="text" class="url-input" placeholder="웹 이미지 URL (https://...)" onchange="window.handleUrlInput(event)">
                                </div>
                            </div>
                        </div>

                        <button class="apply-btn" onclick="window.closeThemeModal()">설정 완료</button>
                    </div>
                </div>

                <script>
                    const THEME_PRESETS = {
                        'toss-dark': {
                            bgBody: '#090d16', cardBg: 'rgba(15, 23, 42, 0.94)', headerBg: 'rgba(30, 41, 59, 0.75)', headerBorder: 'rgba(255, 255, 255, 0.08)',
                            textMain: '#f8fafc', textMuted: '#94a3b8', textareaBg: 'rgba(2, 6, 23, 0.65)', textareaBorder: 'rgba(255, 255, 255, 0.08)',
                            borderColor: 'rgba(255, 255, 255, 0.1)', btnBg: 'rgba(255, 255, 255, 0.06)', btnText: '#e2e8f0',
                            btnBorder: 'rgba(255, 255, 255, 0.12)', btnHoverBg: 'rgba(255, 255, 255, 0.14)', btnHoverText: '#ffffff',
                            btnHoverBorder: 'rgba(255, 255, 255, 0.25)', accentColor: '#3b82f6', footerBg: 'rgba(15, 23, 42, 0.85)'
                        },
                        'toss-light': {
                            bgBody: '#f1f5f9', cardBg: 'rgba(255, 255, 255, 0.96)', headerBg: 'rgba(248, 250, 252, 0.9)', headerBorder: 'rgba(0, 0, 0, 0.07)',
                            textMain: '#0f172a', textMuted: '#64748b', textareaBg: '#ffffff', textareaBorder: 'rgba(0, 0, 0, 0.09)',
                            borderColor: 'rgba(0, 0, 0, 0.1)', btnBg: 'rgba(0, 0, 0, 0.04)', btnText: '#334155',
                            btnBorder: 'rgba(0, 0, 0, 0.08)', btnHoverBg: 'rgba(0, 0, 0, 0.08)', btnHoverText: '#0f172a',
                            btnHoverBorder: 'rgba(0, 0, 0, 0.16)', accentColor: '#2563eb', footerBg: 'rgba(248, 250, 252, 0.95)'
                        },
                        'oled-black': {
                            bgBody: '#000000', cardBg: '#050505', headerBg: '#0e0e0e', headerBorder: 'rgba(255, 255, 255, 0.1)',
                            textMain: '#ffffff', textMuted: '#888888', textareaBg: '#000000', textareaBorder: 'rgba(255, 255, 255, 0.1)',
                            borderColor: 'rgba(255, 255, 255, 0.15)', btnBg: 'rgba(255, 255, 255, 0.08)', btnText: '#e5e5e5',
                            btnBorder: 'rgba(255, 255, 255, 0.15)', btnHoverBg: 'rgba(255, 255, 255, 0.18)', btnHoverText: '#ffffff',
                            btnHoverBorder: 'rgba(255, 255, 255, 0.3)', accentColor: '#ffffff', footerBg: '#080808'
                        },
                        'kakao-yellow': {
                            bgBody: '#f7f5ed', cardBg: 'rgba(253, 252, 248, 0.96)', headerBg: '#FEE500', headerBorder: 'rgba(0, 0, 0, 0.08)',
                            textMain: '#191919', textMuted: '#666666', textareaBg: '#ffffff', textareaBorder: '#e6e3d8',
                            borderColor: 'rgba(0, 0, 0, 0.08)', btnBg: 'rgba(0, 0, 0, 0.06)', btnText: '#191919',
                            btnBorder: 'rgba(0, 0, 0, 0.1)', btnHoverBg: 'rgba(0, 0, 0, 0.12)', btnHoverText: '#000000',
                            btnHoverBorder: 'rgba(0, 0, 0, 0.2)', accentColor: '#191919', footerBg: '#f2efe4'
                        },
                        'kakao-dark': {
                            bgBody: '#111111', cardBg: 'rgba(20, 20, 20, 0.96)', headerBg: '#1c1c1c', headerBorder: 'rgba(255, 255, 255, 0.07)',
                            textMain: '#f5f5f5', textMuted: '#8c8c8c', textareaBg: '#141414', textareaBorder: 'rgba(255, 255, 255, 0.08)',
                            borderColor: 'rgba(255, 255, 255, 0.08)', btnBg: 'rgba(255, 255, 255, 0.06)', btnText: '#d4d4d4',
                            btnBorder: 'rgba(255, 255, 255, 0.1)', btnHoverBg: 'rgba(255, 255, 255, 0.14)', btnHoverText: '#ffffff',
                            btnHoverBorder: 'rgba(255, 255, 255, 0.22)', accentColor: '#f59e0b', footerBg: '#141414'
                        },
                        'emerald-mint': {
                            bgBody: '#02160f', cardBg: 'rgba(4, 34, 25, 0.94)', headerBg: 'rgba(8, 48, 36, 0.8)', headerBorder: 'rgba(16, 185, 129, 0.15)',
                            textMain: '#e6fbf2', textMuted: '#7dd3b6', textareaBg: 'rgba(1, 20, 14, 0.7)', textareaBorder: 'rgba(16, 185, 129, 0.12)',
                            borderColor: 'rgba(16, 185, 129, 0.18)', btnBg: 'rgba(16, 185, 129, 0.08)', btnText: '#a7f3d0',
                            btnBorder: 'rgba(16, 185, 129, 0.2)', btnHoverBg: 'rgba(16, 185, 129, 0.18)', btnHoverText: '#ffffff',
                            btnHoverBorder: 'rgba(16, 185, 129, 0.35)', accentColor: '#10b981', footerBg: 'rgba(3, 27, 19, 0.9)'
                        }
                    };

                    const WALLPAPER_PRESETS = {
                        'orbs': 'radial-gradient(circle at 10% 20%, rgba(124, 58, 237, 0.35) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(219, 39, 119, 0.3) 0%, transparent 45%), radial-gradient(circle at 50% 50%, rgba(37, 99, 235, 0.2) 0%, transparent 60%)',
                        'mesh': 'linear-gradient(135deg, rgba(30, 64, 175, 0.3) 0%, rgba(13, 148, 136, 0.25) 50%, rgba(22, 163, 74, 0.2) 100%)',
                        'grid': 'linear-gradient(to right, rgba(255, 255, 255, 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.06) 1px, transparent 1px)',
                        'dots': 'radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px)',
                        'sunset': 'linear-gradient(135deg, rgba(234, 88, 12, 0.25) 0%, rgba(219, 39, 119, 0.25) 50%, rgba(124, 58, 237, 0.3) 100%)',
                        'none': 'none'
                    };

                    let isStickyMode = ${isSticky ? 'true' : 'false'};
                    let currentTheme = localStorage.getItem('jinil_note_popout_theme_id') || 'toss-dark';
                    let currentWallpaper = localStorage.getItem('jinil_note_popout_wp_id') || 'orbs';
                    let customBgUrl = localStorage.getItem('jinil_note_popout_custom_bg') || '';
                    let currentFontSize = isStickyMode ? 14 : 16;
                    let opacityLevels = [1.0, 0.88, 0.72, 0.55];
                    let currentOpacityIdx = 0;

                    try {
                        const savedOpacity = parseFloat(localStorage.getItem('jinil_notes_sticky_opacity'));
                        if (!isNaN(savedOpacity) && savedOpacity >= 0.3 && savedOpacity <= 1.0) {
                            const idx = opacityLevels.findIndex(lvl => Math.abs(lvl - savedOpacity) < 0.05);
                            if (idx !== -1) currentOpacityIdx = idx;
                        }
                    } catch(e) {}

                    const editor = document.getElementById('editor');
                    const modalBackdrop = document.getElementById('themeModalBackdrop');

                    // Read content safely from JSON payload
                    let initialContent = '';
                    try {
                        const rawDataEl = document.getElementById('initialNoteData');
                        if (rawDataEl) {
                            const parsed = JSON.parse(rawDataEl.textContent || '{}');
                            initialContent = parsed.content || '';
                        }
                    } catch(e) {
                        console.error('Failed to parse note content payload:', e);
                    }

                    if (editor) {
                        editor.innerHTML = initialContent || '';
                    }

                    // Window Bounds (Size & Position) Auto-saver
                    function savePopupBounds() {
                        try {
                            const bounds = {
                                width: window.outerWidth || window.innerWidth,
                                height: window.outerHeight || window.innerHeight,
                                left: window.screenX !== undefined ? window.screenX : window.screenLeft,
                                top: window.screenY !== undefined ? window.screenY : window.screenTop
                            };
                            const boundsKey = isStickyMode ? 'jinil_notes_sticky_bounds' : 'jinil_notes_popup_bounds';
                            localStorage.setItem(boundsKey, JSON.stringify(bounds));
                            if (window.opener && !window.opener.closed) {
                                window.opener.postMessage({
                                    type: 'JINIL_NOTE_POPUP_BOUNDS_UPDATE',
                                    bounds: bounds,
                                    isSticky: isStickyMode
                                }, '*');
                            }
                        } catch (e) {}
                    }

                    let resizeTimer;
                    window.addEventListener('resize', () => {
                        clearTimeout(resizeTimer);
                        resizeTimer = setTimeout(savePopupBounds, 250);
                    });
                    window.addEventListener('beforeunload', savePopupBounds);
                    setInterval(savePopupBounds, 2500);

                    // 📌 Toggle Sticky Mode
                    function toggleStickyMode() {
                        isStickyMode = !isStickyMode;
                        localStorage.setItem('jinil_notes_is_sticky', isStickyMode ? 'true' : 'false');
                        
                        const appBadgeIcon = document.getElementById('appBadgeIcon');
                        const stickyToggleBtn = document.getElementById('stickyToggleBtn');
                        const stickyBtnText = document.getElementById('stickyBtnText');

                        if (isStickyMode) {
                            document.body.classList.add('sticky-mode');
                            if (stickyToggleBtn) stickyToggleBtn.classList.add('active-sticky');
                            if (stickyBtnText) stickyBtnText.innerText = 'ON';
                            if (appBadgeIcon) {
                                appBadgeIcon.innerHTML = '<svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="color:#fbbf24;"><path d="M12 2v8M5 5l14 14M19 5l-4 4M5 19l4-4M15 15l4 4"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>';
                            }

                            // Resize to compact sticky bounds
                            let targetW = 380;
                            let targetH = 500;
                            try {
                                const savedStickyBounds = JSON.parse(localStorage.getItem('jinil_notes_sticky_bounds') || '{}');
                                if (savedStickyBounds.width && savedStickyBounds.height) {
                                    targetW = Math.min(600, Math.max(280, savedStickyBounds.width));
                                    targetH = Math.min(800, Math.max(260, savedStickyBounds.height));
                                }
                            } catch(e) {}
                            window.resizeTo(targetW, targetH);
                        } else {
                            document.body.classList.remove('sticky-mode');
                            if (stickyToggleBtn) stickyToggleBtn.classList.remove('active-sticky');
                            if (stickyBtnText) stickyBtnText.innerText = '스티키';
                            if (appBadgeIcon) {
                                appBadgeIcon.innerHTML = '<svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>';
                            }

                            // Resize back to standard bounds
                            let targetW = 840;
                            let targetH = 740;
                            try {
                                const savedStandardBounds = JSON.parse(localStorage.getItem('jinil_notes_popup_bounds') || '{}');
                                if (savedStandardBounds.width && savedStandardBounds.height) {
                                    targetW = Math.min(1920, Math.max(480, savedStandardBounds.width));
                                    targetH = Math.min(1080, Math.max(380, savedStandardBounds.height));
                                }
                            } catch(e) {}
                            window.resizeTo(targetW, targetH);
                        }
                        updateOpacityUI();
                        savePopupBounds();
                    }

                    // Cycle Window Transparency
                    function cycleOpacity() {
                        currentOpacityIdx = (currentOpacityIdx + 1) % opacityLevels.length;
                        const opacityVal = opacityLevels[currentOpacityIdx];
                        localStorage.setItem('jinil_notes_sticky_opacity', opacityVal.toString());
                        updateOpacityUI();
                    }

                    function updateOpacityUI() {
                        const opacityVal = opacityLevels[currentOpacityIdx];
                        document.documentElement.style.setProperty('--window-opacity', opacityVal.toString());
                        const opacityBtn = document.getElementById('opacityBtn');
                        const opacityValText = document.getElementById('opacityValText');
                        if (opacityValText) {
                            opacityValText.innerText = Math.round(opacityVal * 100) + '%';
                        }
                        if (opacityBtn) {
                            if (opacityVal < 0.95) {
                                opacityBtn.classList.add('active-trans');
                            } else {
                                opacityBtn.classList.remove('active-trans');
                            }
                        }
                    }

                    function openThemeModal() {
                        if (modalBackdrop) modalBackdrop.classList.add('show');
                        updateModalActiveStates();
                    }

                    function closeThemeModal() {
                        if (modalBackdrop) modalBackdrop.classList.remove('show');
                    }

                    function closeThemeModalOnBackdrop(e) {
                        if (e.target === modalBackdrop) {
                            closeThemeModal();
                        }
                    }

                    function switchModalTab(tab) {
                        const isTheme = tab === 'themes';
                        const themeContent = document.getElementById('themeTabContent');
                        const wpContent = document.getElementById('wallpaperTabContent');
                        const tabThemeBtn = document.getElementById('tabThemeBtn');
                        const tabWpBtn = document.getElementById('tabWpBtn');
                        
                        if (themeContent) themeContent.style.display = isTheme ? 'block' : 'none';
                        if (wpContent) wpContent.style.display = isTheme ? 'none' : 'block';
                        if (tabThemeBtn) tabThemeBtn.className = isTheme ? 'tab-btn active-theme' : 'tab-btn';
                        if (tabWpBtn) tabWpBtn.className = isTheme ? 'tab-btn' : 'tab-btn active-wp';
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
                        root.style.setProperty('--accent-color', t.accentColor);
                        root.style.setProperty('--footer-bg', t.footerBg);
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
                        document.querySelectorAll('.theme-card').forEach(card => {
                            const tId = card.getAttribute('data-theme');
                            const isSelected = tId === currentTheme;
                            card.className = isSelected ? 'theme-card active' : 'theme-card';
                            const slot = card.querySelector('.check-slot');
                            if (slot) {
                                slot.innerHTML = isSelected ? '<div class="check-badge">✓</div>' : '<div class="radio-circle"></div>';
                            }
                        });

                        document.querySelectorAll('.wp-card').forEach(card => {
                            const wpId = card.getAttribute('data-wp');
                            const isSelected = wpId === currentWallpaper && !customBgUrl;
                            card.className = isSelected ? 'wp-card active' : 'wp-card';
                        });
                    }

                    function changeFontSize(delta) {
                        currentFontSize = Math.min(36, Math.max(12, currentFontSize + delta));
                        if (editor) editor.style.fontSize = currentFontSize + 'px';
                        const el = document.getElementById('fontSizeDisplay');
                        if (el) el.innerText = currentFontSize + 'px';
                    }

                    function updateStats() {
                        if (!editor) return;
                        const text = (editor.innerText || '').replace(/\\r\\n/g, '\\n');
                        const cleanText = text.trim();
                        const charCount = text.replace(/\\n/g, '').length;
                        const wordCount = cleanText ? cleanText.split(/\\s+/).length : 0;
                        const lineCount = text ? text.split('\\n').length : 0;

                        const charEl = document.getElementById('charCount');
                        const wordEl = document.getElementById('wordCount');
                        const lineEl = document.getElementById('lineCount');
                        if (charEl) charEl.innerText = charCount + '자';
                        if (wordEl) wordEl.innerText = wordCount + '단어';
                        if (lineEl) lineEl.innerText = lineCount + '줄';
                    }

                    function copyContent() {
                        if (!editor) return;
                        navigator.clipboard.writeText(editor.innerText || '');
                        const copyBtnText = document.getElementById('copyBtnText');
                        if (copyBtnText) copyBtnText.innerText = '완료!';
                        setTimeout(() => { 
                            if (copyBtnText) copyBtnText.innerText = '복사'; 
                        }, 1800);
                    }

                    if (editor) {
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
                    }

                    // Keyboard shortcuts: Esc, Alt+S (Toggle Sticky), Alt+O (Cycle Opacity)
                    window.addEventListener('keydown', (e) => {
                        if (e.key === 'Escape') {
                            if (modalBackdrop && modalBackdrop.classList.contains('show')) {
                                closeThemeModal();
                            } else {
                                window.close();
                            }
                        } else if ((e.altKey && e.key.toLowerCase() === 's') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's')) {
                            e.preventDefault();
                            toggleStickyMode();
                        } else if (e.altKey && e.key.toLowerCase() === 'o') {
                            e.preventDefault();
                            cycleOpacity();
                        }
                    });

                    // Expose functions on window for inline handlers
                    window.toggleStickyMode = toggleStickyMode;
                    window.cycleOpacity = cycleOpacity;
                    window.openThemeModal = openThemeModal;
                    window.closeThemeModal = closeThemeModal;
                    window.closeThemeModalOnBackdrop = closeThemeModalOnBackdrop;
                    window.switchModalTab = switchModalTab;
                    window.selectTheme = selectTheme;
                    window.selectWallpaper = selectWallpaper;
                    window.handleFileUpload = handleFileUpload;
                    window.handleUrlInput = handleUrlInput;
                    window.changeFontSize = changeFontSize;
                    window.copyContent = copyContent;
                    window.updateStats = updateStats;

                    // Initial Load
                    applyThemeStyles();
                    applyWallpaperStyles();
                    updateOpacityUI();
                    updateStats();
                </script>
            </body>
        </html>
        `);
        popup.document.close();

        // Direct fallback injection into editor
        try {
            const popupEditor = popup.document.getElementById('editor');
            if (popupEditor && !popupEditor.innerHTML && noteHtml) {
                popupEditor.innerHTML = noteHtml;
                if (typeof popup.updateStats === 'function') {
                    popup.updateStats();
                }
            }
        } catch (e) {}
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
                                                {(() => {
                                                    const preview = stripHtml(note.content);
                                                    if (!preview) return null;
                                                    return (
                                                        <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-normal">
                                                            {preview}
                                                        </p>
                                                    );
                                                })()}
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
                                                onClick={() => handleOpenExternalWindow(false)}
                                                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-xl transition-all border border-blue-200/60 dark:border-blue-800/40 cursor-pointer shadow-xs active:scale-95 group"
                                                title="상세 메모를 독립된 새 창 팝업으로 분리 및 편집"
                                            >
                                                <svg className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                                <span>새 창 분리</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleOpenExternalWindow(true)}
                                                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-xl transition-all border border-amber-200/60 dark:border-amber-800/40 cursor-pointer shadow-xs active:scale-95 group"
                                                title="화면 구석에 띄워두는 초소형 스티키 노트(Sticky Note) 모드로 바로 열기"
                                            >
                                                <svg className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v8M5 5l14 14M19 5l-4 4M5 19l4-4M15 15l4 4" />
                                                </svg>
                                                <span>스티키 위젯</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Editor Box with Drag-and-Drop, Clipboard Paste & Floating Image Controls */}
                                    <div
                                        ref={editorWrapperRef}
                                        onClick={handleEditorClick}
                                        className={`relative rounded-2xl transition-all ${
                                            isDraggingOver 
                                                ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900 bg-blue-50/20' 
                                                : ''
                                        }`}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                    >
                                        {/* Floating Image Control Toolbar */}
                                        {selectedImageEl && imageToolbarPos && (
                                            <div
                                                className="image-floating-toolbar absolute z-30 flex items-center gap-1.5 p-1.5 bg-slate-900/95 dark:bg-slate-800/95 text-white backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 text-xs animate-in fade-in zoom-in-95 duration-150 select-none"
                                                style={{
                                                    top: `${imageToolbarPos.top}px`,
                                                    left: `${imageToolbarPos.left}px`,
                                                }}
                                            >
                                                {/* Alignment Buttons */}
                                                <div className="flex items-center bg-white/10 rounded-xl p-0.5">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); handleAlignImage('left'); }}
                                                        title="Canh Trái (Left)"
                                                        className={`p-1.5 rounded-lg hover:bg-white/20 transition-all cursor-pointer ${
                                                            selectedImageEl.block?.style?.textAlign === 'left' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300'
                                                        }`}
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h14" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); handleAlignImage('center'); }}
                                                        title="Canh Giữa (Center)"
                                                        className={`p-1.5 rounded-lg hover:bg-white/20 transition-all cursor-pointer ${
                                                            (!selectedImageEl.block?.style?.textAlign || selectedImageEl.block?.style?.textAlign === 'center') ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300'
                                                        }`}
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M7 12h10M5 18h14" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); handleAlignImage('right'); }}
                                                        title="Canh Phải (Right)"
                                                        className={`p-1.5 rounded-lg hover:bg-white/20 transition-all cursor-pointer ${
                                                            selectedImageEl.block?.style?.textAlign === 'right' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300'
                                                        }`}
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M10 12h10M6 18h14" />
                                                        </svg>
                                                    </button>
                                                </div>

                                                <div className="w-[1px] h-4 bg-white/20 my-auto"></div>

                                                {/* Size Presets */}
                                                <div className="flex items-center gap-0.5 bg-white/10 rounded-xl p-0.5 font-bold text-[11px]">
                                                    {['25%', '50%', '75%', '100%'].map((sz) => (
                                                        <button
                                                            key={sz}
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); handleResizeImage(sz); }}
                                                            className={`px-1.5 py-1 rounded-lg hover:bg-white/20 transition-all cursor-pointer ${
                                                                (selectedImageEl.img?.style?.width === sz || (!selectedImageEl.img?.style?.width && sz === '100%')) ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300'
                                                            }`}
                                                        >
                                                            {sz}
                                                        </button>
                                                    ))}
                                                </div>

                                                <div className="w-[1px] h-4 bg-white/20 my-auto"></div>

                                                {/* Fullscreen Preview */}
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setPreviewImageModal({ url: selectedImageEl.img?.src, name: '이미지' }); }}
                                                    title="Xem toàn màn hình (Fullscreen Zoom)"
                                                    className="p-1.5 rounded-lg hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                                    </svg>
                                                </button>

                                                {/* Delete Image */}
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteSelectedImage(); }}
                                                    title="Xóa ảnh (Delete Image)"
                                                    className="p-1.5 rounded-lg hover:bg-red-500/80 text-red-300 hover:text-white transition-all cursor-pointer"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}

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
                                                    const rawHtml = editorRef.current.innerHTML;
                                                    const cleaned = cleanContentForSave(rawHtml);
                                                    setContent(cleaned);
                                                    triggerAutoSave({ content: cleaned });
                                                }
                                            }}
                                            onInput={(e) => {
                                                saveCurrentSelection();
                                                const rawHtml = e.currentTarget.innerHTML;
                                                const cleaned = cleanContentForSave(rawHtml);
                                                setContent(cleaned);
                                                triggerAutoSave({ content: cleaned });
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
