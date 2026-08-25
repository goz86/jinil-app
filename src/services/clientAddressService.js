import { db } from '../firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { supabase } from '../lib/supabase';

const CACHE_KEY = 'jinil_client_address_book_cache';

// In-memory cache for instant 0ms access
let memoryCache = null;
let isInitialized = false;
let isFetchingSupabase = false;
let supabasePartnersCache = [];
let firestoreDataCache = [];
let unsubscribeFirestore = null;
const listeners = new Set();

// Load initial cache synchronously from localStorage
function loadLocalCache() {
    if (memoryCache !== null) return memoryCache;
    try {
        const saved = localStorage.getItem(CACHE_KEY);
        if (saved) {
            memoryCache = JSON.parse(saved);
            return memoryCache;
        }
    } catch (e) {
        console.warn('Failed to parse client cache from localStorage:', e);
    }
    memoryCache = [];
    return memoryCache;
}

// Save cache to localStorage
function saveLocalCache(data) {
    try {
        memoryCache = data;
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('Failed to save client cache to localStorage:', e);
    }
}

// Merge Firestore clients and Supabase partners, preserving sortIndex
function mergeClients(firestoreList, supabaseList) {
    const existingFsNames = new Set(
        firestoreList.map(c => (c.name || '').trim().toLowerCase()).filter(Boolean)
    );

    const uniqueSupabase = supabaseList.filter(
        p => !existingFsNames.has((p.name || '').trim().toLowerCase())
    );

    const merged = [...firestoreList, ...uniqueSupabase];

    return merged.sort((a, b) => {
        const indexA = a.sortIndex !== undefined ? a.sortIndex : Number.MAX_SAFE_INTEGER;
        const indexB = b.sortIndex !== undefined ? b.sortIndex : Number.MAX_SAFE_INTEGER;
        if (indexA !== indexB) return indexA - indexB;
        return (a.name || '').localeCompare(b.name || '');
    });
}

function notifyListeners() {
    const current = getCachedClients();
    listeners.forEach(cb => {
        try {
            cb(current);
        } catch (e) {
            console.error('Error in client cache listener:', e);
        }
    });
}

// Fetch Supabase shipments in parallel (Promise.all)
async function fetchSupabasePartners() {
    if (isFetchingSupabase) return supabasePartnersCache;
    isFetchingSupabase = true;

    try {
        const searchQueries = [
            '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12',
            '서울', '경기', '미지정', 'Open', '공장', '스튜디오', '컴퍼니', '타워', '빌딩',
            '마포', '성북', '동대문', '중구', '야드', '오픈'
        ];

        const locationMap = new Map();

        // Run all queries in parallel for high speed
        const results = await Promise.allSettled(
            searchQueries.map(qStr =>
                supabase.rpc('search_public_b2b_shipments', {
                    p_query: qStr,
                    p_limit: 200
                })
            )
        );

        results.forEach(res => {
            if (res.status === 'fulfilled' && res.value?.data && !res.value.error) {
                res.value.data.forEach(s => {
                    const locName = (s.location_name || s.company_name || '').trim();
                    if (!locName || locName === '미지정') return;

                    const key = locName.toLowerCase();
                    if (!locationMap.has(key)) {
                        const compName = (s.company_name && s.company_name !== '미지정') ? s.company_name : '';
                        locationMap.set(key, {
                            id: `sb-${s.id || locName}`,
                            isSupabase: true,
                            name: locName,
                            representative: compName || '',
                            contactName: s.recipient_name || '',
                            phone: s.courier_phone || '',
                            address: s.recipient_address || '',
                            sortIndex: 500,
                        });
                    }
                });
            }
        });

        supabasePartnersCache = Array.from(locationMap.values());
        return supabasePartnersCache;
    } catch (err) {
        console.error('Supabase RPC fetch error in clientAddressService:', err);
        return supabasePartnersCache;
    } finally {
        isFetchingSupabase = false;
    }
}

/**
 * Preload clients in background (Stale-While-Revalidate).
 * Can be called anytime, e.g. at App startup.
 */
