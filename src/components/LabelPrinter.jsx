import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

const PAPER_SIZES = [
    { key: 'custom_50x30', label: '50 × 30 mm', width: 50, height: 30 },
    { key: 'custom_50x25', label: '50 × 25 mm', width: 50, height: 25 },
    { key: 'custom_40x30', label: '40 × 30 mm', width: 40, height: 30 },
    { key: 'custom_40x20', label: '40 × 20 mm', width: 40, height: 20 },
    { key: 'custom_60x40', label: '60 × 40 mm', width: 60, height: 40 },
    { key: 'custom_60x30', label: '60 × 30 mm', width: 60, height: 30 },
    { key: 'custom_70x40', label: '70 × 40 mm', width: 70, height: 40 },
    { key: 'custom_100x50', label: '100 × 50 mm', width: 100, height: 50 },
    { key: 'custom', label: '사용자 정의', width: 50, height: 30 },
];

const FIELD_KEYS = ['productCode', 'productName', 'option', 'price', 'extra1', 'extra2'];

const DEFAULT_FIELD_POSITIONS = {
    productCode: { x: 50, y: 12 },
    productName: { x: 50, y: 30 },
    option:      { x: 50, y: 48 },
    price:       { x: 50, y: 66 },
    extra1:      { x: 50, y: 80 },
    extra2:      { x: 50, y: 92 },
};

const DEFAULT_FIELD_STYLES = {
    productCode: { fontWeight: 800, sizeOffset: 2, color: '#111' },
    productName: { fontWeight: 600, sizeOffset: 0, color: '#333' },
    option:      { fontWeight: 400, sizeOffset: 0, color: '#555' },
    price:       { fontWeight: 900, sizeOffset: 3, color: '#000' },
    extra1:      { fontWeight: 500, sizeOffset: 0, color: '#444' },
    extra2:      { fontWeight: 500, sizeOffset: 0, color: '#444' },
};

const WEIGHT_CYCLE = [400, 600, 800, 900];
const WEIGHT_LABELS = { 400: '가늘게', 600: '보통', 800: '굵게', 900: '매우 굵게' };

const FIELD_LABELS = {
    productCode: '상품코드',
    productName: '상품명',
    option: '옵션',
    price: '가격',
    extra1: '추가1',
    extra2: '추가2',
};

