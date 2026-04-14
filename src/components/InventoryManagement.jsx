import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, orderBy, serverTimestamp } from 'firebase/firestore';
import { useLanguage } from '../contexts/LanguageContext';
import Swal from 'sweetalert2';

export default function InventoryManagement() {
    const { t } = useLanguage();
    const [inventory, setInventory] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [sortField, setSortField] = useState('productName');
    const [sortOrder, setSortOrder] = useState('asc');

    const [formData, setFormData] = useState({
        category: '',
        productName: '',
        productCode: '',
        initialStock: 0,
        stockIn: 0,
        stockOut: 0,
        client: '',
        inPrice: 0,
        outPrice: 0
    });

    useEffect(() => {
        const q = query(collection(db, 'inventory'), orderBy(sortField, sortOrder));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setInventory(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [sortField, sortOrder]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const dataToSave = {
                ...formData,
                initialStock: Number(formData.initialStock),
                stockIn: Number(formData.stockIn),
                stockOut: Number(formData.stockOut),
                inPrice: Number(formData.inPrice),
                outPrice: Number(formData.outPrice),
            };

            if (editingId) {
                await updateDoc(doc(db, 'inventory', editingId), dataToSave);
                Swal.fire(t('success'), '', 'success');
            } else {
                await addDoc(collection(db, 'inventory'), {
                    ...dataToSave,
                    createdAt: serverTimestamp()
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

    const resetForm = () => {
        setFormData({
            category: '', productName: '', productCode: '', initialStock: 0,
            stockIn: 0, stockOut: 0, client: '', inPrice: 0, outPrice: 0
        });
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!'
        });
        if (result.isConfirmed) {
            await deleteDoc(doc(db, 'inventory', id));
        }
    };

    const filteredInventory = inventory.filter(i => 
        i.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.productCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.client?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEdit = (item) => {
        setFormData({ ...item });
        setEditingId(item.id);
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
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-blue-400 outline-none transition-all"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <button 
                    onClick={() => { setShowForm(true); setEditingId(null); resetForm(); }}
                    className="w-full md:w-auto px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" /></svg>
                    {t('addNew')}
                </button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-y-auto max-h-[90vh] p-6 border border-gray-100 dark:border-gray-700">
                        <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">{editingId ? t('edit') : t('addNew')}</h2>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label={t('category')} value={formData.category} onChange={v => setFormData({...formData, category: v})} required />
                            <InputField label={t('productName')} value={formData.productName} onChange={v => setFormData({...formData, productName: v})} required />
                            <InputField label={t('productCode')} value={formData.productCode} onChange={v => setFormData({...formData, productCode: v})} required />
                            <InputField label={t('client')} value={formData.client} onChange={v => setFormData({...formData, client: v})} />
                            <InputField label={t('initialStock')} value={formData.initialStock} onChange={v => setFormData({...formData, initialStock: v})} type="number" />
                            <InputField label={t('stockIn')} value={formData.stockIn} onChange={v => setFormData({...formData, stockIn: v})} type="number" />
                            <InputField label={t('stockOut')} value={formData.stockOut} onChange={v => setFormData({...formData, stockOut: v})} type="number" />
                            <InputField label={t('inPrice')} value={formData.inPrice} onChange={v => setFormData({...formData, inPrice: v})} type="number" />
                            <InputField label={t('outPrice')} value={formData.outPrice} onChange={v => setFormData({...formData, outPrice: v})} type="number" />
                            
                            <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 text-gray-500 font-bold border border-gray-200 rounded-xl hover:bg-gray-50">{t('cancel')}</button>
                                <button type="submit" className="px-6 py-2 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700">{t('save')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                        <tr>
                            <th className="px-4 py-3">{t('category')}</th>
                            <th className="px-4 py-3">{t('productName')}</th>
                            <th className="px-4 py-3">{t('productCode')}</th>
                            <th className="px-4 py-3 text-center">{t('initialStock')}</th>
                            <th className="px-4 py-3 text-center text-blue-600 dark:text-blue-400">{t('stockIn')}</th>
                            <th className="px-4 py-3 text-center text-red-600 dark:text-red-400">{t('stockOut')}</th>
                            <th className="px-4 py-3 text-center font-bold">{t('currentStock')}</th>
                            <th className="px-4 py-3">{t('client')}</th>
                            <th className="px-4 py-3 text-right">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {loading ? (
                            <tr><td colSpan="9" className="px-4 py-10 text-center text-gray-400">{t('loading')}</td></tr>
                        ) : filteredInventory.length === 0 ? (
                            <tr><td colSpan="9" className="px-4 py-10 text-center text-gray-400">{t('noData')}</td></tr>
                        ) : filteredInventory.map((item) => {
                            const currentStock = (item.initialStock || 0) + (item.stockIn || 0) - (item.stockOut || 0);
                            return (
                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-4 py-3"><span className="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded text-[10px] font-bold">{item.category}</span></td>
                                    <td className="px-4 py-3 font-bold text-gray-800 dark:text-white">{item.productName}</td>
                                    <td className="px-4 py-3 text-blue-500 font-mono text-xs">{item.productCode}</td>
                                    <td className="px-4 py-3 text-center text-gray-500">{item.initialStock}</td>
                                    <td className="px-4 py-3 text-center text-blue-600 dark:text-blue-400 font-semibold">{item.stockIn}</td>
                                    <td className="px-4 py-3 text-center text-red-600 dark:text-red-400 font-semibold">{item.stockOut}</td>
                                    <td className={`px-4 py-3 text-center font-bold ${currentStock <= 5 ? 'text-red-600 animate-pulse' : 'text-green-600'}`}>
                                        {currentStock}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{item.client}</td>
                                    <td className="px-4 py-3 text-right text-base">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                            <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function InputField({ label, value, onChange, type = "text", required = false }) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500">{label} {required && "*"}</label>
            <input 
                type={type} 
                required={required}
                value={value} 
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-400 outline-none transition-all"
            />
        </div>
    );
}