export function preloadClients() {
    loadLocalCache();

    if (isInitialized) return;
    isInitialized = true;

    // 1. Setup Firestore realtime subscription
    const q = query(collection(db, 'clients'));
    unsubscribeFirestore = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
        firestoreDataCache = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
        }));

        // Re-merge with Supabase partners
        const merged = mergeClients(firestoreDataCache, supabasePartnersCache);
        saveLocalCache(merged);
        notifyListeners();

        // Auto-sync missing Firestore clients to Supabase partners in background
        void (async () => {
            const partnerNames = new Set(supabasePartnersCache.map(p => (p.name || '').trim().toLowerCase()));
            for (const c of firestoreDataCache) {
                const name = (c.name || '').trim();
                if (!name || partnerNames.has(name.toLowerCase())) continue;
                try {
                    const { data: inserted } = await supabase.from('partners').insert([{
                        company_name: name,
                        representative_name: c.representative || '',
                        contact_person: c.contactName || '',
                        phone: c.phone || '',
                        address: c.address || '',
                        default_address: c.address || '',
                    }]).select('*');

                    if (inserted && inserted[0]) {
                        partnerNames.add(name.toLowerCase());
                    }
                } catch (e) {
                    // Ignore auto-sync error in background
                }
            }
        })();
    }, (err) => {
        console.error('Firestore clients onSnapshot error:', err);
    });

    // 2. Fetch Supabase partners in parallel
    void fetchSupabasePartners().then(sbPartners => {
        if (firestoreDataCache.length > 0 || sbPartners.length > 0) {
            const merged = mergeClients(firestoreDataCache, sbPartners);
            saveLocalCache(merged);
            notifyListeners();
        }
    });
}

/**
 * Get cached clients instantly (0ms response time).
 */
export function getCachedClients() {
    return loadLocalCache();
}

/**
 * Subscribe to client updates (invoked immediately with current cache, then on any changes).
 */
export function subscribeClients(callback) {
    preloadClients();
    listeners.add(callback);

    // Immediate callback with cached data
    const current = getCachedClients();
    if (current && current.length > 0) {
        callback(current);
    }

    return () => {
        listeners.delete(callback);
    };
}

/**
 * Add a new client
 */
export async function addClient(formData, existingClients = []) {
    const supabasePayload = {
        company_name: formData.name,
        representative_name: formData.representative || '',
        contact_person: formData.contactName || '',
        phone: formData.phone || '',
        address: formData.address || '',
        default_address: formData.address || '',
    };

    // 1. Sync with Supabase partners
    try {
        await supabase.from('partners').insert([supabasePayload]);
    } catch (e) {
        console.warn('Supabase partner insert notice:', e);
    }

    // 2. Add to Firestore
    const maxSortIndex = existingClients.length > 0
        ? Math.max(...existingClients.map(c => c.sortIndex || 0))
        : 0;

    const docRef = await addDoc(collection(db, 'clients'), {
        ...formData,
        sortIndex: maxSortIndex + 1000,
        createdAt: new Date()
    });

    return docRef.id;
}

/**
 * Update an existing client
 */
export async function updateClient(id, formData) {
    const supabasePayload = {
        company_name: formData.name,
        representative_name: formData.representative || '',
        contact_person: formData.contactName || '',
        phone: formData.phone || '',
        address: formData.address || '',
        default_address: formData.address || '',
    };

    try {
        await supabase.from('partners').update(supabasePayload).eq('id', id);
    } catch (e) {}

    await updateDoc(doc(db, 'clients', id), {
        ...formData,
        updatedAt: new Date()
    });
}

/**
 * Delete a client
 */
export async function deleteClient(id) {
    try {
        await supabase.from('partners').delete().eq('id', id);
    } catch (e) {}

    await deleteDoc(doc(db, 'clients', id));
}

/**
 * Reorder client sort index in Firestore
 */
export async function reorderClient(clientId, newIndex) {
    await updateDoc(doc(db, 'clients', clientId), {
        sortIndex: newIndex
    });
}

/**
 * Mark client last copied timestamp
 */
export async function markClientCopied(clientId) {
    if (!clientId || clientId.startsWith('sb-')) return;
    try {
        await updateDoc(doc(db, 'clients', clientId), {
            lastCopiedAt: new Date()
        });
    } catch (e) {}
}
