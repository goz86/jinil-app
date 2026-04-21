import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, orderBy, serverTimestamp } from 'firebase/firestore';
import { useLanguage } from '../contexts/LanguageContext';
import Swal from 'sweetalert2';

export default function InventoryManagement({ user }) {
    const { t } = useLanguage();
    const [inventory, setInventory] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [sortField, setSortField] = useState('custom'); // 'custom' or field name
    const [sortOrder, setSortOrder] = useState('asc');

    const [draggedItemIndex, setDraggedItemIndex] = useState(null);

    // Resizable Columns State
    const [columnWidths, setColumnWidths] = useState(() => {
        const saved = localStorage.getItem('inventory-column-widths');
        return saved ? JSON.parse(saved) : [50, 130, 90, 180, 100, 70, 70, 90, 80, 100];
    });
    const [isResizing, setIsResizing] = useState(-1);

    useEffect(() => {
        localStorage.setItem('inventory-column-widths', JSON.stringify(columnWidths));
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
                const minWidth = 40;
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

    const getCurrentLocalTime = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    };

    const [formData, setFormData] = useState({
        category: '',
        productName: '',
        productCode: '',
        stockIn: 0,
        stockOut: 0,
        currentStock: 0,
        unit: '',
        date: getCurrentLocalTime()
    });

    const resetForm = () => {
        setFormData({
            category: '', productName: '', productCode: '',
            stockIn: 0, stockOut: 0, currentStock: 0,
            unit: '',
            date: getCurrentLocalTime()
        });
    };

    useEffect(() => {
        const q = query(collection(db, 'inventory'));

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
                        return (a.productName || '').localeCompare(b.productName || '');
                    } else {
                        const valA = a[sortField] || '';
                        const valB = b[sortField] || '';
                        const cmp = valA.toString().localeCompare(valB.toString());
                        return sortOrder === 'asc' ? cmp : -cmp;
                    }
                });

                setInventory(data);
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
            const dataToSave = {
                ...formData,
                stockIn: Number(formData.stockIn),
                stockOut: Number(formData.stockOut),
                currentStock: Number(formData.currentStock),
                unit: formData.unit || ''
            };

            if (editingId) {
                await updateDoc(doc(db, 'inventory', editingId), dataToSave);
                Swal.fire(t('success'), '', 'success');
            } else {
                const maxSortIndex = inventory.length > 0
                    ? Math.max(...inventory.map(i => i.sortIndex || 0))
                    : 0;

                await addDoc(collection(db, 'inventory'), {
                    ...dataToSave,
                    sortIndex: maxSortIndex + 1000,
                    createdAt: new Date()
                });
                Swal.fire(t('success'), '', 'success');
            }
            setShowForm(false);
            setEditingId(null);
            resetForm();
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    };

    const handleDragStart = (e, index) => {
        if (sortField !== 'custom') {
            setSortField('custom');
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

        const newItems = [...inventory];
        const draggedItem = newItems[draggedItemIndex];

        newItems.splice(draggedItemIndex, 1);
        newItems.splice(targetIndex, 0, draggedItem);

        setInventory(newItems);
        setDraggedItemIndex(null);

        try {
            let newIndex;
            if (targetIndex === 0) {
                newIndex = (newItems[1].sortIndex || 0) - 1000;
            } else if (targetIndex === newItems.length - 1) {
                newIndex = (newItems[newItems.length - 2].sortIndex || 0) + 1000;
            } else {
                const prevIndex = newItems[targetIndex - 1].sortIndex || 0;
                const nextIndex = newItems[targetIndex + 1].sortIndex || 0;
                newIndex = (prevIndex + nextIndex) / 2;
            }

            await updateDoc(doc(db, 'inventory', draggedItem.id), {
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
            await deleteDoc(doc(db, 'inventory', id));
        }
    };

    const filteredInventory = inventory.filter(i =>
        i.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.productCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEdit = (item) => {
        setFormData({
            ...item,
            date: getCurrentLocalTime()
        });
        setEditingId(item.id);
        setShowForm(true);
    };

    const handlePrintA4 = () => {
        const printWindow = window.open('', '_blank');

        let tableRows = filteredInventory.map((item, index) => `
            <tr>
                <td style="text-align: center;">${index + 1}</td>
                <td>${item.date || ''}</td>
                <td>${item.category || ''}</td>
                <td style="font-weight: bold;">${item.productName || ''}</td>
                <td>${item.productCode || ''}</td>
                <td style="text-align: right; color: #2563eb;">${item.stockIn || 0}</td>
                <td style="text-align: right; color: #dc2626;">${item.stockOut || 0}</td>
                <td style="text-align: right; font-weight: bold; color: #16a34a;">${item.currentStock || 0}</td>
                <td style="text-align: center;">${item.unit || ''}</td>
            </tr>
        `).join('');

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>재고 목록 인쇄</title>
            <style>
                @page { size: A4 portrait; margin: 15mm; }
                body { 
                    font-family: 'Malgun Gothic', 'Noto Sans KR', sans-serif; 
                    margin: 0; padding: 0;
                    color: #111;
                }
                .header { text-align: center; margin-bottom: 20px; }
                h1 { margin: 0 0 5px 0; font-size: 24px; }
                .date-stamp { font-size: 12px; color: #666; text-align: right; margin-bottom: 10px; }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    font-size: 11px;
                }
                th, td { 
                    border: 1px solid #ccc; 
                    padding: 8px 6px; 
                }
                th { 
                    background-color: #f3f4f6; 
                    font-weight: bold; 
                    text-align: center;
                }
                @media print {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>재고 목록 (Inventory List)</h1>
            </div>
            <div class="date-stamp">출력일시: ${getCurrentLocalTime()} | 총 ${filteredInventory.length}건</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 40px;">No</th>
                        <th style="width: 100px;">날짜</th>
                        <th style="width: 80px;">분류</th>
                        <th>상품명</th>
                        <th style="width: 100px;">상품코드</th>
                        <th style="width: 50px;">입고</th>
                        <th style="width: 50px;">출고</th>
                        <th style="width: 50px;">재고</th>
                        <th style="width: 40px;">단위</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            <script>
                window.onload = function() { 
                    setTimeout(() => {
                        window.print(); 
                    }, 500);
                };
            </script>
        </body>
        </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
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
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-blue-400 outline-none transition-all"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <div className="flex w-full md:w-auto gap-2">
                    <button
                        onClick={handlePrintA4}
                        className="w-full md:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        {t('printA4')}
                    </button>
                    <button
                        onClick={() => { setShowForm(true); setEditingId(null); resetForm(); }}
                        className="w-full md:w-auto px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" /></svg>
                        {t('addNew')}
                    </button>
                </div>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-y-auto max-h-[90vh] p-6 border border-gray-100 dark:border-gray-700">
                        <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">{editingId ? t('edit') : t('addNew')}</h2>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <InputField label={t('category')} value={formData.category} onChange={v => setFormData({ ...formData, category: v })} required />
                            <InputField label={t('productName')} value={formData.productName} onChange={v => setFormData({ ...formData, productName: v })} required />
                            <InputField label={t('productCode')} value={formData.productCode} onChange={v => setFormData({ ...formData, productCode: v })} required />
                            <InputField
                                label={t('stockIn')}
                                value={formData.stockIn}
                                onChange={v => {
                                    const diff = Number(v) - Number(formData.stockIn || 0);
                                    setFormData(prev => ({
                                        ...prev,
                                        stockIn: v,
                                        currentStock: Number(prev.currentStock || 0) + diff
                                    }));
                                }}
                                type="number"
                            />
                            <InputField
                                label={t('stockOut')}
                                value={formData.stockOut}
                                onChange={v => {
                                    const diff = Number(v) - Number(formData.stockOut || 0);
                                    setFormData(prev => ({
                                        ...prev,
                                        stockOut: v,
                                        currentStock: Number(prev.currentStock || 0) - diff
                                    }));
                                }}
                                type="number"
                            />
                            <InputField
                                label={t('currentStock')}
                                value={formData.currentStock}
                                onChange={v => setFormData({ ...formData, currentStock: v })}
                                type="number"
                            />
                            <InputField label="단위" value={formData.unit} onChange={v => setFormData({ ...formData, unit: v })} placeholder="예: PAIR, KG, 개" />
                            <InputField label={t('date')} value={formData.date} onChange={v => setFormData({ ...formData, date: v })} />

                            <div className="flex justify-end gap-3 mt-4">
                                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 text-gray-500 font-bold border border-gray-200 rounded-xl hover:bg-gray-50">{t('cancel')}</button>
                                <button type="submit" className="px-6 py-2 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700">{t('save')}</button>
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
                                <div onMouseDown={(e) => startResizing(0, e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </th>
                            <th
                                className="px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group relative"
                                onClick={() => {
                                    const nextOrder = sortField === 'date' && sortOrder === 'asc' ? 'desc' : 'asc';
                                    setSortField('date');
                                    setSortOrder(nextOrder);
                                }}
                                style={{ width: columnWidths[1] }}
                            >
                                <div className="flex items-center gap-1">
                                    {t('date')}
                                    {sortField === 'date' && (sortOrder === 'asc' ? '▲' : '▼')}
                                </div>
                                <div onMouseDown={(e) => startResizing(1, e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </th>
                            <th
                                className="px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group relative"
                                onClick={() => {
                                    const nextOrder = sortField === 'category' && sortOrder === 'asc' ? 'desc' : 'asc';
                                    setSortField('category');
                                    setSortOrder(nextOrder);
                                }}
                                style={{ width: columnWidths[2] }}
                            >
                                <div className="flex items-center gap-1">
                                    {t('category')}
                                    {sortField === 'category' && (sortOrder === 'asc' ? '▲' : '▼')}
                                </div>
                                <div onMouseDown={(e) => startResizing(2, e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </th>
                            <th
                                className="px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group relative"
                                onClick={() => {
                                    const nextOrder = sortField === 'productName' && sortOrder === 'asc' ? 'desc' : 'asc';
                                    setSortField('productName');
                                    setSortOrder(nextOrder);
                                }}
                                style={{ width: columnWidths[3] }}
                            >
                                <div className="flex items-center gap-1">
                                    {t('productName')}
                                    {sortField === 'productName' && (sortOrder === 'asc' ? '▲' : '▼')}
                                </div>
                                <div onMouseDown={(e) => startResizing(3, e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </th>
                            <th
                                className="px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group relative"
                                onClick={() => {
                                    const nextOrder = sortField === 'productCode' && sortOrder === 'asc' ? 'desc' : 'asc';
                                    setSortField('productCode');
                                    setSortOrder(nextOrder);
                                }}
                                style={{ width: columnWidths[4] }}
                            >
                                <div className="flex items-center gap-1">
                                    {t('productCode')}
                                    {sortField === 'productCode' && (sortOrder === 'asc' ? '▲' : '▼')}
                                </div>
                                <div onMouseDown={(e) => startResizing(4, e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </th>
                            <th className="px-4 py-3 text-center text-blue-600 dark:text-blue-400 relative group" style={{ width: columnWidths[5] }}>
                                {t('stockIn')}
                                <div onMouseDown={(e) => startResizing(5, e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </th>
                            <th className="px-4 py-3 text-center text-red-600 dark:text-red-400 relative group" style={{ width: columnWidths[6] }}>
                                {t('stockOut')}
                                <div onMouseDown={(e) => startResizing(6, e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </th>
                            <th className="px-4 py-3 text-center font-bold text-green-600 relative group" style={{ width: columnWidths[7] }}>
                                {t('currentStock')}
                                <div onMouseDown={(e) => startResizing(7, e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </th>
                            <th className="px-4 py-3 text-center text-gray-400 relative group" style={{ width: columnWidths[8] }}>
                                단위
                                <div onMouseDown={(e) => startResizing(8, e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </th>
                            <th className="px-4 py-3 text-right" style={{ width: columnWidths[9] }}>{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {loading ? (
                            <tr><td colSpan="9" className="px-4 py-10 text-center text-gray-400 font-medium">{t('loading')}</td></tr>
                        ) : filteredInventory.length === 0 ? (
                            <tr><td colSpan="9" className="px-4 py-10 text-center text-gray-400 font-medium">{t('noData')}</td></tr>
                        ) : filteredInventory.map((item, index) => (
                            <tr
                                key={item.id}
                                draggable={!searchTerm}
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDrop={(e) => handleDrop(e, index)}
                                className={`
                                hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group
                                ${draggedItemIndex === index ? 'opacity-40 bg-blue-50' : ''}
                                cursor-grab active:cursor-grabbing
                              `}
                            >
                                <td className="px-4 py-3 text-center font-medium text-gray-400 group-hover:text-green-500 transition-colors flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
                                    {index + 1}
                                </td>
                                <td className="px-4 py-3 text-[10px] text-gray-500 font-mono leading-tight truncate" title={item.date}>{item.date}</td>
                                <td className="px-4 py-3 truncate" title={item.category}><span className="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded text-[10px] font-bold">{item.category}</span></td>
                                <td className="px-4 py-3 font-bold text-gray-800 dark:text-white truncate" title={item.productName}>{item.productName}</td>
                                <td className="px-4 py-3 text-blue-500 font-mono text-xs truncate" title={item.productCode}>{item.productCode}</td>
                                <td className="px-4 py-3 text-center text-blue-600 dark:text-blue-400 font-semibold">{item.stockIn}</td>
                                <td className="px-4 py-3 text-center text-red-600 dark:text-red-400 font-semibold">{item.stockOut}</td>
                                <td className="px-4 py-3 text-center font-bold text-green-600">{item.currentStock}</td>
                                <td className="px-4 py-3 text-center text-gray-600">{item.unit || '-'}</td>
                                <td className="px-4 py-3 text-right text-base">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
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
                className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-400 outline-none transition-all duration-200"
            />
        </div>
    );
}
