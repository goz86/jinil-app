import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '../firebase';
import { collection, onSnapshot, deleteDoc, doc, addDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { useLanguage } from '../contexts/LanguageContext';
import Swal from 'sweetalert2';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export default function DeliveryWidget({ selectedDate, deliveries = [] }) {
    const { lang, t } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [barcode, setBarcode] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef(null);
    const [menuPos, setMenuPos] = useState(null);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!selectedImage) return;
            if (e.ctrlKey && e.key === 'c') {
                e.preventDefault();
                window.electronAPI?.copyImage(selectedImage).then(success => {
                    if (success) {
                        Swal.fire({
                            title: t('copiedToast'),
                            toast: true,
                            position: 'top-end',
                            timer: 2000,
                            showConfirmButton: false,
                            icon: 'success'
                        });
                    }
                });
            }
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                window.electronAPI?.saveImage(selectedImage);
            }
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                window.electronAPI?.printImage(selectedImage);
            }
            if (e.key === 'Escape') setSelectedImage(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedImage, t]);

    useEffect(() => {
        const h = () => setMenuPos(null);
        window.addEventListener('click', h);
        return () => window.removeEventListener('click', h);
    }, []);

    const handleContextMenu = (e, imageUrl) => {
        e.preventDefault();
        setMenuPos({ x: e.clientX, y: e.clientY, url: imageUrl });
    };

    // Data is now managed by parent (App.jsx) via props

    const handleDelete = async (item) => {
        try {
            // 1. Delete image from Storage if exists
            if (item.imagePath || item.imageUrl) {
                try {
                    // Try imagePath first (new records), then fallback to URL parsing
                    let storageRef;
                    if (item.imagePath) {
                        storageRef = ref(storage, item.imagePath);
                    } else if (item.imageUrl && item.imageUrl.includes('firebasestorage.googleapis.com')) {
                        // Extract path from URL: /o/PATH?alt=media
                        const decodedUrl = decodeURIComponent(item.imageUrl);
                        const pathPart = decodedUrl.split('/o/')[1]?.split('?')[0];
                        if (pathPart) storageRef = ref(storage, pathPart);
                    }

                    if (storageRef) {
                        await deleteObject(storageRef);
                    }
                } catch (storageErr) {
                    console.error("Storage delete error (might be already gone):", storageErr);
                }
            }

            // 2. Delete Firestore document
            await deleteDoc(doc(db, "deliveries", item.id));
        } catch (err) {
            console.error("Delete error:", err);
        }
    };

    const compressImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1200;
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        resolve(new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        }));
                    }, 'image/jpeg', 0.7); // 70% quality
                };
            };
        });
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            // Display preview immediately
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);

            // Compress the image for upload
            const optimizedFile = await compressImage(file);
            setImageFile(optimizedFile);
        }
    };

    const handleSubmit = async () => {
        if (!imageFile || !barcode.trim()) return;
        setUploading(true);
        setUploadProgress(0);

        try {
            // 1. Upload image to Firebase Storage
            const fileName = `deliveries/${Date.now()}_${imageFile.name}`;
            const storageRef = ref(storage, fileName);
            const uploadTask = uploadBytesResumable(storageRef, imageFile);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                    setUploadProgress(progress);
                    if (window.electronAPI && window.electronAPI.setProgressBar) {
                        // setProgressBar takes a value between 0.0 and 1.0
                        window.electronAPI.setProgressBar(progress / 100);
                    }
                },
                (error) => {
                    console.error("Upload error:", error);
                    setUploading(false);
                    if (window.electronAPI && window.electronAPI.setProgressBar) {
                        window.electronAPI.setProgressBar(-1); // Remove progress bar on error
                    }
                },
                async () => {
                    // 2. Get download URL
                    const imageUrl = await getDownloadURL(uploadTask.snapshot.ref);

                    // 3. Save record to Firestore
                    await addDoc(collection(db, "deliveries"), {
                        barcode: barcode.trim(),
                        imageUrl,
                        imagePath: fileName, // Save path for easier cleanup later
                        timestamp: serverTimestamp(),
                        uploadedBy: "Team"
                    });

                    // Reset form
                    setBarcode('');
                    setImageFile(null);
                    setImagePreview(null);
                    setShowForm(false);
                    setUploading(false);
                    setUploadProgress(0);
                    if (window.electronAPI && window.electronAPI.setProgressBar) {
                        window.electronAPI.setProgressBar(-1); // Remove progress bar on success
                    }

                    // Show success notification
                    Swal.fire({
                        icon: 'success',
                        title: t('successUpload'),
                        text: t('successUploadText'),
                        timer: 2000,
                        showConfirmButton: false,
                        toast: true,
                        position: 'top-end'
                    });
                }
            );
        } catch (err) {
            console.error("Submit error:", err);
            setUploading(false);
            if (window.electronAPI && window.electronAPI.setProgressBar) {
                window.electronAPI.setProgressBar(-1);
            }
        }
    };

    const handleExportExcel = async () => {
        if (deliveries.length === 0) return;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(t('deliveryWidgetTitle'));

        // Define columns
        worksheet.columns = [
            { header: t('updatedAt'), key: 'date', width: 25 },
            { header: t('waybillNumber'), key: 'barcode', width: 20 },
            { header: t('uploadedBy'), key: 'uploadedBy', width: 15 },
            { header: t('noImage'), key: 'image', width: 15 } // Placeholder for image
        ];

        // Style header
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Process data
        for (let i = 0; i < filteredDeliveries.length; i++) {
            const item = filteredDeliveries[i];
            const rowNumber = i + 2;
            const row = worksheet.addRow({
                date: formatDate(item.timestamp),
                barcode: item.barcode || "N/A",
                uploadedBy: item.uploadedBy || "Team"
            });

            // Set row height to be much larger for the image
            row.height = 120;
            row.alignment = { vertical: 'middle', horizontal: 'left' };

            // Embed image if exists
            if (item.imageUrl) {
                try {
                    // Try to fetch with cache: 'no-cache' to avoid some CORS edge cases
                    const response = await fetch(item.imageUrl, { cache: 'no-cache' });
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                    const blob = await response.blob();
                    const buffer = await blob.arrayBuffer();

                    // Detect extension from mime type
                    let extension = 'jpeg';
                    if (blob.type === 'image/png') extension = 'png';
                    else if (blob.type === 'image/gif') extension = 'gif';

                    const imageId = workbook.addImage({
                        buffer: buffer,
                        extension: extension,
                    });

                    // Centering the image in the cell
                    worksheet.addImage(imageId, {
                        tl: { col: 3.1, row: rowNumber - 0.9 },
                        ext: { width: 140, height: 140 }, // Slightly larger
                        editAs: 'oneCell'
                    });

                    row.getCell('image').value = ""; // Clear text if image succeeded
                } catch (error) {
                    console.error("Error embedding image in Excel:", error);
                    row.getCell('image').value = "CORS Error: Check settings";
                }
            }
        }
        worksheet.getColumn('image').width = 25; // Wider image column

        const buffer = await workbook.xlsx.writeBuffer();
        const today = new Date().toISOString().split('T')[0];
        saveAs(new Blob([buffer]), `${t('deliveryWidgetTitle')}_${today}.xlsx`);
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return "";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // Filter deliveries by selectedDate
    const filteredDeliveries = deliveries.filter(item => {
        if (!selectedDate) return true;
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
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center py-10">
                <p className="text-gray-400 dark:text-gray-500 text-sm">{t('loading')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Action Buttons Row */}
            <div className="flex gap-2">
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-sm font-semibold transition-all duration-200
                        bg-blue-500 hover:bg-blue-600 text-white shadow-sm hover:shadow-md active:scale-95"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    {showForm ? t('cancel') : t('addDelivery')}
                </button>
                {filteredDeliveries.length > 0 && (
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-sm font-semibold transition-all duration-200
                            bg-green-500 hover:bg-green-600 text-white shadow-sm hover:shadow-md active:scale-95"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {t('exportExcel')}
                    </button>
                )}
            </div>

            {/* Add New Delivery Form */}
            {showForm && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 space-y-3 border border-blue-200 dark:border-blue-800">
                    {/* Camera / File Input */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                    >
                        {imagePreview ? (
                            <img src={imagePreview} alt="Preview" className="max-h-40 mx-auto rounded-lg" />
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-blue-500 dark:text-blue-400">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="text-sm font-medium">{t('takePhoto')}</span>
                            </div>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    {/* Barcode / Order Code Input */}
                    <input
                        type="text"
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        placeholder={t('orderCodePlaceholder')}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />

                    {/* Upload Progress */}
                    {uploading && (
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={uploading || !imageFile || !barcode.trim()}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                            bg-blue-500 hover:bg-blue-600 text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                    >
                        {uploading ? `${t('uploading')} (${uploadProgress}%)` : t('upload')}
                    </button>
                </div>
            )}

            {/* Image Lightbox Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] cursor-pointer"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="relative w-full h-full flex items-center justify-center p-4">
                        <img
                            src={selectedImage}
                            alt="Delivery"
                            className="max-w-full max-h-full object-contain shadow-2xl transition-transform duration-300"
                            onContextMenu={(e) => handleContextMenu(e, selectedImage)}
                        />
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute top-6 right-6 bg-white/20 hover:bg-white/40 text-white rounded-full w-12 h-12 flex items-center justify-center backdrop-blur-md transition-colors text-2xl"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Context Menu inside Lightbox */}
                    {menuPos && (
                        <div
                            className="fixed z-[101] bg-white rounded-lg shadow-2xl border border-gray-100 py-1 w-44 animate-in fade-in zoom-in duration-200"
                            style={{ top: menuPos.y, left: menuPos.x }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex justify-between items-center transition-colors"
                                onClick={() => { 
                                    window.electronAPI?.copyImage(menuPos.url).then(success => {
                                        if (success) {
                                            Swal.fire({
                                                title: '복사되었습니다',
                                                toast: true,
                                                position: 'top-end',
                                                timer: 2000,
                                                showConfirmButton: false,
                                                icon: 'success'
                                            });
                                        }
                                    }); 
                                    setMenuPos(null); 
                                }}
                            >
                                <span>{t('copy')}</span>
                                <span className="text-gray-400 text-[10px] font-medium">Ctrl+C</span>
                            </button>
                            <button
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex justify-between items-center transition-colors"
                                onClick={() => { window.electronAPI?.saveImage(menuPos.url); setMenuPos(null); }}
                            >
                                <span>{t('save')}</span>
                                <span className="text-gray-400 text-[10px] font-medium">Ctrl+S</span>
                            </button>
                            <button
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex justify-between items-center border-t border-gray-50 transition-colors"
                                onClick={() => { window.electronAPI?.printImage(menuPos.url); setMenuPos(null); }}
                            >
                                <span>{t('print')}</span>
                                <span className="text-gray-400 text-[10px] font-medium">Ctrl+P</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {filteredDeliveries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500">
                    <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <p className="text-sm">{t('noDeliveries')}</p>
                </div>
            ) : (
                filteredDeliveries.map((item) => (
                    <div
                        key={item.id}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-5 flex flex-col gap-4 group shadow-sm border border-gray-100 dark:border-gray-100/10 hover:shadow-md transition-all mb-4"
                    >
                        {/* Header Info: Date & Waybill */}
                        <div className="space-y-1 relative">
                            {/* Delete Action - Positioned top right relative to text area */}
                            <button
                                onClick={() => handleDelete(item)}
                                className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1"
                                title={t('delete')}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>

                            <div className="text-gray-900 dark:text-gray-100 text-base font-medium">
                                {formatDate(item.timestamp)}
                            </div>

                            <div className="text-gray-900 dark:text-gray-100 text-base font-bold flex flex-wrap items-center">
                                <span>{t('waybillNumber')}:</span>
                                <span className="ml-1 font-mono tracking-tight">{item.barcode || "N/A"}</span>
                            </div>

                            {item.uploadedBy && (
                                <div className="text-xs text-gray-400 dark:text-gray-500 pt-1">
                                    {item.uploadedBy}
                                </div>
                            )}
                        </div>

                        {/* Large Full-Width Image */}
                        {item.imageUrl && (
                            <div
                                className="w-full aspect-[4/3] rounded-xl overflow-hidden cursor-pointer border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shadow-inner"
                                onClick={() => setSelectedImage(item.imageUrl)}
                            >
                                <img
                                    src={item.imageUrl}
                                    alt="Delivery"
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                                    loading="lazy"
                                    onContextMenu={(e) => handleContextMenu(e, item.imageUrl)}
                                />
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}