export default function LabelPrinter({ user }) {
    const { t } = useLanguage();

    const [paperSize, setPaperSize] = useState(PAPER_SIZES[0]);
    const [customWidth, setCustomWidth] = useState(50);
    const [customHeight, setCustomHeight] = useState(30);
    const [fontSize, setFontSize] = useState('auto');
    const [copies, setCopies] = useState(1);
    const [orientation, setOrientation] = useState('portrait');
    const [showInventoryPicker, setShowInventoryPicker] = useState(false);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [inventoryLoaded, setInventoryLoaded] = useState(false);
    const [inventorySearch, setInventorySearch] = useState('');

    // Label items list
    const [labelItems, setLabelItems] = useState([
        { id: Date.now(), productCode: '', productName: '', option: '', price: '', extra1: '', extra2: '' }
    ]);
    const [activeItemIndex, setActiveItemIndex] = useState(0);

    // Field positions (percentage-based)
    const [fieldPositions, setFieldPositions] = useState({ ...DEFAULT_FIELD_POSITIONS });

    // Per-field style overrides
    const [fieldStyles, setFieldStyles] = useState(
        JSON.parse(JSON.stringify(DEFAULT_FIELD_STYLES))
    );

    // Drag state
    const [draggingField, setDraggingField] = useState(null);
    const previewContainerRef = useRef(null);

    const getWidth = () => paperSize.key === 'custom' ? customWidth : paperSize.width;
    const getHeight = () => paperSize.key === 'custom' ? customHeight : paperSize.height;
    const getPrintWidth = () => orientation === 'portrait' ? getWidth() : getHeight();
    const getPrintHeight = () => orientation === 'portrait' ? getHeight() : getWidth();

    const addLabelItem = () => {
        setLabelItems(prev => [...prev, { id: Date.now(), productCode: '', productName: '', option: '', price: '', extra1: '', extra2: '' }]);
    };

    const removeLabelItem = (id) => {
        if (labelItems.length <= 1) return;
        setLabelItems(prev => prev.filter(i => i.id !== id));
        if (activeItemIndex >= labelItems.length - 1) setActiveItemIndex(Math.max(0, labelItems.length - 2));
    };

    const updateLabelItem = (id, field, value) => {
        setLabelItems(prev => prev.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const duplicateLabelItem = (id) => {
        const item = labelItems.find(i => i.id === id);
        if (item) {
            setLabelItems(prev => [...prev, { ...item, id: Date.now() }]);
        }
    };

    const loadInventory = () => {
        if (inventoryLoaded) { setShowInventoryPicker(true); return; }
        const q = collection(db, 'inventory');
        onSnapshot(q, (snapshot) => {
            setInventoryItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setInventoryLoaded(true);
            setShowInventoryPicker(true);
        });
    };

    const importFromInventory = (invItem) => {
        setLabelItems(prev => [...prev, {
            id: Date.now(),
            productCode: invItem.productCode || '',
            productName: invItem.productName || '',
            option: invItem.category || '',
            price: '',
            extra1: '',
            extra2: ''
        }]);
        setShowInventoryPicker(false);
    };

    const calculateFontSize = (w, h) => {
        if (fontSize !== 'auto') return parseInt(fontSize);
        const minDim = Math.min(w, h);
        if (minDim <= 25) return 6;
        if (minDim <= 30) return 7;
        if (minDim <= 40) return 8;
        if (minDim <= 50) return 9;
        return 10;
    };

    const resetPositions = () => {
        setFieldPositions({ ...DEFAULT_FIELD_POSITIONS });
    };

    const toggleFieldWeight = (key) => {
        setFieldStyles(prev => {
            const current = prev[key].fontWeight;
            const idx = WEIGHT_CYCLE.indexOf(current);
            const next = WEIGHT_CYCLE[(idx + 1) % WEIGHT_CYCLE.length];
            return { ...prev, [key]: { ...prev[key], fontWeight: next } };
        });
    };

    const adjustFieldSize = (key, delta) => {
        setFieldStyles(prev => ({
            ...prev,
            [key]: { ...prev[key], sizeOffset: Math.max(-4, Math.min(8, prev[key].sizeOffset + delta)) }
        }));
    };

    const resetFieldStyles = () => {
        setFieldStyles(JSON.parse(JSON.stringify(DEFAULT_FIELD_STYLES)));
    };

    // --- Drag-and-Drop Logic ---
    const handleMouseDown = useCallback((e, fieldKey) => {
        e.preventDefault();
        e.stopPropagation();
        setDraggingField(fieldKey);
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (!draggingField || !previewContainerRef.current) return;
        const rect = previewContainerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setFieldPositions(prev => ({
            ...prev,
            [draggingField]: {
                x: Math.max(2, Math.min(98, x)),
                y: Math.max(2, Math.min(98, y)),
            }
        }));
    }, [draggingField]);

    const handleMouseUp = useCallback(() => {
        setDraggingField(null);
    }, []);

    const handleTouchStart = useCallback((e, fieldKey) => {
        e.stopPropagation();
        setDraggingField(fieldKey);
    }, []);

    const handleTouchMove = useCallback((e) => {
        if (!draggingField || !previewContainerRef.current) return;
        const touch = e.touches[0];
        const rect = previewContainerRef.current.getBoundingClientRect();
        const x = ((touch.clientX - rect.left) / rect.width) * 100;
        const y = ((touch.clientY - rect.top) / rect.height) * 100;
        setFieldPositions(prev => ({
            ...prev,
            [draggingField]: {
                x: Math.max(2, Math.min(98, x)),
                y: Math.max(2, Math.min(98, y)),
            }
        }));
    }, [draggingField]);

    useEffect(() => {
        if (draggingField) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchmove', handleTouchMove);
            window.addEventListener('touchend', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
                window.removeEventListener('touchmove', handleTouchMove);
                window.removeEventListener('touchend', handleMouseUp);
            };
        }
    }, [draggingField, handleMouseMove, handleMouseUp, handleTouchMove]);

    // --- Print ---
    const handlePrint = () => {
        const w = getWidth();
        const h = getHeight();
        const pw = getPrintWidth();
        const ph = getPrintHeight();
        const fs = calculateFontSize(w, h);

        let labelsHtml = '';
        const totalLabels = labelItems.length * copies;
        let labelIndex = 0;

        for (let i = 0; i < labelItems.length; i++) {
            const item = labelItems[i];
            for (let c = 0; c < copies; c++) {
                labelIndex++;
                let fieldsHtml = '';
                for (const key of FIELD_KEYS) {
                    const value = item[key];
                    if (!value) continue;

                    const style = fieldStyles[key];
                    const pos = fieldPositions[key];
                    const fieldFs = fs + style.sizeOffset;

                    fieldsHtml += `<div style="
                        position: absolute;
                        left: ${pos.x}%;
                        top: ${pos.y}%;
                        transform: translate(-50%, -50%);
                        font-size: ${fieldFs}pt;
                        font-weight: ${style.fontWeight};
                        color: ${style.color};
                        white-space: nowrap;
                        line-height: 1.2;
                    ">${value}</div>`;
                }

                // Only add page-break if not the last label
                const pageBreak = labelIndex < totalLabels ? 'page-break-after: always;' : '';

                labelsHtml += `<div class="label-page" style="
                    width: ${pw}mm;
                    height: ${ph}mm;
                    position: relative;
                    box-sizing: border-box;
                    overflow: hidden;
                    ${pageBreak}
                ">${fieldsHtml}</div>`;
            }
        }

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>바코드 인쇄</title>
<style>
    @page {
        size: ${pw}mm ${ph}mm;
        margin: 0mm !important;
    }
    *, *::before, *::after {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }
    html {
        margin: 0 !important;
        padding: 0 !important;
    }
    body {
        margin: 0 !important;
        padding: 0 !important;
        width: ${pw}mm;
        font-family: 'Malgun Gothic', 'Noto Sans KR', sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .label-page {
        width: ${pw}mm;
        height: ${ph}mm;
        position: relative;
        overflow: hidden;
    }
    @media screen {
        body {
            background: #888;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            padding: 10px;
        }
        .label-page {
            background: white;
            box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        }
    }
    @media print {
        html, body {
            width: ${pw}mm !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
        }
    }
</style>
</head>
<body>${labelsHtml}</body>
</html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 500);
    };

    const filteredInventory = inventoryItems.filter(i =>
        i.productName?.toLowerCase().includes(inventorySearch.toLowerCase()) ||
        i.productCode?.toLowerCase().includes(inventorySearch.toLowerCase())
    );

    // Preview calculations
    const previewLabelW = getWidth();
    const previewLabelH = getHeight();
    const previewFs = calculateFontSize(previewLabelW, previewLabelH);
    const previewScale = Math.min(300 / previewLabelW, 220 / previewLabelH, 6);
    const previewPxW = previewLabelW * previewScale;
    const previewPxH = previewLabelH * previewScale;

    const activeItem = labelItems[activeItemIndex] || labelItems[0];

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl">
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 p-2">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Paper Size */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('labelPaperSize')}</label>
                        <select value={paperSize.key} onChange={(e) => { const f = PAPER_SIZES.find(p => p.key === e.target.value); if (f) setPaperSize(f); }}
                            className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-blue-400 outline-none transition-all">
                            {PAPER_SIZES.map(s => (<option key={s.key} value={s.key}>{s.label}</option>))}
                        </select>
                    </div>

                    {paperSize.key === 'custom' && (
                        <div className="flex items-center gap-2">
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">{t('labelWidth')}</label>
                                <div className="flex items-center gap-1">
                                    <input type="number" value={customWidth} onChange={e => setCustomWidth(Number(e.target.value))} min={10} max={200}
                                        className="w-16 px-2 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white text-sm text-center focus:ring-2 focus:ring-blue-400 outline-none" />
                                    <span className="text-xs text-gray-400">mm</span>
                                </div>
                            </div>
                            <span className="text-gray-300 mt-5">×</span>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">{t('labelHeight')}</label>
                                <div className="flex items-center gap-1">
                                    <input type="number" value={customHeight} onChange={e => setCustomHeight(Number(e.target.value))} min={10} max={200}
                                        className="w-16 px-2 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white text-sm text-center focus:ring-2 focus:ring-blue-400 outline-none" />
                                    <span className="text-xs text-gray-400">mm</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Orientation */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">방향</label>
                        <div className="flex rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
                            <button onClick={() => setOrientation('portrait')}
                                className={`px-3 py-2 text-xs font-bold transition-all ${orientation === 'portrait' ? 'bg-blue-500 text-white' : 'bg-gray-50 dark:bg-gray-700 text-gray-400 hover:bg-gray-100'}`}>
                                <span className="inline-block w-3 h-4 border-2 border-current rounded-sm mr-1" style={{verticalAlign: 'middle'}}></span>
                                세로
                            </button>
                            <button onClick={() => setOrientation('landscape')}
                                className={`px-3 py-2 text-xs font-bold transition-all ${orientation === 'landscape' ? 'bg-blue-500 text-white' : 'bg-gray-50 dark:bg-gray-700 text-gray-400 hover:bg-gray-100'}`}>
                                <span className="inline-block w-4 h-3 border-2 border-current rounded-sm mr-1" style={{verticalAlign: 'middle'}}></span>
                                가로
                            </button>
                        </div>
                    </div>

                    {/* Font Size */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">{t('labelFontSize')}</label>
                        <select value={fontSize} onChange={e => setFontSize(e.target.value)}
                            className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-blue-400 outline-none">
                            <option value="auto">자동</option>
                            {[6,7,8,9,10,11,12,14].map(s => <option key={s} value={String(s)}>{s}pt</option>)}
                        </select>
                    </div>

                    {/* Copies */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">{t('labelCopies')}</label>
                        <input type="number" value={copies} onChange={e => setCopies(Math.max(1, Number(e.target.value)))} min={1} max={100}
                            className="w-16 px-2 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white text-sm text-center focus:ring-2 focus:ring-blue-400 outline-none" />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    <button onClick={loadInventory}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        {t('labelImportInventory')}
                    </button>
                    <button onClick={handlePrint}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        {t('labelPrint')}
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden">
                {/* Left: Input Table */}
                <div className="flex-1 overflow-auto">
                    <div className="overflow-x-auto border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="text-[10px] uppercase bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                                <tr>
                                    <th className="px-2 py-2.5 text-center w-8">#</th>
                                    <th className="px-2 py-2.5">{t('productCode')}</th>
                                    <th className="px-2 py-2.5">{t('productName')}</th>
                                    <th className="px-2 py-2.5">{t('labelOption')}</th>
                                    <th className="px-2 py-2.5">{t('labelPrice')}</th>
                                    <th className="px-2 py-2.5">추가1</th>
                                    <th className="px-2 py-2.5">추가2</th>
                                    <th className="px-2 py-2.5 text-center w-20"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {labelItems.map((item, idx) => (
                                    <tr key={item.id}
                                        onClick={() => setActiveItemIndex(idx)}
                                        className={`transition-colors cursor-pointer ${activeItemIndex === idx ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-200 dark:ring-blue-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                                        <td className="px-2 py-2 text-center text-gray-400 font-medium text-xs">{idx + 1}</td>
                                        <td className="px-2 py-2">
                                            <input type="text" value={item.productCode} onChange={e => updateLabelItem(item.id, 'productCode', e.target.value)}
                                                placeholder="ABC123"
                                                className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white text-xs focus:ring-2 focus:ring-blue-400 outline-none" />
                                        </td>
                                        <td className="px-2 py-2">
                                            <input type="text" value={item.productName} onChange={e => updateLabelItem(item.id, 'productName', e.target.value)}
                                                placeholder="상품명"
                                                className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white text-xs focus:ring-2 focus:ring-blue-400 outline-none" />
                                        </td>
                                        <td className="px-2 py-2">
                                            <input type="text" value={item.option} onChange={e => updateLabelItem(item.id, 'option', e.target.value)}
                                                placeholder="옵션"
                                                className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white text-xs focus:ring-2 focus:ring-blue-400 outline-none" />
                                        </td>
                                        <td className="px-2 py-2">
                                            <input type="text" value={item.price} onChange={e => updateLabelItem(item.id, 'price', e.target.value)}
                                                placeholder="가격"
                                                className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white text-xs focus:ring-2 focus:ring-blue-400 outline-none" />
                                        </td>
                                        <td className="px-2 py-2">
                                            <input type="text" value={item.extra1} onChange={e => updateLabelItem(item.id, 'extra1', e.target.value)}
                                                placeholder=""
                                                className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white text-xs focus:ring-2 focus:ring-blue-400 outline-none" />
                                        </td>
                                        <td className="px-2 py-2">
                                            <input type="text" value={item.extra2} onChange={e => updateLabelItem(item.id, 'extra2', e.target.value)}
                                                placeholder=""
                                                className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white text-xs focus:ring-2 focus:ring-blue-400 outline-none" />
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                            <div className="flex justify-center gap-0.5">
                                                <button onClick={(e) => { e.stopPropagation(); duplicateLabelItem(item.id); }} title="복제"
                                                    className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); removeLabelItem(item.id); }} title="삭제"
                                                    className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <button onClick={addLabelItem}
                        className="mt-3 w-full py-2.5 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl text-gray-400 hover:text-green-500 hover:border-green-400 transition-all flex items-center justify-center gap-2 text-sm font-bold">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        {t('labelAddRow')}
                    </button>
                </div>

                {/* Right: Interactive Preview with Drag-and-Drop */}
                <div className="lg:w-[340px] flex-shrink-0">
                    <div className="sticky top-0">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('labelPreview')}</h3>
                            <button onClick={resetPositions}
                                className="text-[10px] font-bold text-blue-500 hover:text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg transition-colors">
                                위치 초기화
                            </button>
                        </div>

                        <div className="bg-gray-100 dark:bg-gray-900 rounded-2xl p-6 flex flex-col items-center gap-3 border border-gray-200 dark:border-gray-700">
                            <div className="text-[10px] text-gray-400">
                                {getWidth()} × {getHeight()} mm
                            </div>

                            {/* Draggable Preview Label */}
                            <div className="relative bg-white rounded shadow-lg border border-gray-300 select-none"
                                ref={previewContainerRef}
                                style={{
                                    width: `${previewPxW}px`,
                                    height: `${previewPxH}px`,
                                    cursor: draggingField ? 'grabbing' : 'default',
                                    touchAction: 'none',
                                }}
                            >
                                {/* Grid guide lines */}
                                <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.06 }}>
                                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-400" style={{ transform: 'translateX(-50%)' }}></div>
                                    <div className="absolute top-1/2 left-0 right-0 h-px bg-blue-400" style={{ transform: 'translateY(-50%)' }}></div>
                                </div>

                                {/* Draggable Fields */}
                                {FIELD_KEYS.map((key) => {
                                    const value = activeItem[key];
                                    if (!value) return null;

                                    const pos = fieldPositions[key];
                                    const style = fieldStyles[key];
                                    const fieldFs = (previewFs + style.sizeOffset) * (previewScale / 3.78);

                                    return (
                                        <div
                                            key={key}
                                            onMouseDown={(e) => handleMouseDown(e, key)}
                                            onTouchStart={(e) => handleTouchStart(e, key)}
                                            className={`absolute select-none transition-shadow ${draggingField === key ? 'z-20 drop-shadow-lg' : 'z-10 hover:drop-shadow-md'}`}
                                            style={{
                                                left: `${pos.x}%`,
                                                top: `${pos.y}%`,
                                                transform: 'translate(-50%, -50%)',
                                                cursor: draggingField === key ? 'grabbing' : 'grab',
                                                fontSize: `${Math.max(fieldFs, 8)}px`,
                                                fontWeight: style.fontWeight,
                                                color: style.color,
                                                whiteSpace: 'nowrap',
                                                lineHeight: 1.2,
                                                padding: '2px 4px',
                                                borderRadius: '3px',
                                                border: draggingField === key ? '1.5px solid #3b82f6' : '1.5px dashed transparent',
                                                backgroundColor: draggingField === key ? 'rgba(59,130,246,0.05)' : 'transparent',
                                            }}
                                            title={`${FIELD_LABELS[key]} — 드래그하여 위치 변경`}
                                        >
                                            {value}
                                        </div>
                                    );
                                })}

                                {/* Empty state */}
                                {FIELD_KEYS.every(k => !activeItem[k]) && (
                                    <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-xs">
                                        {t('labelPreviewEmpty')}
                                    </div>
                                )}
                            </div>

                            {/* Drag instruction */}
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" /></svg>
                                텍스트를 드래그하여 위치를 조정하세요
                            </div>
                        </div>

                        {/* Per-field Style Controls */}
                        <div className="mt-3 space-y-1.5">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">필드 서식</span>
                                <button onClick={resetFieldStyles}
                                    className="text-[10px] font-bold text-gray-400 hover:text-blue-500 transition-colors">
                                    초기화
                                </button>
                            </div>
                            {FIELD_KEYS.map(key => {
                                if (!activeItem[key]) return null;
                                const pos = fieldPositions[key];
                                const style = fieldStyles[key];
                                return (
                                    <div key={key} className="bg-gray-50 dark:bg-gray-700 rounded-lg px-2.5 py-2 flex items-center gap-2">
                                        {/* Field name */}
                                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 w-12 flex-shrink-0">{FIELD_LABELS[key]}</span>

                                        {/* Bold toggle */}
                                        <button onClick={() => toggleFieldWeight(key)}
                                            title={WEIGHT_LABELS[style.fontWeight]}
                                            className={`px-1.5 py-0.5 rounded text-[10px] font-black transition-all border ${
                                                style.fontWeight >= 800
                                                    ? 'bg-gray-800 text-white border-gray-800 dark:bg-white dark:text-gray-800 dark:border-white'
                                                    : style.fontWeight >= 600
                                                    ? 'bg-gray-300 text-gray-700 border-gray-300 dark:bg-gray-500 dark:text-white dark:border-gray-500'
                                                    : 'bg-transparent text-gray-400 border-gray-300 dark:border-gray-500'
                                            }`}>
                                            B
                                        </button>

                                        {/* Size controls */}
                                        <div className="flex items-center gap-0.5 ml-1">
                                            <button onClick={() => adjustFieldSize(key, -1)}
                                                className="w-5 h-5 flex items-center justify-center rounded bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-[11px] font-bold">
                                                −
                                            </button>
                                            <span className="text-[9px] font-mono text-gray-400 w-6 text-center">
                                                {style.sizeOffset >= 0 ? '+' : ''}{style.sizeOffset}
                                            </span>
                                            <button onClick={() => adjustFieldSize(key, 1)}
                                                className="w-5 h-5 flex items-center justify-center rounded bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-[11px] font-bold">
                                                +
                                            </button>
                                        </div>

                                        {/* Position */}
                                        <span className="text-[9px] font-mono text-gray-300 dark:text-gray-500 ml-auto">
                                            {Math.round(pos.x)},{Math.round(pos.y)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Tip: Printer Setup */}
                        <div className="mt-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 border border-amber-100 dark:border-amber-800">
                            <div className="text-[10px] text-amber-700 dark:text-amber-400 font-bold mb-2">⚠️ 프린터 용지 설정 (최초 1회)</div>
                            <div className="text-[10px] text-amber-600 dark:text-amber-300 leading-relaxed space-y-1">
                                <p><b>1.</b> Windows 설정 → 프린터 → TSC TTP-345</p>
                                <p><b>2.</b> <b>인쇄 기본 설정</b> 클릭</p>
                                <p><b>3.</b> 용지 탭 → <b>USER</b> 선택 후:</p>
                                <p className="pl-3">너비(W): <b>{getWidth()}.0</b> mm / 높이(H): <b>{getHeight()}.0</b> mm</p>
                                <p><b>4.</b> 확인 저장</p>
                            </div>
                        </div>
                        <div className="mt-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-100 dark:border-blue-800">
                            <div className="text-[10px] text-blue-700 dark:text-blue-400 font-bold mb-2">🖨️ Chrome 인쇄 설정</div>
                            <div className="text-[10px] text-blue-600 dark:text-blue-300 leading-relaxed space-y-1">
                                <p><b>1.</b> 용지 크기 → <b>USER</b> 선택</p>
                                <p><b>2.</b> 여백 → <b>없음</b></p>
                                <p><b>3.</b> 배율 → <b>100%</b></p>
                                <p className="text-blue-400 dark:text-blue-500 mt-1">💡 또는 하단의 "시스템 대화상자를 사용하여 인쇄" 클릭 → 기본 설정에서 용지 크기 직접 설정 가능</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Inventory Picker Modal */}
            {showInventoryPicker && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[70vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 dark:text-white">{t('labelSelectProduct')}</h3>
                            <button onClick={() => setShowInventoryPicker(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-4">
                            <input type="text" placeholder={t('search')} value={inventorySearch}
                                onChange={e => setInventorySearch(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 pb-4">
                            {filteredInventory.length === 0 ? (
                                <p className="text-center text-gray-400 py-8">{t('noData')}</p>
                            ) : filteredInventory.map(inv => (
                                <button key={inv.id} onClick={() => importFromInventory(inv)}
                                    className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors flex items-center justify-between gap-3 group mb-1">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-sm text-gray-800 dark:text-white truncate">{inv.productName}</div>
                                        <div className="text-xs text-blue-500 font-mono">{inv.productCode}</div>
                                    </div>
                                    <span className="bg-gray-100 dark:bg-gray-600 px-2 py-0.5 rounded text-[10px] font-bold text-gray-500 dark:text-gray-300 flex-shrink-0">{inv.category}</span>
                                    <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
