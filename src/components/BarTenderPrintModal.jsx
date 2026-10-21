import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';

export default function BarTenderPrintModal({
    isOpen,
    onClose,
    items = [],
    selectedRowIds = {},
    activeItem = null,
    paperSize = { width: 50, height: 30, label: '50 × 30 mm' },
    onPrintExecute,
    initialPrinter = 'TSC TTP-345'
}) {
    const [printers, setPrinters] = useState([]);
    const [selectedPrinter, setSelectedPrinter] = useState(initialPrinter);
    const [printScope, setPrintScope] = useState('quantity_column'); // 'quantity_column' | 'all' | 'selected' | 'range'
    const [rangeInput, setRangeInput] = useState('');
    const [sortByVendor, setSortByVendor] = useState(false);
    const [copies, setCopies] = useState(1);
    const [isPrinting, setIsPrinting] = useState(false);

    // Load available printers from Electron or fallback
    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        if (window.electronAPI?.getPrinters) {
            window.electronAPI.getPrinters()
                .then((list) => {
                    if (!isMounted) return;
                    if (Array.isArray(list) && list.length > 0) {
                        setPrinters(list);
                        const tsc = list.find(p => p.name.includes('TSC') || p.displayName?.includes('TSC'));
                        if (tsc) {
                            setSelectedPrinter(tsc.name);
                        } else {
                            const def = list.find(p => p.isDefault) || list[0];
                            setSelectedPrinter(def.name);
                        }
                    }
                })
                .catch((err) => console.warn('Printers load error:', err));
        } else {
            setPrinters([
                { name: 'TSC TTP-345', displayName: 'TSC TTP-345 (USB002)', status: 0, isDefault: true },
                { name: 'BIXOLON SLP-D420', displayName: 'BIXOLON SLP-D420 (USB001)', status: 0, isDefault: false },
                { name: '기본 시스템 프린터', displayName: 'Windows 기본 프린터', status: 0, isDefault: false }
            ]);
        }
        return () => { isMounted = false; };
    }, [isOpen]);

    // Calculate item list based on scope
    const targetItems = useMemo(() => {
        if (!items || items.length === 0) return [];

        if (printScope === 'selected') {
            const selectedList = items.filter(it => selectedRowIds[it.id]);
            return selectedList.length > 0 ? selectedList : (activeItem ? [activeItem] : items.slice(0, 1));
        }

        if (printScope === 'range') {
            if (!rangeInput.trim()) return items;
            const indices = new Set();
            const parts = rangeInput.split(/[,;\s]+/);
            parts.forEach(part => {
                const range = part.split(/[-~]/);
                if (range.length === 2) {
                    const start = parseInt(range[0], 10);
                    const end = parseInt(range[1], 10);
                    if (!isNaN(start) && !isNaN(end)) {
                        for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
                            if (i >= 1 && i <= items.length) indices.add(i - 1);
                        }
                    }
                } else {
                    const single = parseInt(part, 10);
                    if (!isNaN(single) && single >= 1 && single <= items.length) {
                        indices.add(single - 1);
                    }
                }
            });
            const filtered = Array.from(indices).sort((a, b) => a - b).map(idx => items[idx]).filter(Boolean);
            return filtered.length > 0 ? filtered : items;
        }

        let result = items;
        if (sortByVendor) {
            result = [...result].sort((a, b) => String(a.extra1 || '').localeCompare(String(b.extra1 || '')));
        }
        return result;
    }, [items, selectedRowIds, printScope, rangeInput, activeItem, sortByVendor]);

    // Calculate total label quantity
    const totalLabelCount = useMemo(() => {
        const mult = Math.max(1, copies || 1);
        if (printScope === 'quantity_column') {
            return targetItems.reduce((acc, it) => {
                const rowQty = parseInt(it._copies || it.수량 || it.qty || it.스티커수량 || 1, 10);
                return acc + (isNaN(rowQty) || rowQty < 1 ? 1 : rowQty);
            }, 0) * mult;
        }
        return targetItems.length * mult;
    }, [targetItems, printScope, copies]);

    if (!isOpen) return null;

    const handleConfirmPrint = async (isTest = false) => {
        if (targetItems.length === 0) {
            Swal.fire({ icon: 'warning', title: '인쇄할 라벨 데이터가 없습니다.' });
            return;
        }

        // Close modal immediately on print
        onClose();

        setIsPrinting(true);
        try {
            await onPrintExecute({
                printerName: selectedPrinter,
                printScope,
                targetItems: isTest ? [targetItems[0]] : targetItems,
                copies: isTest ? 1 : copies,
                isTestPrint: isTest,
                totalCount: isTest ? 1 : totalLabelCount,
            });
        } catch (err) {
            console.error('Print failed:', err);
            Swal.fire({ icon: 'error', title: '인쇄 중 오류 발생', text: err.message });
        } finally {
            setIsPrinting(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200 cursor-pointer"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col font-sans animate-in zoom-in-95 duration-200 cursor-default"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header - Matches App JINIL Clean White & Blue Theme */}
                <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        </div>
                        <div>
                            <h2 className="text-[17px] font-black text-slate-800 tracking-tight">BarTender 인쇄 설정</h2>
                            <p className="text-[11px] text-slate-400 font-bold">라벨 규격: {paperSize.label || `${paperSize.width} × ${paperSize.height} mm`}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors text-lg font-bold cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                    {/* Printer Selection Box */}
                    <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/80">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[12px] font-bold text-slate-700 flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                프린터 (Printer)
                            </label>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                준비 (Ready)
                            </span>
                        </div>
                        <select
                            value={selectedPrinter}
                            onChange={e => setSelectedPrinter(e.target.value)}
                            className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-[13px] font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
                        >
                            {printers.map(p => (
                                <option key={p.name} value={p.name}>
                                    {p.name} {p.name.includes('TSC') ? '(권장 - 300DPI 바코드)' : ''}
                                </option>
                            ))}
                            {printers.length === 0 && (
                                <option value="TSC TTP-345">TSC TTP-345 (USB002)</option>
                            )}
                        </select>
                        <div className="mt-2 text-[11px] text-slate-400 font-medium flex items-center justify-between">
                            <span>위치: USB002 / 해상도: 300 DPI</span>
                            <span className="text-blue-600 font-bold">드라이버 감지됨</span>
                        </div>
                    </div>

                    {/* Quantity & Copies Grid */}
                    <div className="grid grid-cols-2 gap-3.5">
                        <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-200/80">
                            <label className="text-[11px] font-bold text-slate-500 block mb-1.5">
                                동일 사본 (Identical Copies)
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    max="999"
                                    value={copies}
                                    onChange={e => setCopies(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                    className="h-9 w-20 px-2 bg-white border border-slate-300 rounded-lg text-[14px] font-black text-center text-slate-800 outline-none focus:border-blue-500"
                                />
                                <span className="text-[12px] font-bold text-slate-600">부씩 반복</span>
                            </div>
                        </div>

                        <div className="bg-blue-50/60 rounded-xl p-3.5 border border-blue-100 flex flex-col justify-center">
                            <span className="text-[11px] font-bold text-blue-600">총 인쇄 예정 매수</span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-[22px] font-black text-blue-600 leading-none">
                                    {totalLabelCount.toLocaleString()}
                                </span>
                                <span className="text-[12px] font-bold text-blue-600">장 (Labels)</span>
                            </div>
                        </div>
                    </div>

                    {/* Print Scope (Record Selection) */}
                    <div className="space-y-2">
                        <label className="text-[12px] font-bold text-slate-700 block">
                            인쇄 범위 (레코드 선택)
                        </label>
                        <div className="space-y-2">
                            {/* Option 1: Quantity column */}
                            <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${printScope === 'quantity_column' ? 'bg-blue-50/40 border-blue-400 ring-2 ring-blue-400/20 shadow-2xs' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                <input
                                    type="radio"
                                    name="printScope"
                                    value="quantity_column"
                                    checked={printScope === 'quantity_column'}
                                    onChange={() => setPrintScope('quantity_column')}
                                    className="mt-0.5 accent-blue-600"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[13px] font-bold text-slate-800">
                                            '수량' 열 기준 인쇄 (BarTender 연동 추천)
                                        </span>
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-md">스마트</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                                        각 행의 수량 열(예: 110장, 220장...)만큼 자동으로 개별 인쇄합니다.
                                    </p>
                                </div>
                            </label>

                            {/* Option 2: All items (1 each) */}
                            <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${printScope === 'all' ? 'bg-blue-50/40 border-blue-400 ring-2 ring-blue-400/20 shadow-2xs' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                <input
                                    type="radio"
                                    name="printScope"
                                    value="all"
                                    checked={printScope === 'all'}
                                    onChange={() => setPrintScope('all')}
                                    className="mt-0.5 accent-blue-600"
                                />
                                <div className="flex-1 min-w-0">
                                    <span className="text-[13px] font-bold text-slate-800">
                                        전체 행 인쇄 ({items.length}개 품목)
                                    </span>
                                    <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                                        수량 값과 관계없이 목록의 모든 행을 지정된 사본 부수만큼 인쇄합니다.
                                    </p>
                                </div>
                            </label>

                            {/* Option 3: Selected items only */}
                            <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${printScope === 'selected' ? 'bg-blue-50/40 border-blue-400 ring-2 ring-blue-400/20 shadow-2xs' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                <input
                                    type="radio"
                                    name="printScope"
                                    value="selected"
                                    checked={printScope === 'selected'}
                                    onChange={() => setPrintScope('selected')}
                                    className="mt-0.5 accent-blue-600"
                                />
                                <div className="flex-1 min-w-0">
                                    <span className="text-[13px] font-bold text-slate-800">
                                        체크 선택된 행만 인쇄 ({Object.values(selectedRowIds).filter(Boolean).length}개 선택됨)
                                    </span>
                                </div>
                            </label>

                            {/* Option 4: Custom Range */}
                            <label className={`flex flex-col gap-2 p-3 rounded-xl border transition-all cursor-pointer ${printScope === 'range' ? 'bg-blue-50/40 border-blue-400 ring-2 ring-blue-400/20 shadow-2xs' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="radio"
                                        name="printScope"
                                        value="range"
                                        checked={printScope === 'range'}
                                        onChange={() => setPrintScope('range')}
                                        className="accent-blue-600"
                                    />
                                    <span className="text-[13px] font-bold text-slate-800">
                                        지정 번호 범위 인쇄
                                    </span>
                                </div>
                                {printScope === 'range' && (
                                    <input
                                        type="text"
                                        value={rangeInput}
                                        onChange={e => setRangeInput(e.target.value)}
                                        placeholder="예: 1, 3, 5-10, 25"
                                        className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[12px] font-mono font-bold outline-none focus:border-blue-500 shadow-2xs"
                                    />
                                )}
                            </label>
                        </div>

                        {/* Batch by Vendor option */}
                        <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all cursor-pointer">
                            <input
                                type="checkbox"
                                checked={sortByVendor}
                                onChange={e => setSortByVendor(e.target.checked)}
                                className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                            />
                            <div>
                                <span className="text-[12px] font-bold text-slate-800">
                                    거래처(업체명)별로 묶어서 순차 인쇄 (Smart Batching)
                                </span>
                                <p className="text-[10px] text-slate-400">
                                    같은 거래처의 라벨을 연속으로 묶어서 인쇄하여 포장 및 분류를 편리하게 합니다.
                                </p>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Footer Buttons - Matches App JINIL Color Palette */}
                <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={() => handleConfirmPrint(true)}
                        disabled={isPrinting}
                        className="h-10 px-4 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-[13px] font-bold flex items-center gap-1.5 transition-all active:scale-[0.98] shadow-2xs cursor-pointer disabled:opacity-50"
                        title="첫 번째 라벨 1장만 인쇄하여 여백 및 위치를 확인합니다"
                    >
                        <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                        시험 인쇄 (1장)
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-10 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-[13px] font-bold transition-all cursor-pointer shadow-2xs"
                        >
                            취소
                        </button>
                        <button
                            type="button"
                            onClick={() => handleConfirmPrint(false)}
                            disabled={isPrinting}
                            className="h-10 px-6 bg-[#00c896] hover:bg-[#00b085] text-white font-black rounded-xl text-[14px] shadow-md shadow-emerald-200/60 transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm-1 10H8v3h4v-3z" clipRule="evenodd" /></svg>
                            {isPrinting ? '인쇄 전송 중...' : `총 ${totalLabelCount.toLocaleString()}장 인쇄`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
