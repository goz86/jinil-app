import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, orderBy, serverTimestamp } from 'firebase/firestore';
import { useLanguage } from '../contexts/LanguageContext';
import Swal from 'sweetalert2';

export default function ClientAddressBook({ user }) {
    const { t } = useLanguage();
    const [clients, setClients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [sortField, setSortField] = useState('custom'); // 'custom', 'name', 'representative', etc.
    const [sortOrder, setSortOrder] = useState('asc');

    const [draggedItemIndex, setDraggedItemIndex] = useState(null);

    // Resizable Columns State
    const [columnWidths, setColumnWidths] = useState(() => {
        const saved = localStorage.getItem('client-column-widths');
        return saved ? JSON.parse(saved) : [60, 200, 100, 120, 130, 300, 100];
    });
    const [isResizing, setIsResizing] = useState(-1);

    useEffect(() => {
        localStorage.setItem('client-column-widths', JSON.stringify(columnWidths));
    }, [columnWidths]);

    const startResizing = (idx, e) => {
        e.stopPropagation();
        e.preventDefault();
        setIsResizing(idx);
    };

    useEffect(() => {
        if (isResizing === -1) return;

        const handleMouseMove = (e) => {
            setColumnWidths(prev => {
                const newWidths = [...prev];
                const delta = e.movementX;
                const minWidth = 50;
                newWidths[isResizing] = Math.max(minWidth, newWidths[isResizing] + delta);
                return newWidths;
            });
        };

        const handleMouseUp = () => setIsResizing(-1);

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    const [formData, setFormData] = useState({
        name: '',
        representative: '',
        contactName: '',
        phone: '',
        address: ''
    });

    useEffect(() => {
        // Remove server-side orderBy to ensure docs missing 'sortIndex' aren't hidden
        const q = query(collection(db, 'clients'));
        
        const unsubscribe = onSnapshot(q, 
            { includeMetadataChanges: true },
            (snapshot) => {
                let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Sort locally based on current sortField
                data.sort((a, b) => {
                    if (sortField === 'custom') {
                        const indexA = a.sortIndex !== undefined ? a.sortIndex : Number.MAX_SAFE_INTEGER;
                        const indexB = b.sortIndex !== undefined ? b.sortIndex : Number.MAX_SAFE_INTEGER;
                        if (indexA !== indexB) return indexA - indexB;
                        return (a.name || '').localeCompare(b.name || '');
                    } else {
                        const valA = a[sortField] || '';
                        const valB = b[sortField] || '';
                        const cmp = valA.toString().localeCompare(valB.toString());
                        return sortOrder === 'asc' ? cmp : -cmp;
                    }
                });

                setClients(data);
                setLoading(false);
            },
            (error) => {
                console.error("Snapshot error:", error);
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, [sortField, sortOrder]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateDoc(doc(db, 'clients', editingId), formData);
                Swal.fire(t('success'), '', 'success');
            } else {
                // For new docs, put them at the end
                const maxSortIndex = clients.length > 0 
                  ? Math.max(...clients.map(c => c.sortIndex || 0)) 
                  : 0;
                  
                await addDoc(collection(db, 'clients'), {
                    ...formData,
                    sortIndex: maxSortIndex + 1000,
                    createdAt: new Date()
                });
                Swal.fire(t('success'), '', 'success');
            }
            setShowForm(false);
            setEditingId(null);
            setFormData({ name: '', representative: '', contactName: '', phone: '', address: '' });
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    };

    const handleDragStart = (e, index) => {
        // When drag starts, we should be in custom sort mode
        if (sortField !== 'custom') {
            setSortField('custom');
            // Since onSnapshot will re-run, the order might jump. 
            // In a real app we'd keep it stable, but here we just switch mode.
        }
        setDraggedItemIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e, index) => {
        e.preventDefault(); 
    };

    const handleDrop = async (e, targetIndex) => {
        e.preventDefault();
        if (draggedItemIndex === null || draggedItemIndex === targetIndex) return;

        const newClients = [...clients];
        const draggedItem = newClients[draggedItemIndex];
        
        newClients.splice(draggedItemIndex, 1);
        newClients.splice(targetIndex, 0, draggedItem);
        
        setClients(newClients);
        setDraggedItemIndex(null);

        try {
            let newIndex;
            if (targetIndex === 0) {
                newIndex = (newClients[1].sortIndex || 0) - 1000;
            } else if (targetIndex === newClients.length - 1) {
                newIndex = (newClients[newClients.length - 2].sortIndex || 0) + 1000;
            } else {
                const prevIndex = newClients[targetIndex - 1].sortIndex || 0;
                const nextIndex = newClients[targetIndex + 1].sortIndex || 0;
                newIndex = (prevIndex + nextIndex) / 2;
            }

            await updateDoc(doc(db, 'clients', draggedItem.id), {
                sortIndex: newIndex
            });
        } catch (error) {
            console.error("Reorder failed:", error);
            Swal.fire('Error', 'Failed to save order', 'error');
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: t('confirmDeleteTitle'),
            text: t('confirmDeleteText'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: t('yes'),
            cancelButtonText: t('no')
        });
        if (result.isConfirmed) {
            await deleteDoc(doc(db, 'clients', id));
        }
    };

    const filteredClients = clients.filter(c => 
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm)
    );

    const handleEdit = (client) => {
        setFormData({ ...client });
        setEditingId(client.id);
        setShowForm(true);
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 p-2">
                <div className="relative w-full md:w-64">
                    <input 
                        type="text" 
                        placeholder={t('search')} 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <button 
                    onClick={() => { setShowForm(true); setEditingId(null); }}
                    className="w-full md:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" /></svg>
                    {t('addNew')}
                </button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden p-6 border border-gray-100 dark:border-gray-700">
                        <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">{editingId ? t('edit') : t('addNew')}</h2>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <InputField label={t('companyName')} value={formData.name} onChange={v => setFormData({...formData, name: v})} required />
                            <InputField label={t('representative')} value={formData.representative} onChange={v => setFormData({...formData, representative: v})} />
                            <InputField label={t('contactName')} value={formData.contactName} onChange={v => setFormData({...formData, contactName: v})} />
                            <InputField label={t('phone')} value={formData.phone} onChange={v => setFormData({...formData, phone: v})} />
                            <InputField label={t('address')} value={formData.address} onChange={v => setFormData({...formData, address: v})} />
                            
                            <div className="flex justify-end gap-3 mt-4">
                                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 text-gray-500 font-bold border border-gray-200 rounded-xl hover:bg-gray-50">{t('cancel')}</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700">{t('save')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className={`overflow-x-auto border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm ${isResizing !== -1 ? 'select-none' : ''}`}>
                <table className="w-full text-sm text-left border-collapse" style={{ tableLayout: 'fixed' }}>
                    <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                        <tr>
                            <th className="px-4 py-3 text-center relative group" style={{ width: columnWidths[0] }}>
                                {t('number')}
                                <div onMouseDown={(e) => startResizing(0, e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </th>
                            <th 
                                className="px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group relative"
                                onClick={() => {
                                    const nextOrder = sortField === 'name' && sortOrder === 'asc' ? 'desc' : 'asc';
                                    setSortField('name');
                                    setSortOrder(nextOrder);
                                }}
                                style={{ width: columnWidths[1] }}
                            >
                                <div className="flex items-center gap-1">
                                    {t('companyName')}
                                    {sortField === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
                                </div>
                                <div onMouseDown={(e) => startResizing(1, e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </th>
                            <th 
                                className="px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group relative"
                                onClick={() => {
                                    const nextOrder = sortField === 'representative' && sortOrder === 'asc' ? 'desc' : 'asc';
                                    setSortField('representative');
                                    setSortOrder(nextOrder);
                                }}
                                style={{ width: columnWidths[2] }}
                            >
                                <div className="flex items-center gap-1">
                                    {t('representative')}
                                    {sortField === 'representative' && (sortOrder === 'asc' ? '▲' : '▼')}
                                </div>
                                <div onMouseDown={(e) => startResizing(2, e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </th>
                            <th 
                                className="px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group relative"
                                onClick={() => {
                                    const nextOrder = sortField === 'contactName' && sortOrder === 'asc' ? 'desc' : 'asc';
                                    setSortField('contactName');
                                    setSortOrder(nextOrder);
                                }}
                                style={{ width: columnWidths[3] }}
                            >
                                <div className="flex items-center gap-1">
                                    {t('contactName')}
                                    {sortField === 'contactName' && (sortOrder === 'asc' ? '▲' : '▼')}
                                </div>
                                <div onMouseDown={(e) => startResizing(3, e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </th>
                            <th 
                                className="px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group relative"
                                onClick={() => {
                                    const nextOrder = sortField === 'phone' && sortOrder === 'asc' ? 'desc' : 'asc';
                                    setSortField('phone');
                                    setSortOrder(nextOrder);
                                }}
                                style={{ width: columnWidths[4] }}
                            >
                                <div className="flex items-center gap-1">
                                    {t('phone')}
                                    {sortField === 'phone' && (sortOrder === 'asc' ? '▲' : '▼')}
                                </div>
                                <div onMouseDown={(e) => startResizing(4, e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </th>
                            <th 
                                className="px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group relative"
                                onClick={() => {
                                    const nextOrder = sortField === 'address' && sortOrder === 'asc' ? 'desc' : 'asc';
                                    setSortField('address');
                                    setSortOrder(nextOrder);
                                }}
                                style={{ width: columnWidths[5] }}
                            >
                                <div className="flex items-center gap-1">
                                    {t('address')}
                                    {sortField === 'address' && (sortOrder === 'asc' ? '▲' : '▼')}
                                </div>
                                <div onMouseDown={(e) => startResizing(5, e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </th>
                            <th className="px-4 py-3 text-right" style={{ width: columnWidths[6] }}>{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {loading ? (
                            <tr><td colSpan="7" className="px-4 py-10 text-center text-gray-400 font-medium">{t('loading')}</td></tr>
                        ) : filteredClients.length === 0 ? (
                            <tr><td colSpan="7" className="px-4 py-10 text-center text-gray-400 font-medium">{t('noData')}</td></tr>
                        ) : filteredClients.map((c, index) => (
                            <tr 
                              key={c.id} 
                              draggable={!searchTerm} // Disable drag while searching
                              onDragStart={(e) => handleDragStart(e, index)}
                              onDragOver={(e) => handleDragOver(e, index)}
                              onDrop={(e) => handleDrop(e, index)}
                              className={`
                                hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group
                                ${draggedItemIndex === index ? 'opacity-40 bg-blue-50' : ''}
                                cursor-grab active:cursor-grabbing
                              `}
                            >
                                <td className="px-4 py-3 text-center font-medium text-gray-400 group-hover:text-blue-500 transition-colors flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
                                    {index + 1}
                                </td>
                                <td className="px-4 py-3 font-bold text-gray-800 dark:text-white truncate" title={c.name}>{c.name}</td>
                                <td className="px-4 py-3 text-gray-700 dark:text-gray-300 truncate" title={c.representative}>{c.representative}</td>
                                <td className="px-4 py-3 text-gray-700 dark:text-gray-300 truncate" title={c.contactName}>{c.contactName}</td>
                                <td className="px-4 py-3 text-blue-600 dark:text-blue-400 font-semibold truncate" title={c.phone}>{c.phone}</td>
                                <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-normal break-words leading-relaxed" title={c.address}>{c.address}</td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleEdit(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                        <button onClick={() => handleDelete(c.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function InputField({ label, value, onChange, type = "text", required = false }) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label} {required && "*"}</label>
            <input 
                type={type} 
                required={required}
                value={value} 
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-400 outline-none transition-all duration-200"
            />
        </div>
    );
}
