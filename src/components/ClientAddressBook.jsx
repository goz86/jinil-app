import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, orderBy, serverTimestamp } from 'firebase/firestore';
import { useLanguage } from '../contexts/LanguageContext';
import Swal from 'sweetalert2';

export default function ClientAddressBook() {
    const { t } = useLanguage();
    const [clients, setClients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [sortField, setSortField] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');

    const [formData, setFormData] = useState({
        name: '',
        representative: '',
        businessNo: '',
        address: '',
        homepage: '',
        phone: '',
        fax: '',
        mobile: '',
        email: '',
        contactName: ''
    });

    useEffect(() => {
        const q = query(collection(db, 'clients'), orderBy(sortField, sortOrder));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setClients(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [sortField, sortOrder]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateDoc(doc(db, 'clients', editingId), formData);
                Swal.fire(t('success'), '', 'success');
            } else {
                await addDoc(collection(db, 'clients'), {
                    ...formData,
                    createdAt: serverTimestamp()
                });
                Swal.fire(t('success'), '', 'success');
            }
            setShowForm(false);
            setEditingId(null);
            setFormData({
                name: '', representative: '', businessNo: '', address: '',
                homepage: '', phone: '', fax: '', mobile: '', email: '', contactName: ''
            });
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!'
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
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden p-6 border border-gray-100 dark:border-gray-700">
                        <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">{editingId ? t('edit') : t('addNew')}</h2>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label={t('companyName')} value={formData.name} onChange={v => setFormData({...formData, name: v})} required />
                            <InputField label={t('representative')} value={formData.representative} onChange={v => setFormData({...formData, representative: v})} />
                            <InputField label={t('businessNo')} value={formData.businessNo} onChange={v => setFormData({...formData, businessNo: v})} />
                            <InputField label={t('address')} value={formData.address} onChange={v => setFormData({...formData, address: v})} />
                            <InputField label={t('homepage')} value={formData.homepage} onChange={v => setFormData({...formData, homepage: v})} />
                            <InputField label={t('phone')} value={formData.phone} onChange={v => setFormData({...formData, phone: v})} />
                            <InputField label={t('fax')} value={formData.fax} onChange={v => setFormData({...formData, fax: v})} />
                            <InputField label={t('mobile')} value={formData.mobile} onChange={v => setFormData({...formData, mobile: v})} />
                            <InputField label={t('contactName')} value={formData.contactName} onChange={v => setFormData({...formData, contactName: v})} />
                            <InputField label={t('email')} value={formData.email} onChange={v => setFormData({...formData, email: v})} type="email" />
                            
                            <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 text-gray-500 font-bold border border-gray-200 rounded-xl hover:bg-gray-50">{t('cancel')}</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700">{t('save')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                        <tr>
                            <th className="px-4 py-3">{t('number')}</th>
                            <th className="px-4 py-3">{t('companyName')}</th>
                            <th className="px-4 py-3">{t('representative')} / {t('businessNo')}</th>
                            <th className="px-4 py-3">{t('address')}</th>
                            <th className="px-4 py-3">{t('phone')} / {t('fax')}</th>
                            <th className="px-4 py-3">{t('mobile')} / {t('contactName')}</th>
                            <th className="px-4 py-3 text-right">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {loading ? (
                            <tr><td colSpan="7" className="px-4 py-10 text-center text-gray-400">{t('loading')}</td></tr>
                        ) : filteredClients.length === 0 ? (
                            <tr><td colSpan="7" className="px-4 py-10 text-center text-gray-400">{t('noData')}</td></tr>
                        ) : filteredClients.map((c, index) => (
                            <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-4 py-3 font-medium text-gray-600">{index + 1}</td>
                                <td className="px-4 py-3">
                                    <div className="font-bold text-gray-800 dark:text-white">{c.name}</div>
                                    <div className="text-[10px] text-blue-500">{c.homepage}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="text-gray-700 dark:text-gray-300">{c.representative}</div>
                                    <div className="text-xs text-gray-500">{c.businessNo}</div>
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-500 max-w-[150px] truncate" title={c.address}>{c.address}</td>
                                <td className="px-4 py-3">
                                    <div className="text-gray-700 dark:text-gray-300">{c.phone}</div>
                                    <div className="text-xs text-gray-500">{c.fax}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="text-gray-700 dark:text-gray-300 font-semibold">{c.mobile}</div>
                                    <div className="text-xs text-gray-500">{c.contactName} ({c.email})</div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleEdit(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                        <button onClick={() => handleDelete(c.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
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
            <label className="text-xs font-bold text-gray-500">{label} {required && "*"}</label>
            <input 
                type={type} 
                required={required}
                value={value} 
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-400 outline-none transition-all"
            />
        </div>
    );
}
